import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useConnectivity } from '@/core/context/ConnectivityContext';
import { useModal } from '@/core/context/ModalContext';
import { useTheme } from '@/core/context/ThemeContext';
import { FileStore } from '@/core/storage/fileStore';
import { BookMetadata, MetadataStore } from '@/core/storage/storage';
import { ActiveDownload, DownloadStore } from '@/core/store/downloadStore';
import { UploadStore } from '@/core/store/uploadStore';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { CheckCircle, Download, Plus, Search, Sun, Moon, Globe, Wifi, Settings, WifiOff, Library, Upload } from 'lucide-react-native';
import { OfflineView } from '@/components/OfflineView';
import { BookCard } from '@/components/BookCard';
import { UpdateBanner } from '@/components/UpdateBanner';
import { useTranslation } from '@/core/i18n/I18nContext';
import { SocketService } from '@/core/services/socketService';
import { UpdateService, AppUpdateData } from '@/core/services/updateService';
import Constants from 'expo-constants';

const CURRENT_VERSION = Constants.expoConfig?.version || (Constants as any).manifest?.version || '1.0.0';

import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Keyboard,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
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
  const allBooksRef = useRef<BookMetadata[]>([]);
  
  useEffect(() => {
    allBooksRef.current = allBooks;
  }, [allBooks]);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeDownloads, setActiveDownloads] = useState<Record<string, ActiveDownload>>({});
  const [isUploading, setIsUploading] = useState(UploadStore.getIsUploading());
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [offsetId, setOffsetId] = useState(0);
  const offsetIdRef = useRef(0);
  const [hasMore, setHasMore] = useState(true);
  const hasMoreRef = useRef(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [publicDir, setPublicDir] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fabAnim = useRef(new Animated.Value(1)).current;

  const [wifiOnly, setWifiOnly] = useState(DownloadStore.getDownloadMode() === 'wifi');

  const load = useCallback(async (reset = false) => {
    if (isOffline) {
      setRefreshing(false);
      return;
    }
    const currentOffset = reset ? 0 : offsetIdRef.current;
    if (!reset && !hasMoreRef.current) return;

    try {
      if (reset) setRefreshing(true);
      else setLoadingMore(true);

      const limit = 20;
      const baseUrl = 'https://zarabook-api.onrender.com/telegram/list';
      const params = new URLSearchParams({
        limit: limit.toString(),
        offsetId: currentOffset.toString(),
      });
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);

      const response = await fetch(`${baseUrl}?${params.toString()}`);
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

        if (payload.nextOffsetId !== undefined && payload.nextOffsetId !== null) {
          setHasMore(true);
          hasMoreRef.current = true;
          setOffsetId(payload.nextOffsetId);
          offsetIdRef.current = payload.nextOffsetId;
        } else {
          setHasMore(false);
          hasMoreRef.current = false;
        }

        const allFetched = reset ? books : [...allBooksRef.current, ...books];
        const uniqueBooks = Array.from(new Map(allFetched.map(b => [b.id, b])).values());

        await MetadataStore.saveBooks(uniqueBooks);
        setAllBooks(uniqueBooks);
      }
    } catch (e) {
      if (reset) {
        const bookMap = await MetadataStore.getBooks();
        const remote = Object.values(bookMap).filter((b) => !b.localPath);
        remote.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
        setAllBooks(remote);
      }
    } finally {
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [isOffline, debouncedSearch, selectedCategory]);

  const setupStorage = async (): Promise<string | null> => {
    const uri = await FileStore.requestDirectory();
    if (uri) {
      setPublicDir(uri);
      setHasMore(true);
      hasMoreRef.current = true;
      setOffsetId(0);
      offsetIdRef.current = 0;
      await load(true);
    }
    return uri;
  };

  useEffect(() => {
    FileStore.getPublicUri().then(setPublicDir);
    setHasMore(true);
    hasMoreRef.current = true;
    setOffsetId(0);
    offsetIdRef.current = 0;
    load(true);

    if (!isOffline) {
      UpdateService.checkUpdate(CURRENT_VERSION).then(res => {
        if (res) setHasUpdate(true);
      });
    }

    const sub = DownloadStore.subscribe(() => {
      const dls: Record<string, ActiveDownload> = {};
      DownloadStore.getAll().forEach((d) => { dls[d.bookId] = d; });
      setActiveDownloads(dls);
      setWifiOnly(DownloadStore.getDownloadMode() === 'wifi');
    });

    const uploadSub = UploadStore.subscribe(() => {
      setIsUploading(UploadStore.getIsUploading());
      setUploadProgress(UploadStore.getProgress());
    });

    const socketSub = SocketService.subscribeToAppUpdates((data: AppUpdateData) => {
      if (UpdateService.isNewerVersion(CURRENT_VERSION, data.version)) {
        setHasUpdate(true);
      }
    });

    return () => {
      sub();
      uploadSub();
      socketSub();
    };
  }, [load, isOffline]);

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

  const [uploadProgress, setUploadProgress] = useState(UploadStore.getProgress());

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

      const resumable = await telegramService.downloadFile(
        book.telegramMessageId,
        tempPath,
        (progress: number, bytes: number, total: number) => {
          DownloadStore.updateProgress(book.id, bytes, total);
        }
      );

      const promise = DownloadStore.start({
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
      const allowedTypes = [
        'application/pdf',
        'application/epub+zip',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      ];

      const result = await DocumentPicker.getDocumentAsync({ 
        type: allowedTypes, 
        copyToCacheDirectory: true 
      });

      if (!result.canceled && result.assets?.length > 0) {
        const file = result.assets[0];
        const extension = file.name.split('.').pop()?.toLowerCase();
        const validExtensions = ['pdf', 'epub', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

        if (extension && validExtensions.includes(extension)) {
          router.push({ 
            pathname: '/upload-form', 
            params: { uri: file.uri, name: file.name, size: file.size ? file.size.toString() : '0' } 
          });
        } else {
          showModal({ 
            type: 'error', 
            title: t('upload.errorTitle'), 
            message: t('upload.invalidFileType') || 'Seuls les fichiers PDF, EPUB et Office sont acceptés.' 
          });
        }
      }
    } catch (err) {
      showModal({ type: 'error', title: t('common.error'), message: t('upload.errorMsg') });
    }
  };

  const onRefresh = useCallback(async () => {
    setHasMore(true);
    hasMoreRef.current = true;
    setOffsetId(0);
    offsetIdRef.current = 0;
    await load(true);
  }, [load]);

  const loadMoreData = () => {
    if (!loadingMore && !refreshing && hasMore) {
      load(false);
    }
  };

  const filtered = allBooks;

  const downloadedCount = allBooks.filter((b) => b.localPath).length;

  const animateFab = () => {
    Animated.sequence([
      Animated.spring(fabAnim, { toValue: 0.9, useNativeDriver: true }),
      Animated.spring(fabAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {isUploading && (
            <TouchableOpacity 
              onPress={() => {
                const params = UploadStore.getParams();
                if (params) {
                  router.push({
                    pathname: '/upload-form',
                    params
                  });
                }
              }}
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                backgroundColor: colors.primary + '15', 
                paddingHorizontal: 12, 
                paddingVertical: 8, 
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.primary + '30',
                gap: 8,
              }}
            >
              <Upload size={14} color={colors.primary} />
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                {Math.round(uploadProgress * 100)}%
              </Text>
            </TouchableOpacity>
          )}

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
        showsVerticalScrollIndicator={false}
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


      {/* ── Book list / Offline ── */}
      {isOffline ? (
        <OfflineView />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          data={filtered}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <BookCard
              item={item}
              onPress={() => router.push(`/book/${item.id}`)}
              onDownload={() => handleDownload(item)}
              activeDownload={activeDownloads[item.id]}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 100, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReached={loadMoreData}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (!hasMore && allBooks.length > 0) ? (
              <View style={{ padding: 20, alignItems: 'center', paddingBottom: 40 }}>
                <Text style={{ color: colors.textDim, fontSize: 12, fontWeight: '500' }}>
                  {t('index.noMoreData') || 'Plus de livres disponibles'}
                </Text>
              </View>
            ) : null
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
    </TouchableWithoutFeedback>
  );
}