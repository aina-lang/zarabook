import { Colors, FormatColors } from '@/constants/theme';
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
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';

import { useConnectivity } from '@/core/context/ConnectivityContext';
import { FileStore } from '@/core/storage/fileStore';
import { ActiveDownload, DownloadStore } from '@/core/store/downloadStore';

const C = Colors.dark;

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
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: C.muted }}>Chargement…</Text>
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
      // Démarrer l'entrée dans le Store global
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
  const catColor = C.muted;
  const downloading = activeDownload?.status === 'downloading' || activeDownload?.status === 'pending';
  const progressPct = activeDownload ? Math.round(activeDownload.progress * 100) : 0;


  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Cover header */}
      <View style={[styles.header, { backgroundColor: catColor + '10' }]}>
        <View style={[styles.coverBlock, { backgroundColor: catColor + '15', borderColor: catColor + '33', borderWidth: 1 }]}>
          {book.thumbnailMessageId ? (
            <Image 
              source={{ uri: `https://hipster-api.fr/api/telegram/thumbnail/${book.thumbnailMessageId}` }} 
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <Text style={[styles.coverLetter, { color: catColor }]}>
              {book.title.charAt(0).toUpperCase()}
            </Text>
          )}
          <View style={[styles.formatBadge, { backgroundColor: FormatColors[book.format.toLowerCase()] || FormatColors.unknown }]}>
            <Text style={styles.formatBadgeText}>{book.format.toUpperCase()}</Text>
          </View>
        </View>

      </View>

      <View style={styles.body}>
        {/* Title & Author */}
        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.author}>{book.author}</Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.success }} />
            <Text style={[styles.statValue, { color: C.success }]}>Disponible</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <HardDrive size={14} color={C.muted} />
            <Text style={styles.statValue}>{formatSize(book.fileSize)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <FileText size={14} color={C.muted} />
            <Text style={styles.statValue}>{book.format.toUpperCase()}</Text>
          </View>
        </View>

        {/* Description */}
        {book.description ? (
          <>
            <Text style={styles.sectionTitle}>Résumé</Text>
            <Text style={styles.description}>{book.description}</Text>
          </>
        ) : null}

        {/* Metadata table */}
        <Text style={styles.sectionTitle}>Informations techniques</Text>
        <View style={styles.metaTable}>
          <MetaRow icon={<BookOpen size={14} color={C.muted} />} label="Format" value={book.format.toUpperCase()} />
          <MetaRow icon={<Calendar size={14} color={C.muted} />} label="Parution" value={formatDate(book.addedAt)} />
          <MetaRow icon={<Book size={14} color={C.muted} />} label="Source" value="Bibliothèque Cloud" />
        </View>

        {/* Hash - moins mis en avant */}
        <Text style={styles.hash}>ID: {book.id.substring(0, 16)}</Text>

        {/* Action button */}
        {isLocal ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: C.success + '15', borderColor: C.success + '33' }]}
            onPress={() => FileStore.openFile(book.localPath!)}
            activeOpacity={0.8}
          >
            <CheckCircle size={20} color={C.success} />
            <Text style={[styles.actionBtnText, { color: C.success }]}>Lire le livre</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: C.tint }]}
            onPress={handleDownload}
            disabled={downloading}
            activeOpacity={0.8}
          >
            <Download size={20} color="#fff" />
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>
              {downloading ? 'Chargement…' : 'Télécharger'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

function MetaRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <View style={styles.metaLeft}>
        {icon}
        <Text style={styles.metaLabel}>{label}</Text>
      </View>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    height: 180,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  coverBlock: {
    width: 90,
    height: 120,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    elevation: 8,
  },
  coverLetter: { fontSize: 48, fontWeight: 'bold' },
  formatBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderTopLeftRadius: 10,
    borderBottomRightRadius: 11,
  },
  formatBadgeText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryPillText: { fontWeight: '700', fontSize: 12 },
  body: { padding: 20 },
  title: { color: C.text, fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginTop: 16 },
  author: { color: C.muted, fontSize: 14, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 24,
  },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { color: C.text, fontSize: 14, fontWeight: '700' },
  statLabel: { color: C.muted, fontSize: 12 },
  divider: { width: 1, height: 20, backgroundColor: C.border, marginHorizontal: 16 },
  sectionTitle: {
    color: C.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  description: { color: C.text, fontSize: 14, lineHeight: 22, marginBottom: 24 },
  metaTable: {
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  metaLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaLabel: { color: C.muted, fontSize: 13 },
  metaValue: { color: C.text, fontSize: 13, fontWeight: '600' },
  hash: {
    color: C.muted,
    fontSize: 10,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 24,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actionBtnText: { fontSize: 16, fontWeight: 'bold' },
});
