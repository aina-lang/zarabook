import { useModal } from '@/core/context/ModalContext';
import { BookMetadata, MetadataStore } from '@/core/storage/storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Book,
  BookOpen,
  Calendar,
  CheckCircle,
  Download,
  FileText,
  HardDrive
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';

import { useConnectivity } from '@/core/context/ConnectivityContext';
import { FileStore } from '@/core/storage/fileStore';
import { ActiveDownload, DownloadStore } from '@/core/store/downloadStore';


function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(ts: number | undefined) {
  if (!ts) return 'Date inconnue';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return 'Date invalide';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function BookDetailScreen() {
  const { showModal } = useModal();
  const { isOffline } = useConnectivity();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<BookMetadata | null>(null);
  const [activeDownload, setActiveDownload] = useState<ActiveDownload | null>(null);

  const router = useRouter();

  const load = React.useCallback(async () => {
    if (id) {
      const b = await MetadataStore.getBook(id);
      setBook(b || null);
      const dl = DownloadStore.get(id);
      setActiveDownload(dl || null);
    }
  }, [id]);

  useEffect(() => {
    load();
    const sub1 = DownloadStore.subscribe(load);
    const sub2 = MetadataStore.subscribe(load);
    return () => { sub1(); sub2(); };
  }, [id, load]);

  if (!book) {
    return (
      <View className="flex-1 bg-[#0d0f14] justify-center items-center">
        <Text className="text-[#94a3b8]">Chargement…</Text>
      </View>
    );
  }

  const handleDownload = async () => {
    if (isOffline) {
      showModal({
        type: 'info',
        title: 'Connexion Requise',
        message: 'Vous devez être connecté à Internet pour télécharger ce livre depuis le Cloud.'
      });
      return;
    }

    if (!book.telegramMessageId) {
      showModal({
        type: 'info',
        title: 'Indisponible',
        message: "Ce fichier n'est pas disponible sur le Cloud."
      });
      return;
    }

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
      await FileStore.ensureDir();
      const outputPath = await FileStore.getFileUri(filename);

      const { telegramService } = require('@/services/telegramService');

      const finalUri = await telegramService.downloadFile(
        book.telegramMessageId,
        outputPath,
        (progress: number, bytes: number, total: number) => {
          DownloadStore.updateProgress(book.id, bytes, total);
        }
      );

      DownloadStore.complete(book.id, finalUri);

      const newBook = { ...book, localPath: finalUri };
      await MetadataStore.saveBook(newBook);
      setBook(newBook);

      showModal({
        type: 'success',
        title: 'Succès',
        message: 'Le fichier a été téléchargé avec succès.'
      });
    } catch (error) {
      console.error(error);
      DownloadStore.fail(book.id, "Erreur de téléchargement");
      showModal({
        type: 'error',
        title: 'Erreur',
        message: "L'opération a échoué. Vérifiez votre connexion."
      });
    }
  };

  const isLocal = !!book.localPath;
  const downloading = activeDownload?.status === 'downloading' || activeDownload?.status === 'pending';

  return (
    <ScrollView className="flex-1 bg-[#0d0f14]" contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Cover header */}
      <View className="h-44 justify-end items-center pb-5 bg-white/5">
        <View className="w-24 h-32 rounded-2xl justify-center items-center mb-2.5 bg-[#94a3b8]/10 border border-[#94a3b8]/20 overflow-hidden shadow-xl">
          {book.thumbnailMessageId ? (
            <Image 
              source={{ uri: `https://hipster-api.fr/api/telegram/thumbnail/${book.thumbnailMessageId}` }} 
              className="absolute inset-0"
              resizeMode="cover"
            />
          ) : (
            <Text className="text-5xl font-bold text-[#94a3b8]">
              {book.title.charAt(0).toUpperCase()}
            </Text>
          )}
          <View className="absolute bottom-0 right-0 px-2 py-1 rounded-tl-xl bg-[#f97316]">
            <Text className="text-white text-xs font-black">{book.format.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <View className="p-5">
        {/* Title & Author */}
        <Text className="text-[#ffffff] text-2xl font-bold text-center mt-4">{book.title}</Text>
        <Text className="text-[#94a3b8] text-sm text-center mt-1 mb-5">{book.author}</Text>

        {/* Stats row */}
        <View className="flex-row justify-center items-center bg-[#1a1d24] rounded-2xl p-4 border border-[#2d3139] mb-6">
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full bg-[#10b981]" />
            <Text className="text-[#10b981] text-sm font-bold">Disponible</Text>
          </View>
          <View className="w-[1] h-5 bg-[#2d3139] mx-4" />
          <View className="flex-row items-center gap-1.5">
            <HardDrive size={14} color="#94a3b8" />
            <Text className="text-white text-sm font-bold">{formatSize(book.fileSize)}</Text>
          </View>
          <View className="w-[1] h-5 bg-[#2d3139] mx-4" />
          <View className="flex-row items-center gap-1.5">
            <FileText size={14} color="#94a3b8" />
            <Text className="text-white text-sm font-bold">{book.format.toUpperCase()}</Text>
          </View>
        </View>

        {/* Description */}
        {book.description ? (
          <View className="mb-6">
            <Text className="text-[#94a3b8] text-[11px] font-bold uppercase tracking-wider mb-2.5">Résumé</Text>
            <Text className="text-[#ffffff] text-sm leading-6">{book.description}</Text>
          </View>
        ) : null}

        {/* Metadata table */}
        <Text className="text-[#94a3b8] text-[11px] font-bold uppercase tracking-wider mb-2.5">Informations techniques</Text>
        <View className="bg-[#1a1d24] rounded-2xl border border-[#2d3139] overflow-hidden mb-4">
          <MetaRow icon={<BookOpen size={14} color="#94a3b8" />} label="Format" value={book.format.toUpperCase()} />
          <MetaRow icon={<Calendar size={14} color="#94a3b8" />} label="Parution" value={formatDate(book.addedAt)} />
          <MetaRow icon={<Book size={14} color="#94a3b8" />} label="Source" value="Bibliothèque Cloud" last />
        </View>

        {/* ID */}
        <Text className="text-[#94a3b8] text-[10px] text-center mb-6 opacity-50 font-mono">ID: {book.id.substring(0, 16)}</Text>

        {/* Action button */}
        {isLocal ? (
          <TouchableOpacity
            className="flex-row items-center justify-center gap-2.5 py-4 rounded-2xl bg-[#10b981]/15 border border-[#10b981]/30"
            onPress={() => FileStore.openFile(book.localPath!)}
            activeOpacity={0.8}
          >
            <CheckCircle size={20} color="#10b981" />
            <Text className="text-[#10b981] text-base font-bold">Lire le livre</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className={`flex-row items-center justify-center gap-2.5 py-4 rounded-2xl bg-[#f97316] ${downloading ? 'opacity-70' : ''}`}
            onPress={handleDownload}
            disabled={downloading}
            activeOpacity={0.8}
          >
            <Download size={20} color="#fff" />
            <Text className="text-white text-base font-bold">
              {downloading ? 'Chargement…' : 'Télécharger'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

function MetaRow({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string, last?: boolean }) {
  return (
    <View className={`flex-row justify-between items-center px-4 py-3 ${!last ? 'border-b border-[#2d3139]' : ''}`}>
      <View className="flex-row items-center gap-2">
        {icon}
        <Text className="text-[#94a3b8] text-[13px]">{label}</Text>
      </View>
      <Text className="text-[#ffffff] text-[13px] font-semibold">{value}</Text>
    </View>
  );
}

