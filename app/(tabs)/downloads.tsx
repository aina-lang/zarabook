import React, { useState, useEffect } from 'react';
import {
  View, FlatList, Text, TouchableOpacity, Image,
} from 'react-native';
import { useModal } from '@/core/context/ModalContext';
import { CheckCircle, Download, XCircle, AlertCircle, Loader, Trash2, Library } from 'lucide-react-native';
import { DownloadStore, ActiveDownload } from '@/core/store/downloadStore';
import { MetadataStore, BookMetadata } from '@/core/storage/storage';
import { useRouter } from 'expo-router';
import { FileStore } from '@/core/storage/fileStore';
import { Colors } from '@/constants/theme';

const STATUS_CONFIG = {
  pending:     { label: 'En attente',   color: '#f59e0b',  Icon: Loader },
  downloading: { label: 'Téléchargement', color: '#f97316',   Icon: Download },
  completed:   { label: 'Terminé',      color: '#10b981',  Icon: CheckCircle },
  error:       { label: 'Erreur',       color: '#ef4444',    Icon: AlertCircle },
  cancelled:   { label: 'Annulé',       color: '#94a3b8',    Icon: XCircle },
};

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function DownloadCard({ item, onRemove }: { item: ActiveDownload; onRemove: () => void }) {
  const cfg = STATUS_CONFIG[item.status];
  const Icon = cfg.Icon;
  const pct = Math.round(item.progress * 100);
  const format = item.format || '...';

  return (
    <View className="bg-[#1a1d24] rounded-2xl p-3.5 mb-2.5 border border-[#2d3139]">
      <View className="flex-row items-center mb-2.5">
        <View className="w-9 h-12 rounded-lg justify-center items-center mr-3 bg-[#94a3b8]/10 border border-[#94a3b8]/20 overflow-hidden">
          {item.thumbnailMessageId ? (
            <Image 
              source={{ uri: `https://hipster-api.fr/api/telegram/thumbnail/${item.thumbnailMessageId}` }} 
              className="absolute inset-0"
              resizeMode="cover"
            />
          ) : (
            <Text className="text-xl font-bold text-[#94a3b8]">
              {item.bookTitle.charAt(0).toUpperCase()}
            </Text>
          )}
          <View className="absolute bottom-0 right-0 px-1 py-0.5 rounded-tl-md bg-[#94a3b8]">
            <Text className="text-white text-[7px] font-black">{format.toUpperCase()}</Text>
          </View>
        </View>
        <View className="flex-1">
          <Text className="text-white text-sm font-bold" numberOfLines={1}>{item.bookTitle}</Text>
          <View className="flex-row items-center gap-1.5 mt-0.5">
            <Text className="text-[#94a3b8] text-[11px] font-semibold">{cfg.label}</Text>
            {item.category && (
              <View className="px-2 py-0.5 rounded-full bg-[#f97316]/15 border border-[#f97316]/30">
                <Text className="text-[#f97316] text-[10px] font-bold">{item.category}</Text>
              </View>
            )}
          </View>
          {item.status === 'downloading' && (
            <Text className="text-[#94a3b8] text-[11px] mt-0.5">{formatSize(item.bytesReceived)} / {formatSize(item.bookSize)}</Text>
          )}
        </View>
        <Text className="text-sm font-bold" style={{ color: cfg.color }}>
          {item.status === 'completed' ? '✓' : `${pct}%`}
        </Text>
      </View>

      <View className="h-1 rounded-full bg-[#2d3139] overflow-hidden">
        <View className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
      </View>

      {(item.status === 'error' || item.status === 'cancelled') && (
        <TouchableOpacity className="mt-2.5 self-end" onPress={onRemove}>
          <Text className="text-[#ef4444] text-xs font-semibold">Réessayer / Supprimer</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function LocalBookCard({ item, onPress, onDelete }: { item: BookMetadata, onPress: () => void, onDelete: () => void }) {
  return (
    <TouchableOpacity 
      className="bg-[#1a1d24] rounded-2xl p-3.5 mb-2.5 border border-[#2d3139] flex-row items-center" 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View className="w-9 h-12 rounded-lg justify-center items-center mr-3 bg-[#94a3b8]/10 border border-[#94a3b8]/20 overflow-hidden">
        {item.thumbnailMessageId ? (
          <Image 
            source={{ uri: `https://hipster-api.fr/api/telegram/thumbnail/${item.thumbnailMessageId}` }} 
            className="absolute inset-0"
            resizeMode="cover"
          />
        ) : (
          <Text className="text-xl font-bold text-[#94a3b8]">
            {item.title.charAt(0).toUpperCase()}
          </Text>
        )}
        <View className="absolute bottom-0 right-0 px-1 py-0.5 rounded-tl-md bg-[#f97316]">
          <Text className="text-white text-[7px] font-black">{item.format.toUpperCase()}</Text>
        </View>
      </View>
      <View className="flex-1">
        <Text className="text-white text-sm font-bold" numberOfLines={1}>{item.title}</Text>
        <View className="flex-row items-center gap-1.5 mt-0.5">
          <Text className="text-[#94a3b8] text-[11px] flex-1" numberOfLines={1}>{item.author}</Text>
          {item.category && (
            <View className="px-2 py-0.5 rounded-full bg-[#f97316]/15 border border-[#f97316]/30">
              <Text className="text-[#f97316] text-[10px] font-bold">{item.category}</Text>
            </View>
          )}
        </View>
        <Text className="text-[#94a3b8] text-[11px] mt-0.5">{formatSize(item.fileSize)} • {item.format.toUpperCase()}</Text>
      </View>
      <TouchableOpacity className="p-2 ml-2" onPress={onDelete}>
        <Trash2 size={18} color="#ef4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function DownloadsScreen() {
  const [active, setActive] = useState<ActiveDownload[]>([]);
  const [local, setLocal] = useState<BookMetadata[]>([]);
  const router = useRouter();

  const load = async () => {
    // Actifs
    setActive(DownloadStore.getAll().filter(d => d.status === 'pending' || d.status === 'downloading' || d.status === 'error'));
    
    // Téléchargés
    const bookMap = await MetadataStore.getBooks();
    const downloaded = Object.values(bookMap)
      .filter(b => !!b.localPath)
      .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
    setLocal(downloaded);
  };

  useEffect(() => {
    load();
    const sub1 = DownloadStore.subscribe(load);
    const sub2 = MetadataStore.subscribe(load);
    return () => { sub1(); sub2(); };
  }, []);

  const handleRemove = async (bookId: string) => {
    // Supprimer l'entrée du store de téléchargement (mémoire)
    DownloadStore.remove(bookId);
    load();
  };

  const { showModal } = useModal();

  const handleDeleteLocal = (book: BookMetadata) => {
    showModal({
      type: 'delete',
      title: 'Supprimer ?',
      message: `Voulez-vous supprimer "${book.title}" de votre appareil ?`,
      confirmText: 'Supprimer',
      onConfirm: async () => {
        if (book.localPath) {
          const { FileStore } = require('@/core/storage/fileStore');
          await FileStore.deleteFile(book.localPath);
        }
        const updated = { ...book, localPath: undefined };
        await MetadataStore.saveBook(updated);
        load();
      }
    });
  };

  const sections = [
    ...(active.length > 0 ? [{ type: 'header', title: 'Téléchargements en cours' }, ...active.map(a => ({ ...a, type: 'active' }))] : []),
    ...(local.length > 0 ? [{ type: 'header', title: 'Ma Bibliothèque' }, ...local.map(l => ({ ...l, type: 'local' }))] : []),
  ];

  return (
    <View className="flex-1 bg-[#0d0f14]">
      {sections.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-3">
          <Library size={52} color="#2d3139" />
          <Text className="text-white text-lg font-bold">Votre bibliothèque est vide</Text>
          <Text className="text-[#94a3b8] text-sm text-center px-10">Les livres que vous téléchargez ou importez apparaîtront ici.</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item: any) => item.type === 'header' ? `h-${item.title}` : (item.bookId || item.id)}
          renderItem={({ item }: any) => {
            if (item.type === 'header') {
              return <Text className="text-[#94a3b8] text-[11px] font-bold uppercase tracking-widest mb-3 mt-4 px-4">{item.title}</Text>;
            }
            if (item.type === 'active') {
              return <DownloadCard item={item} onRemove={() => handleRemove(item.bookId)} />;
            }
            return <LocalBookCard 
              item={item} 
              onPress={() => FileStore.openFile(item.localPath!)} 
              onDelete={() => handleDeleteLocal(item)}
            />;
          }}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
}
