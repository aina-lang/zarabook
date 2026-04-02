import { Colors, FormatColors } from '@/constants/theme';
import { useConnectivity } from '@/core/context/ConnectivityContext';
import { useModal } from '@/core/context/ModalContext';
import { FileStore } from '@/core/storage/fileStore';
import { BookMetadata, MetadataStore } from '@/core/storage/storage';
import { ActiveDownload, DownloadStore } from '@/core/store/downloadStore';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import { CheckCircle, Download, Plus, Search } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput, TouchableOpacity,
  View
} from 'react-native';
const C = Colors.dark;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function BookCard({
  item,
  onPress,
  onDownload,
  activeDownload
}: {
  item: BookMetadata;
  onPress: () => void;
  onDownload: () => void;
  activeDownload?: ActiveDownload | null;
}) {
  const catColor = C.muted;
  const isDownloading = activeDownload?.status === 'downloading' || activeDownload?.status === 'pending';
  const progressPct = activeDownload ? Math.round(activeDownload.progress * 100) : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Cover block - plus élégant */}
      <View style={[styles.cover, { backgroundColor: catColor + '15', borderColor: catColor + '33', borderWidth: 1 }]}>
        {item.thumbnailMessageId ? (
          <Image 
            source={{ uri: `https://hipster-api.fr/api/telegram/thumbnail/${item.thumbnailMessageId}` }} 
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <Text style={[styles.coverLetter, { color: catColor }]}>
            {item.title.charAt(0).toUpperCase()}
          </Text>
        )}
        <View style={[styles.formatBadge, { backgroundColor: FormatColors[item.format.toLowerCase()] || FormatColors.unknown }]}>
          <Text style={styles.formatBadgeText}>{item.format.toUpperCase()}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.author} numberOfLines={1}>{item.author}</Text>
          {item.category && (
            <View style={[styles.categoryChip, { backgroundColor: C.tint + '22', borderColor: C.tint + '44' }]}>
              <Text style={[styles.categoryText, { color: C.tint }]}>{item.category}</Text>
            </View>
          )}
        </View>

        <View style={[styles.row, { marginTop: 8 }]}>
          <View style={styles.stat}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isDownloading ? C.tint : C.success }} />
            <Text style={[styles.statText, { color: C.muted }]}>
              {isDownloading ? `Chargement ${progressPct}%` : 'Disponible sur le Cloud'}
            </Text>
          </View>
          <Text style={styles.size}>{formatSize(item.fileSize)}</Text>
        </View>
      </View>

      {/* Action icon */}
      <View style={styles.dlBtn}>
        {item.localPath ? (
          <CheckCircle size={20} color={C.success} />
        ) : isDownloading ? (
          <Text style={{ color: C.tint, fontSize: 12, fontWeight: 'bold' }}>{progressPct}%</Text>
        ) : (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onDownload();
            }}
          >
            <Download size={20} color={C.tint} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function IndexScreen() {
  const { showModal } = useModal();
  const { isOffline } = useConnectivity();
  const [allBooks, setAllBooks] = useState<BookMetadata[]>([]);
  const [activeDownloads, setActiveDownloads] = useState<Record<string, ActiveDownload>>({});
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await fetch("https://hipster-api.fr/api/telegram/list");
      const resData = await response.json();
      console.log("[Catalog] API Response:", JSON.stringify(resData).substring(0, 200));

      // Adaptation à l'intercepteur NestJS qui enveloppe la réponse dans "data"
      const payload = resData.data || resData;

      if (payload.success && payload.files) {
        const localBooks = await MetadataStore.getBooks();
        const books: BookMetadata[] = payload.files.map((f: any) => {
          const id = `tg-${f.id}`;
          return {
            id,
            telegramMessageId: f.id,
            title: f.fileName.split('.').slice(0, -1).join('.') || f.fileName,
            author: 'Auteur Inconnu',
            category: f.category || 'Autre',
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
      console.warn('[Catalog] Error fetching Telegram list:', e);
      // Fallback local si l'API est hors-ligne
      const bookMap = await MetadataStore.getBooks();
      const remote = Object.values(bookMap).filter(b => !b.localPath);
      remote.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
      setAllBooks(remote);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const [publicDir, setPublicDir] = useState<string | null>(null);

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

    // Suivre les téléchargements en cours pour mise à jour UI temps réel
    const sub = DownloadStore.subscribe(() => {
      const dls: Record<string, ActiveDownload> = {};
      DownloadStore.getAll().forEach(d => {
        dls[d.bookId] = d;
      });
      setActiveDownloads(dls);
    });

    return () => {
      sub();
    };
  }, [load]);

  const handleDownload = async (book: BookMetadata) => {
    if (isOffline) {
      showModal({
        type: 'info',
        title: 'Connexion Requise',
        message: 'Vous devez être connecté à Internet pour télécharger un livre depuis le Cloud.'
      });
      return;
    }

    if (!book.telegramMessageId) return;

    // Si pas de dossier public activé, on demande avant de télécharger
    if (!publicDir) {
      showModal({
        type: 'confirm',
        title: 'Explorer Public',
        message: 'Pour voir vos livres dans l\'explorateur du téléphone (Downloads), vous devez choisir un dossier de stockage une fois.',
        confirmText: 'Choisir Dossier',
        cancelText: 'Plus tard',
        onConfirm: async () => {
          const uri = await setupStorage();
          if (uri) {
            // On attend un peu pour que AsyncStorage soit prêt
            setTimeout(() => continueDownload(book), 500);
          }
        },
        onCancel: () => continueDownload(book)
      });
      return;
    }

    await continueDownload(book);
  };

  const continueDownload = async (book: BookMetadata) => {
    try {
      DownloadStore.start({
        bookId: book.id,
        bookTitle: book.title,
        bookSize: book.fileSize,
        fromPeerId: 'cloud-telegram',
        format: book.format,
        thumbnailMessageId: book.thumbnailMessageId,
      });

      const filename = `${book.title.replace(/\s+/g, '_')}.${book.format}`;
      // On demande le chemin (public ou privé selon conf/Android version)
      const outputPath = await FileStore.getFileUri(filename);

      const { telegramService } = require('@/services/telegramService');
      const tempPath = FileSystem.cacheDirectory + filename;

      // Téléchargement vers un dossier temporaire d'abord
      const finalTempUri = await telegramService.downloadFile(
        book.telegramMessageId,
        tempPath,
        (progress: number, bytes: number, total: number) => {
          DownloadStore.updateProgress(book.id, bytes, total);
        }
      );

      // Déplacement final vers le stockage permanent (public ou privé)
      const finalUri = await FileStore.saveFile(finalTempUri, filename);

      DownloadStore.complete(book.id, finalUri);

      // Mettre à jour le stockage et l'UI locale
      const updated = { ...book, localPath: finalUri };
      await MetadataStore.saveBook(updated);
      setAllBooks(prev => prev.map(b => b.id === book.id ? updated : b));

    } catch (error) {
      console.error("[Catalog] Error downloading:", error);
      DownloadStore.fail(book.id, "Échec");
    }
  };

  const handleDeleteLocal = (book: BookMetadata) => {
    showModal({
      type: 'delete',
      title: 'Supprimer ?',
      message: `Voulez-vous supprimer "${book.title}" de votre appareil ?`,
      confirmText: 'Supprimer',
      onConfirm: async () => {
        if (book.localPath) {
          await FileStore.deleteFile(book.localPath);
        }
        const updated = { ...book, localPath: undefined };
        await MetadataStore.saveBook(updated);
        setAllBooks(prev => prev.map(b => b.id === book.id ? updated : b));
      }
    });
  };

  const [isUploading, setIsUploading] = useState(false);

  const importBook = async () => {
    if (isOffline) {
      showModal({
        type: 'info',
        title: 'Connexion Requise',
        message: 'L\'importation nécessite une connexion Internet pour sauvegarder votre livre sur le Cloud.'
      });
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const file = result.assets[0];
        
        // Navigation vers le formulaire d'upload avec les infos du fichier
        router.push({
          pathname: '/upload-form',
          params: { 
            uri: file.uri, 
            name: file.name, 
            size: file.size ? file.size.toString() : '0' 
          }
        });
      }
    } catch (err) {
      setIsUploading(false);
      showModal({
        type: 'error',
        title: 'Erreur',
        message: "Échec de l'importation du livre."
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = allBooks.filter(b => {
    const q = search.toLowerCase();
    return !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
  });

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <Search size={18} color={C.muted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Titre, auteur…"
          placeholderTextColor={C.muted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Book list */}
      <FlatList
        data={allBooks.filter(b => {
          const q = search.toLowerCase();
          return !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
        })}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <BookCard
            item={item}
            onPress={() => router.push(`/book/${item.id}`)}
            onDownload={() => handleDownload(item)}
            activeDownload={activeDownloads[item.id]}
          />
        )}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.tint} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aucun livre trouvé</Text>
            <Text style={styles.emptySubtitle}>
              {allBooks.length === 0
                ? 'Le catalogue Cloud (Telegram) est vide ou inaccessible.'
                : 'Essaie un autre filtre'}
            </Text>
          </View>
        }
      />

      {/* Floating Action Button pour l'import */}
      <TouchableOpacity style={styles.fab} onPress={importBook} disabled={isUploading}>
        {isUploading ? <ActivityIndicator color="#fff" /> : <Plus size={28} color="#fff" />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: { flex: 1, color: C.text, fontSize: 15 },
  chips: { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.tint,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: C.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  chipActive: { backgroundColor: C.tint + '33', borderColor: C.tint },
  chipText: { color: C.muted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: C.tint },
  card: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  cover: {
    width: 52,
    height: 70,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  coverLetter: { fontSize: 26, fontWeight: 'bold' },
  info: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryText: { fontSize: 10, fontWeight: '700' },
  formatBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderTopLeftRadius: 6,
    borderBottomRightRadius: 7, // match cover radius
  },
  formatBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  title: { color: C.text, fontSize: 14, fontWeight: '700', marginTop: 4, lineHeight: 19 },
  author: { color: C.muted, fontSize: 12, marginTop: 2 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 11, fontWeight: '600' },
  size: { color: C.muted, fontSize: 11, marginLeft: 'auto' },
  dlBtn: { padding: 10 },
  empty: { marginTop: 80, alignItems: 'center' },
  emptyTitle: { color: C.text, fontSize: 17, fontWeight: 'bold', marginBottom: 8 },
  emptySubtitle: { color: C.muted, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
});
