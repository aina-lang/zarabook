import { useConnectivity } from '@/core/context/ConnectivityContext';
import { useModal } from '@/core/context/ModalContext';
import { useTheme } from '@/core/context/ThemeContext';
import { FileStore } from '@/core/storage/fileStore';
import { BookMetadata, MetadataStore } from '@/core/storage/storage';
import { ActiveDownload, DownloadStore } from '@/core/store/downloadStore';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { CheckCircle, Download, Plus, Search, Sun, Moon, Globe, Wifi, Settings, WifiOff, Library } from 'lucide-react-native';
import { OfflineView } from '@/components/OfflineView';
import { UpdateBanner } from '@/components/UpdateBanner';
import { BookCard } from '@/components/BookCard';
import { useTranslation } from '@/core/i18n/I18nContext';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const CATEGORIES = [
  'all', 'fiction', 'science_fiction', 'fantasy', 'thriller', 
  'self_help', 'business', 'tech', 'education', 'health', 'art', 'history', 'other'
];

import { CATEGORY_MAP } from '@/core/utils/categoryUtils';

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/* ─── Main Screen ─── */
export default function IndexScreen() {
  const { isOffline, isWifi } = useConnectivity();
  const [hasUpdate, setHasUpdate] = useState(false);
  const { showModal } = useModal();
  const { theme, colors, toggleTheme, isDark } = useTheme();
  const { t } = useTranslation();

  const [allBooks, setAllBooks] = useState<BookMetadata[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeDownloads, setActiveDownloads] = useState<Record<string, ActiveDownload>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [publicDir, setPublicDir] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fabAnim = useRef(new Animated.Value(1)).current;

  const [wifiOnly, setWifiOnly] = useState(DownloadStore.getDownloadMode() === 'wifi');

  const load = useCallback(async () => {
    if (isOffline) {
      setRefreshing(false);
      return;
    }
    try {
      setRefreshing(true);
      const response = await fetch('https://zarabook-api.onrender.com/telegram/list');
      const resData = await response.json();
      const payload = resData.data || resData;
      if (payload.success && payload.files) {
        const localBooks = await MetadataStore.getBooks();
        const books: BookMetadata[] = payload.files.map((f: any) => {
          const id = `tg-${f.id}`;
          return {
            id,
            telegramMessageId: f.id,
            title: f.fileName.split('.').slice(0, -1).join('.') || f.fileName,
            author: f.author || 'Auteur Inconnu',
            category: f.category || 'Autre',
            description: f.description || '',
            format: f.fileName.split('.').pop()?.toLowerCase() || 'unknown',
            fileSize: f.fileSize,
            hash: `tg-${f.id}`,
            ownerPeerId: 'cloud-telegram',
            isPublic: true,
            addedAt: f.date * 1000,
            localPath: localBooks[id]?.localPath,
            thumbnailMessageId: f.thumbnailMessageId,
          };
        });
        await MetadataStore.saveBooks(books);
        setAllBooks(books);
      }
    } catch (e) {
      const bookMap = await MetadataStore.getBooks();
      const remote = Object.values(bookMap).filter((b) => !b.localPath);
      remote.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
      setAllBooks(remote);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const setupStorage = async (): Promise<string | null> => {
    const uri = await FileStore.requestDirectory();
    if (uri) {
      setPublicDir(uri);
      await load();
    }
    return uri;
  };

  useEffect(() => {
    FileStore.getPublicUri().then(setPublicDir);
    load();
    const sub = DownloadStore.subscribe(() => {
      const dls: Record<string, ActiveDownload> = {};
      DownloadStore.getAll().forEach((d) => { dls[d.bookId] = d; });
      setActiveDownloads(dls);
      setWifiOnly(DownloadStore.getDownloadMode() === 'wifi');
    });
    return () => sub();
  }, [load]);

  // Connectivity monitoring for auto-pause
  useEffect(() => {
    const mode = DownloadStore.getDownloadMode();
    const shouldPause =
      isOffline ||
      (mode === 'wifi' && !isWifi) ||
      (mode === 'cellular' && isWifi);

    if (shouldPause) {
      DownloadStore.getAll()
        .filter(d => d.status === 'downloading')
        .forEach(d => DownloadStore.pause(d.bookId));
    }
  }, [isOffline, isWifi, wifiOnly]);

  const handleDownload = async (book: BookMetadata) => {
    const mode = DownloadStore.getDownloadMode();
    if (isOffline) {
      showModal({ type: 'info', title: t('index.connRequired'), message: t('index.connReqMsg') });
      return;
    }
    if (mode === 'wifi' && !isWifi) {
      showModal({ type: 'info', title: t('index.wifiReq'), message: t('index.wifiReqMsg') });
      return;
    }
    if (mode === 'cellular' && isWifi) {
      showModal({ type: 'info', title: t('index.cellReq'), message: t('index.cellReqMsg') });
      return;
    }
    if (!DownloadStore.canStartMore()) {
      showModal({ type: 'info', title: t('index.limitReached'), message: t('index.limitReachedMsg', { count: DownloadStore.getMaxConcurrent() }) });
      return;
    }
    if (!book.telegramMessageId) return;
    if (!publicDir) {
      showModal({
        type: 'confirm',
        title: t('index.explorerPublic'),
        message: t('index.setupStorage'),
        confirmText: t('index.chooseFolder'),
        cancelText: t('index.later'),
        onConfirm: async () => {
          const uri = await setupStorage();
          if (uri) setTimeout(() => continueDownload(book), 500);
        },
        onCancel: () => continueDownload(book),
      });
      return;
    }
    await continueDownload(book);
  };

  const continueDownload = async (book: BookMetadata) => {
    try {
      const { telegramService } = require('@/services/telegramService');
      const filename = `${book.title.replace(/\s+/g, '_')}.${book.format}`;
      const tempPath = FileSystem.cacheDirectory + filename;

      const { resumable, promise } = await telegramService.downloadFile(
        book.telegramMessageId,
        tempPath,
        (progress: number, bytes: number, total: number) => {
          DownloadStore.updateProgress(book.id, bytes, total);
        }
      );

      DownloadStore.start({
        bookId: book.id,
        bookTitle: book.title,
        bookSize: book.fileSize,
        fromPeerId: 'cloud-telegram',
        format: book.format,
        thumbnailMessageId: book.thumbnailMessageId,
      }, resumable);

      const finalTempUri = await promise;
      const finalUri = await FileStore.saveFile(finalTempUri, filename);
      DownloadStore.complete(book.id, finalUri);

      const updated = { ...book, localPath: finalUri };
      await MetadataStore.saveBook(updated);
      setAllBooks((prev) => prev.map((b) => (b.id === book.id ? updated : b)));
    } catch (error) {
      const dl = DownloadStore.get(book.id);
      if (dl?.status !== 'cancelled' && dl?.status !== 'paused') {
        DownloadStore.fail(book.id, 'Échec');
      }
    }
  };

  const importBook = async () => {
    if (isOffline) {
      showModal({ type: 'info', title: t('common.error'), message: t('upload.errorMsg') });
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.length > 0) {
        const file = result.assets[0];
        router.push({ pathname: '/upload-form', params: { uri: file.uri, name: file.name, size: file.size ? file.size.toString() : '0' } });
      }
    } catch {
      showModal({ type: 'error', title: t('common.error'), message: t('upload.errorMsg') });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = allBooks.filter((b) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
    const matchesCategory = selectedCategory === 'all' || b.category === CATEGORY_MAP[selectedCategory];
    return matchesSearch && matchesCategory;
  });

  const downloadedCount = allBooks.filter((b) => b.localPath).length;

  const animateFab = () => {
    Animated.sequence([
      Animated.spring(fabAnim, { toValue: 0.9, useNativeDriver: true }),
      Animated.spring(fabAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* ── Header ── */}
      <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 10, paddingBottom: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginBottom: 2 }}>
            {t('index.catalog')}
          </Text>
          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5, lineHeight: 28 }}>
            ZaraBook
          </Text>
          {downloadedCount > 0 && (
            <Text style={{ color: colors.textDim, fontSize: 11, marginTop: 3 }}>
              {t('index.booksCount', { count: downloadedCount })}
            </Text>
          )}
         
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}
          >
            <Settings size={20} color={colors.primary} />
            {hasUpdate && (
              <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#ef4444', width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>1</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {!isOffline && <UpdateBanner onUpdateFound={() => setHasUpdate(true)} />}

      {/* ── Search bar ── */}
      <View
        style={{
          marginHorizontal: 14,
          marginBottom: 12,
          backgroundColor: colors.input,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: searchFocused ? colors.primary + '80' : colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 13,
          paddingVertical: 10,
          gap: 10,
        }}
      >
        <Search size={15} color={searchFocused ? colors.primary : colors.textMuted} />
        <TextInput
          style={{ flex: 1, color: colors.text, fontSize: 14 }}
          placeholder={t('index.searchPlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: colors.textMuted, fontSize: 16, lineHeight: 18 }}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Categories ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ height: 44, flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={{
          paddingHorizontal: 14,
          gap: 8,
          alignItems: 'center',
        }}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setSelectedCategory(cat)}
            style={{
              height: 32,
              paddingHorizontal: 14,
              borderRadius: 16,
              borderWidth: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: selectedCategory === cat ? colors.primary + '15' : colors.card,
              borderColor: selectedCategory === cat ? colors.primary : colors.border,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: selectedCategory === cat ? colors.primary : colors.textDim }}>
              {cat === "all" ? t('index.categoryAll') : t(`categories.${cat}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Section header ── */}
      {!isOffline && allBooks.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 }}>
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>{t('index.allBooks')}</Text>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
            {t('index.filesCount', { count: filtered.length })}
          </Text>
        </View>
      )}

      {/* ── Book list / Offline ── */}
      {isOffline ? (
        <OfflineView />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BookCard
              item={item}
              onPress={() => router.push(`/book/${item.id}`)}
              onDownload={() => handleDownload(item)}
              activeDownload={activeDownloads[item.id]}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={{ marginTop: 80, alignItems: 'center', paddingHorizontal: 32 }}>
              <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: colors.primary + '10', borderWidth: 1, borderColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Library size={32} color={colors.primary} strokeWidth={1.5} />
              </View>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 6, textAlign: 'center' }}>
                {t('index.noBooksFound')}
              </Text>
              <Text style={{ color: colors.textDim, fontSize: 13, textAlign: 'center', lineHeight: 19 }}>
                {t('index.catalogEmpty')}
              </Text>
            </View>
          }
        />
      )}

    </View>
  );
}