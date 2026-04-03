import { useModal } from '@/core/context/ModalContext';
import { useTheme } from '@/core/context/ThemeContext';
import { BookMetadata, MetadataStore } from '@/core/storage/storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Book,
  BookOpen,
  Calendar,
  CheckCircle,
  Download,
  HardDrive,
  ChevronLeft,
  Share2,
  Trash2
} from 'lucide-react-native';
import React, { useEffect, useState, useRef } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useConnectivity } from '@/core/context/ConnectivityContext';
import { FileStore } from '@/core/storage/fileStore';
import * as FileSystem from 'expo-file-system/legacy';
import { ActiveDownload, DownloadStore } from '@/core/store/downloadStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/core/i18n/I18nContext';
import { getLocalizedCategory } from '@/core/utils/categoryUtils';
import Animated, { 
  FadeIn, 
  useSharedValue, 
  useAnimatedScrollHandler, 
  useAnimatedStyle, 
  interpolate, 
  Extrapolate 
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = 400;

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(ts: number | undefined, t: any, locale: string) {
  if (!ts) return t('common.unknownDate');
  const d = new Date(ts);
  if (isNaN(d.getTime())) return t('common.invalidDate');
  return d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}

const COVER_PALETTES = [
  ['#1e1b4b', '#312e81'], ['#0c4a6e', '#0369a1'], ['#14532d', '#166534'],
  ['#4c1d95', '#6d28d9'], ['#78350f', '#92400e'], ['#881337', '#9f1239'],
  ['#0f172a', '#1e293b'],
];

function coverPalette(title: string): [string, string] {
  const idx = title.charCodeAt(0) % COVER_PALETTES.length;
  return COVER_PALETTES[idx] as [string, string];
}

export default function BookDetailScreen() {
  const { showModal } = useModal();
  const { colors, isDark } = useTheme();
  const { isOffline } = useConnectivity();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<BookMetadata | null>(null);
  const [activeDownload, setActiveDownload] = useState<ActiveDownload | null>(null);
  const scrollY = useSharedValue(0);

  // Animations
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        scrollY.value,
        [HERO_HEIGHT - 120, HERO_HEIGHT - 60],
        [0, 1],
        Extrapolate.CLAMP
      ),
    };
  });

  const imageAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollY.value,
      [-200, 0, HERO_HEIGHT],
      [1.3, 1, 0.9],
      { extrapolateLeft: Extrapolate.EXTEND, extrapolateRight: Extrapolate.CLAMP }
    );
    const translateY = interpolate(
      scrollY.value,
      [-200, 0, HERO_HEIGHT],
      [-60, 0, 50],
      Extrapolate.CLAMP
    );
    return {
      transform: [{ scale }, { translateY }],
    };
  });

  const router = useRouter();
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();

  const load = React.useCallback(async () => {
    if (id) {
      const b = await MetadataStore.getBook(id);
      setBook(b || null);
      const dl = DownloadStore.get(id);
      setActiveDownload(dl || null);
    }
  }, [id, id]);

  useEffect(() => {
    load();
    const sub1 = DownloadStore.subscribe(load);
    const sub2 = MetadataStore.subscribe(load);
    return () => { sub1(); sub2(); };
  }, [id, load]);

  if (!book) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const handleDownload = async () => {
    if (isOffline) {
      showModal({ type: 'info', title: t('common.error'), message: t('downloads.offlineMsg') });
      return;
    }
    if (!book.telegramMessageId) return;

    try {
      const { telegramService } = require('@/services/telegramService');
      const filename = `${book.title.replace(/\s+/g, '_')}.${book.format}`;
      const tempPath = FileSystem.cacheDirectory + filename;

      const resumable = await telegramService.downloadFile(
        book.telegramMessageId, 
        tempPath, 
        (progress: number, bytes: number, total: number) => {
          DownloadStore.updateProgress(book.id, bytes, total);
        }
      );

      const promise = DownloadStore.start({
        bookId: book.id, bookTitle: book.title, bookSize: book.fileSize, fromPeerId: 'cloud-telegram',
        format: book.format, thumbnailMessageId: book.thumbnailMessageId,
      }, resumable);

      const finalTempUri = await promise;
      const finalUri = await FileStore.saveFile(finalTempUri, filename);
      
      DownloadStore.complete(book.id, finalUri);
      const newBook = { ...book, localPath: finalUri };
      await MetadataStore.saveBook(newBook);
      setBook(newBook);
    } catch (error) {
      const dl = DownloadStore.get(book.id);
      if (dl?.status !== 'cancelled' && dl?.status !== 'paused') {
        DownloadStore.fail(book.id, t('book.status_error'));
      }
    }
  };

  const handleDelete = () => {
    showModal({
      type: 'delete',
      title: t('downloads.deleteTitle'),
      message: t('downloads.deleteMsg', { title: book.title }),
      onConfirm: async () => {
        if (book.localPath) {
          await FileStore.deleteFile(book.localPath);
        }
        const updated = { ...book, localPath: undefined };
        await MetadataStore.saveBook(updated);
        setBook(updated);
      }
    });
  };

  const isLocal = !!book.localPath;
  const status = activeDownload?.status;
  const downloading = status === 'downloading' || status === 'pending';
  const isPaused = status === 'paused';
  const progressPct = activeDownload ? Math.round(activeDownload.progress * 100) : 0;
  const [c1] = coverPalette(book.title);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Hero Background */}
      <HeroBackground color={c1} thumbnailMessageId={book.thumbnailMessageId} />

      {/* Custom Header */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 }}>
        <Animated.View style={[
          { 
            position: 'absolute', inset: 0, backgroundColor: isDark ? 'rgba(15,15,25,0.92)' : 'rgba(255,255,255,0.92)',
            height: insets.top + 56
          },
          headerAnimatedStyle
        ]}>
           <BlurView intensity={40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
        </Animated.View>
        
        <View style={{ 
          paddingTop: insets.top + 8, paddingHorizontal: 16, height: insets.top + 56, 
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' 
        }}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' }}
          >
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>
          
          <Animated.Text style={[
            { color: colors.text, fontSize: 16, fontWeight: '800', flex: 1, textAlign: 'center', marginHorizontal: 16 },
            headerAnimatedStyle
          ]} numberOfLines={1}>
            {book.title}
          </Animated.Text>

          <TouchableOpacity 
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' }}
          >
            <Share2 size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        {/* Book Cover Hero */}
        <View style={{ height: HERO_HEIGHT, justifyContent: 'center', alignItems: 'center', paddingTop: 40 }}>
          <Animated.View style={[
            { 
              width: 170, height: 250, borderRadius: 16, overflow: 'hidden', 
              backgroundColor: c1, elevation: 20, shadowColor: '#000', 
              shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.6, shadowRadius: 18,
            },
            imageAnimatedStyle
          ]}>
            {book?.thumbnailMessageId && book ? (
              <Animated.Image 
                source={{ uri: `https://hipster-api.fr/api/telegram/thumbnail/${book.thumbnailMessageId}` }} 
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} 
                resizeMode="cover" 
                // @ts-ignore - Reanimated 3+ Shared Element prop
                sharedTransitionTag={`book-image-${book.id}`}
              />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 60, fontWeight: '800' }}>{book.title.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 5, borderTopLeftRadius: 14 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>{book.format.toUpperCase()}</Text>
            </View>
          </Animated.View>
        </View>

        {/* Content */}
        <View style={{ padding: 24, marginTop: -20, backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28 }}>
          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '900', textAlign: 'center', lineHeight: 32 }}>{book.title}</Text>
          <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 8, letterSpacing: 0.6 }}>
            {(!book.author || book.author.toLowerCase() === 'auteur inconnu') ? t('common.unknownAuthor').toUpperCase() : book.author.toUpperCase()}
          </Text>

          {/* Metadata Grid */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 28, gap: 12 }}>
             <MetaPill icon={<HardDrive size={15} color={colors.primary} />} label={formatSize(book.fileSize)} />
             <MetaPill icon={<BookOpen size={15} color={colors.primary} />} label={book.format.toUpperCase()} />
             {book.category && (
               <MetaPill icon={<Book size={15} color={colors.primary} />} label={getLocalizedCategory(book.category, t).split(' ')[0]} />
             )}
          </View>

          {book.description && (
            <View style={{ marginTop: 36 }}>
              <SectionTitle label={t('book.about')} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, opacity: 0.8 }}>
                 <Calendar size={14} color={colors.textMuted} />
                 <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600' }}>
                   {t('book.addedAt')} : {formatDate(book.addedAt, t, locale)}
                 </Text>
              </View>
              <Text style={{ color: colors.textDim, fontSize: 15, lineHeight: 26, textAlign: 'justify' }}>{book.description}</Text>
            </View>
          )}


          
          {isLocal && (
             <TouchableOpacity 
               onPress={handleDelete}
               style={{ marginTop: 24, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
             >
                <Trash2 size={16} color="#ef4444" />
                <Text style={{ color: '#ef4444', fontSize: 14, fontWeight: '700' }}>{t('book.deleteFromDevice')}</Text>
             </TouchableOpacity>
          )}
        </View>
      </Animated.ScrollView>

      {/* Floating Bottom Action Bar */}
      <View style={{ 
        position: 'absolute', bottom: insets.bottom + 20, left: 24, right: 24, 
        zIndex: 200, 
      }}>
        <BlurView intensity={isDark ? 80 : 100} tint={isDark ? 'dark' : 'light'} style={{ 
          borderRadius: 20, overflow: 'hidden', padding: 4, 
          borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20 }, android: { elevation: 12 } })
        }}>
          {isLocal ? (
            <TouchableOpacity 
              onPress={() => FileStore.openFile(book.localPath!)}
              style={{ 
                height: 60, borderRadius: 16, backgroundColor: '#10b981', 
                alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12,
                shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
              }}
            >
              <CheckCircle size={22} color="#fff" strokeWidth={2.5} />
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 }}>{t('book.readNow')}</Text>
            </TouchableOpacity>
          ) : downloading || isPaused ? (
            <View style={{ height: 60, borderRadius: 16, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }}>
               <ActivityIndicator color={colors.primary} size="small" />
               <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800' }}>{isPaused ? t('book.paused') : t('book.downloading')}</Text>
                  <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                    <View style={{ width: `${progressPct}%`, height: '100%', backgroundColor: colors.primary, borderRadius: 2 }} />
                  </View>
               </View>
               <TouchableOpacity onPress={() => isPaused ? DownloadStore.resume(book.id) : DownloadStore.pause(book.id)}>
                   <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 13 }}>{isPaused ? t('book.resume') : t('book.pause')}</Text>
               </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              onPress={handleDownload} 
              style={{ height: 60, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12 }}
            >
              <Download size={22} color="#fff" strokeWidth={2.5} />
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 }}>{t('book.downloadNow')}</Text>
            </TouchableOpacity>
          )}
        </BlurView>
      </View>
    </View>
  );
}

function SectionTitle({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <Text style={{ color: colors.textMuted, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 14 }}>{label}</Text>
  );
}

function MetaPill({ icon, label }: { icon: any, label: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {icon}
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>{label}</Text>
    </View>
  );
}



function HeroBackground({ color, thumbnailMessageId }: { color: string, thumbnailMessageId?: string | number }) {
  const { colors } = useTheme();
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HERO_HEIGHT + 150, backgroundColor: color }}>
      {thumbnailMessageId && (
        <Image 
          source={{ uri: `https://hipster-api.fr/api/telegram/thumbnail/${thumbnailMessageId}` }} 
          style={{ width: '100%', height: '100%', opacity: 0.35 }} 
          blurRadius={20}
        />
      )}
      {/* Simulated gradient using multiple views for the transition to background color */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 250, backgroundColor: colors.background }} />
      <View style={{ position: 'absolute', bottom: 250, left: 0, right: 0, height: 100, backgroundColor: colors.background, opacity: 0.5 }} />
    </View>
  );
}
