import React, { useState, useEffect } from 'react';
import {
  View, FlatList, Text, TouchableOpacity, ScrollView, RefreshControl
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useModal } from '@/core/context/ModalContext';
import { Library, Settings, WifiOff } from 'lucide-react-native';
import { useConnectivity } from '@/core/context/ConnectivityContext';
import { useTheme } from '@/core/context/ThemeContext';
import { DownloadStore, ActiveDownload } from '@/core/store/downloadStore';
import { MetadataStore, BookMetadata } from '@/core/storage/storage';
import { useRouter } from 'expo-router';
import { FileStore } from '@/core/storage/fileStore';
import * as FileSystem from 'expo-file-system/legacy';
import { TelegramService } from '@/services/telegramService';
import { BookCard } from '@/components/BookCard';
import { useTranslation } from '@/core/i18n/I18nContext';

const telegramService = new TelegramService();

/* ─── Main Screen ─── */
export default function DownloadsScreen() {
  const [active, setActive] = useState<ActiveDownload[]>([]);
  const [local, setLocal] = useState<BookMetadata[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { showModal } = useModal();
  const { isOffline, isWifi } = useConnectivity();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [wifiOnly, setWifiOnly] = useState(DownloadStore.getDownloadMode() === 'wifi');

  const load = async () => {
    setActive(DownloadStore.getAll().filter(d =>
      d.status === 'pending' || d.status === 'downloading' ||
      d.status === 'error' || d.status === 'paused' || d.status === 'cancelled'
    ));
    const bookMap = await MetadataStore.getBooks();
    const downloaded = Object.values(bookMap)
      .filter(b => !!b.localPath)
      .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
    setLocal(downloaded);
  };

  useEffect(() => {
    load();
    const sub1 = DownloadStore.subscribe(() => {
      load();
      setWifiOnly(DownloadStore.getDownloadMode() === 'wifi');
    });
    const sub2 = MetadataStore.subscribe(load);
    return () => { sub1(); sub2(); };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleDeleteLocal = (book: BookMetadata) => {
    showModal({
      type: 'delete',
      title: t('downloads.deleteTitle'),
      message: t('downloads.deleteMsg', { title: book.title }),
      confirmText: t('common.delete'),
      onConfirm: async () => {
        if (book.localPath) await FileStore.deleteFile(book.localPath);
        const updated = { ...book, localPath: undefined };
        await MetadataStore.saveBook(updated);
        load();
      }
    });
  };

  const canResume = () => {
    if (isOffline) return false;
    const mode = DownloadStore.getDownloadMode();
    if (mode === 'wifi' && !isWifi) return false;
    if (mode === 'cellular' && isWifi) return false;
    return true;
  };

  const modeBlockMsg = () => {
    const mode = DownloadStore.getDownloadMode();
    if (mode === 'wifi' && !isWifi) return t('downloads.wifiOnlyMsg');
    if (mode === 'cellular' && isWifi) return t('downloads.cellularOnlyMsg');
    return null;
  };

  const handleTogglePause = (item: ActiveDownload) => {
    const isPaused = item.status === 'paused';
    const isDownloading = item.status === 'downloading' || item.status === 'pending';
    if (isPaused) {
      if (!canResume()) {
        const msg = modeBlockMsg();
        if (msg) showModal({ type: 'info', title: t('downloads.connectionModeTitle'), message: msg });
        return;
      }
      DownloadStore.resume(item.bookId);
    } else if (isDownloading) {
      DownloadStore.pause(item.bookId);
    }
  };

  const handleRetryDownload = async (item: ActiveDownload) => {
    if (!canResume()) {
      const msg = modeBlockMsg();
      if (msg) showModal({ type: 'info', title: t('downloads.connectionModeTitle'), message: msg });
      return;
    }
    DownloadStore.remove(item.bookId);
    const bookMap = await MetadataStore.getBooks();
    const book = bookMap[item.bookId];
    if (!book?.telegramMessageId) return;
    try {
      const filename = `${book.title.replace(/\s+/g, '_')}.${book.format}`;
      const tempPath = FileSystem.cacheDirectory + filename;
      const resumable = await telegramService.downloadFile(
        book.telegramMessageId,
        tempPath,
        (progress: number, bytes: number, total: number) => DownloadStore.updateProgress(book.id, bytes, total)
      );
      const promise = DownloadStore.start({
        bookId: book.id, bookTitle: book.title, bookSize: book.fileSize,
        fromPeerId: 'cloud-telegram', format: book.format,
        thumbnailMessageId: book.thumbnailMessageId,
      }, resumable);
      const finalTempUri = await promise;
      const finalUri = await FileStore.saveFile(finalTempUri, filename);
      DownloadStore.complete(book.id, finalUri);
      const updated = { ...book, localPath: finalUri };
      await MetadataStore.saveBook(updated);
    } catch {
      DownloadStore.fail(item.bookId, t('book.status_error'));
    }
  };

  const sections = [
    ...(active.length > 0 ? [{ type: 'header', title: t('downloads.downloadsHeader') }, ...active.map(a => ({ ...a, type: 'active' }))] : []),
    ...(local.length > 0 ? [{ type: 'header', title: t('downloads.collection') }, ...local.map(l => ({ ...l, type: 'local' }))] : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Header ── */}
      <View style={{ paddingHorizontal: 16, paddingTop: insets.top + 10, paddingBottom: 14, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.4, marginBottom: 2 }}>
            {t('downloads.header')}
          </Text>
          <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5, lineHeight: 28 }}>
            {t('downloads.title')}
          </Text>
          {local.length > 0 && (
            <Text style={{ color: colors.textDim, fontSize: 11, marginTop: 3 }}>
              {t('index.booksCount', { count: local.length })}
            </Text>
          )}
        </View>

        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}
        >
          <Settings size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {isOffline && (
        <View style={{ marginHorizontal: 16, marginBottom: 12, borderRadius: 12, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <WifiOff size={16} color="#ef4444" />
          <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600', flex: 1 }}>{t('downloads.offlineMsg')}</Text>
        </View>
      )}

      {sections.length === 0 ? (
        <ScrollView
          contentContainerStyle={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: colors.primary + '10', borderWidth: 1, borderColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Library size={32} color={colors.textDim} strokeWidth={1.5} />
          </View>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 6, textAlign: 'center' }}>{t('downloads.emptyTitle')}</Text>
          <Text style={{ color: colors.textDim, fontSize: 13, textAlign: 'center', lineHeight: 19 }}>{t('downloads.emptyDesc')}</Text>
        </ScrollView>
      ) : (
        <FlatList
          data={sections}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item: any) => item.type === 'header' ? `h-${item.title}` : (item.bookId || item.id)}
          renderItem={({ item }: any) => {
            if (item.type === 'header') {
              return (
                <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 12, marginBottom: 10, marginLeft: 2 }}>
                  {item.title.toUpperCase()}
                </Text>
              );
            }
            if (item.type === 'active') {
              return (
                <BookCard
                  mode="active"
                  activeDownload={item as ActiveDownload}
                  onTogglePause={() => handleTogglePause(item as ActiveDownload)}
                  onRetry={() => handleRetryDownload(item as ActiveDownload)}
                  onRemove={() => DownloadStore.remove(item.bookId)}
                />
              );
            }
            // local
            return (
              <BookCard
                mode="local"
                item={item as BookMetadata}
                onPress={() => FileStore.openFile(item.localPath!)}
                onRemove={() => handleDeleteLocal(item as BookMetadata)}
              />
            );
          }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        />
      )}
    </View>
  );
}
