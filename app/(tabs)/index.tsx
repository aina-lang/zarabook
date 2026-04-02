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
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
const C = Colors.dark;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORIES = [
  "Tous",
  "Roman / Fiction",
  "Science-Fiction",
  "Fantasy",
  "Policier & Thriller",
  "Développement Personnel",
  "Business & Économie",
  "Informatique & Tech",
  "Cours & Éducation",
  "Santé & Bien-être",
  "Art & Design",
  "Histoire",
  "Autre"
];

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
  const isDownloading = activeDownload?.status === 'downloading' || activeDownload?.status === 'pending';
  const progressPct = activeDownload ? Math.round(activeDownload.progress * 100) : 0;

  return (
    <TouchableOpacity 
      className="flex-row bg-[#1a1d24] rounded-2xl p-3 mb-2.5 border border-[#2d3139] items-center" 
      onPress={onPress} 
      activeOpacity={0.75}
    >
      {/* Cover block */}
      <View className="w-14 h-20 rounded-xl justify-center items-center mr-3 bg-[#f97316]/10 border border-[#f97316]/20 overflow-hidden">
        {item.thumbnailMessageId ? (
          <Image 
            source={{ uri: `https://hipster-api.fr/api/telegram/thumbnail/${item.thumbnailMessageId}` }} 
            className="absolute inset-0"
            resizeMode="cover"
          />
        ) : (
          <Text className="text-2xl font-bold text-[#f97316]">
            {item.title.charAt(0).toUpperCase()}
          </Text>
        )}
        <View className="absolute bottom-0 right-0 px-1.5 py-0.5 rounded-tl-lg bg-[#f97316]">
          <Text className="text-white text-[9px] font-black">{item.format.toUpperCase()}</Text>
        </View>
      </View>

      {/* Info */}
      <View className="flex-1">
        <View className="flex-row items-center space-x-2">
          <Text className="text-white text-sm font-bold flex-1" numberOfLines={2}>{item.title}</Text>
        </View>

        <View className="flex-row items-center space-x-2 mt-0.5">
          <Text className="text-[#94a3b8] text-xs flex-1" numberOfLines={1}>{item.author}</Text>
          {item.category && (
            <View className="px-2 py-0.5 rounded-full bg-[#f97316]/10 border border-[#f97316]/20">
              <Text className="text-[#f97316] text-[10px] font-bold">{item.category}</Text>
            </View>
          )}
        </View>

        <View className="flex-row items-center justify-between mt-2">
          <View className="flex-row items-center space-x-1">
            <View className={`w-1.5 h-1.5 rounded-full ${isDownloading ? 'bg-[#f97316]' : 'bg-[#10b981]'}`} />
            <Text className="text-[#94a3b8] text-[11px] font-semibold">
              {isDownloading ? `Chargement ${progressPct}%` : 'Disponible sur le Cloud'}
            </Text>
          </View>
          <Text className="text-[#94a3b8] text-[11px]">{formatSize(item.fileSize)}</Text>
        </View>
      </View>

      {/* Action icon */}
      <View className="p-2.5">
        {item.localPath ? (
          <CheckCircle size={20} color="#10b981" />
        ) : isDownloading ? (
          <Text className="text-[#f97316] text-xs font-bold">{progressPct}%</Text>
        ) : (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onDownload();
            }}
          >
            <Download size={20} color="#f97316" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function IndexScreen() {
  const { isOffline } = useConnectivity();
  const { showModal } = useModal();
  const [allBooks, setAllBooks] = useState<BookMetadata[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [activeDownloads, setActiveDownloads] = useState<Record<string, ActiveDownload>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      setRefreshing(true);
      const response = await fetch("https://hipster-api.fr/api/telegram/list");
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
      console.warn('[Catalog] Error fetching Telegram list:', e);
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
      const outputPath = await FileStore.getFileUri(filename);

      const { telegramService } = require('@/services/telegramService');
      const tempPath = FileSystem.cacheDirectory + filename;

      const finalTempUri = await telegramService.downloadFile(
        book.telegramMessageId,
        tempPath,
        (progress: number, bytes: number, total: number) => {
          DownloadStore.updateProgress(book.id, bytes, total);
        }
      );

      const finalUri = await FileStore.saveFile(finalTempUri, filename);
      DownloadStore.complete(book.id, finalUri);

      const updated = { ...book, localPath: finalUri };
      await MetadataStore.saveBook(updated);
      setAllBooks(prev => prev.map(b => b.id === book.id ? updated : b));

    } catch (error) {
      console.error("[Catalog] Error downloading:", error);
      DownloadStore.fail(book.id, "Échec");
    }
  };

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
    const matchesSearch = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
    const matchesCategory = selectedCategory === 'Tous' || b.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <View className="flex-1 bg-[#0d0f14]">
      {/* Search bar */}
      <View className="flex-row items-center mx-3 mt-3 px-3.5 py-2.5 bg-[#1a1d24] rounded-xl border border-[#2d3139]">
        <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
        <TextInput
          className="flex-1 text-[#ffffff] text-[15px]"
          placeholder="Titre, auteur…"
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Categories horizontal scroll */}
      <View className="mt-3">
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingBottom: 4 }}
        >
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full border ${selectedCategory === cat ? 'bg-[#f97316]/20 border-[#f97316]' : 'bg-[#1a1d24] border-[#2d3139]'}`}
            >
              <Text className={`text-[13px] font-semibold ${selectedCategory === cat ? 'text-[#f97316]' : 'text-[#94a3b8]'}`}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Book list */}
      <FlatList
        data={filtered}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
        ListEmptyComponent={
          <View className="mt-20 items-center">
            <Text className="text-[#ffffff] text-lg font-bold mb-2">Aucun livre trouvé</Text>
            <Text className="text-[#94a3b8] text-sm text-center px-8">
              {allBooks.length === 0
                ? 'Le catalogue Cloud (Telegram) est vide ou inaccessible.'
                : 'Essaie un autre filtre ou une autre catégorie.'}
            </Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity 
        className="absolute bottom-6 right-5 w-14 h-14 rounded-full bg-[#f97316] justify-center items-center elevation-6 shadow-[#f97316] shadow-offset-y-4 shadow-opacity-40 shadow-radius-8"
        onPress={importBook} 
        disabled={isUploading}
      >
        {isUploading ? <ActivityIndicator color="#fff" /> : <Plus size={28} color="#fff" />}
      </TouchableOpacity>
    </View>
  );
}
