import React, { useState, useEffect } from 'react';
import {
  View, FlatList, StyleSheet, Text, TouchableOpacity, Image,
} from 'react-native';
import { useModal } from '@/core/context/ModalContext';
import { Colors, FormatColors } from '@/constants/theme';
import { CheckCircle, Download, XCircle, AlertCircle, Loader, Trash2, Library } from 'lucide-react-native';
import { DownloadStore, ActiveDownload } from '@/core/store/downloadStore';
import { MetadataStore, BookMetadata } from '@/core/storage/storage';
import { useRouter } from 'expo-router';
import { FileStore } from '@/core/storage/fileStore';

const C = Colors.dark;

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const STATUS_CONFIG = {
  pending:     { label: 'En attente',   color: C.warning,  Icon: Loader },
  downloading: { label: 'Téléchargement', color: C.tint,   Icon: Download },
  completed:   { label: 'Terminé',      color: C.success,  Icon: CheckCircle },
  error:       { label: 'Erreur',       color: C.error,    Icon: AlertCircle },
  cancelled:   { label: 'Annulé',       color: C.muted,    Icon: XCircle },
};

function DownloadCard({ item, onRemove }: { item: ActiveDownload; onRemove: () => void }) {
  const cfg = STATUS_CONFIG[item.status];
  const Icon = cfg.Icon;
  const pct = Math.round(item.progress * 100);

  const catColor = C.muted;
  const format = item.format || '...';
  const badgeColor = item.format ? (FormatColors[item.format.toLowerCase()] || FormatColors.unknown) : FormatColors.unknown;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.cover, { backgroundColor: catColor + '15', borderColor: catColor + '33', borderWidth: 1 }]}>
          {item.thumbnailMessageId ? (
            <Image 
              source={{ uri: `https://hipster-api.fr/api/telegram/thumbnail/${item.thumbnailMessageId}` }} 
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : (
            <Text style={[styles.coverLetter, { color: catColor }]}>
              {item.bookTitle.charAt(0).toUpperCase()}
            </Text>
          )}
          <View style={[styles.formatBadge, { backgroundColor: badgeColor }]}>
            <Text style={styles.formatBadgeText}>{format.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{item.bookTitle}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Text style={styles.meta}>{cfg.label}</Text>
            {item.category && (
              <View style={[styles.categoryChip, { backgroundColor: C.tint + '15', borderColor: C.tint + '33' }]}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            )}
          </View>
          {item.status === 'downloading' && (
            <Text style={styles.meta}>{formatSize(item.bytesReceived)} / {formatSize(item.bookSize)}</Text>
          )}
        </View>
        <Text style={[styles.pct, { color: cfg.color }]}>
          {item.status === 'completed' ? '✓' : `${pct}%`}
        </Text>
      </View>

      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: cfg.color }]} />
      </View>

      {(item.status === 'error' || item.status === 'cancelled') && (
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
          <Text style={styles.removeText}>Réessayer / Supprimer</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function LocalBookCard({ item, onPress, onDelete }: { item: BookMetadata, onPress: () => void, onDelete: () => void }) {
  const catColor = C.muted;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardTop}>
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
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <Text style={styles.meta}>{item.author}</Text>
            {item.category && (
              <View style={[styles.categoryChip, { backgroundColor: C.tint + '15', borderColor: C.tint + '33' }]}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            )}
          </View>
          <Text style={styles.meta}>{formatSize(item.fileSize)} • {item.format.toUpperCase()}</Text>
        </View>
        <TouchableOpacity style={styles.trashBtn} onPress={onDelete}>
          <Trash2 size={18} color={C.error} />
        </TouchableOpacity>
      </View>
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
    <View style={styles.container}>
      {sections.length === 0 ? (
        <View style={styles.empty}>
          <Library size={52} color={C.border} />
          <Text style={styles.emptyTitle}>Votre bibliothèque est vide</Text>
          <Text style={styles.emptySubtitle}>Les livres que vous téléchargez ou importez apparaîtront ici.</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={(item: any) => item.type === 'header' ? `h-${item.title}` : (item.bookId || item.id)}
          renderItem={({ item }: any) => {
            if (item.type === 'header') {
              return <Text style={styles.sectionTitle}>{item.title}</Text>;
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  sectionTitle: { color: C.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12, marginTop: 12, letterSpacing: 1 },
  trashBtn: { padding: 8, marginLeft: 8 },
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cover: {
    width: 36,
    height: 48,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  coverLetter: { fontSize: 20, fontWeight: 'bold' },
  formatBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingHorizontal: 3,
    paddingVertical: 1,
    borderTopLeftRadius: 4,
  },
  formatBadgeText: { color: '#fff', fontSize: 7, fontWeight: '900' },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  title: { color: C.text, fontSize: 14, fontWeight: '700' },
  meta: { color: C.muted, fontSize: 11, marginTop: 2 },
  categoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryText: { fontSize: 10, fontWeight: '700', color: C.tint },
  pct: { fontSize: 13, fontWeight: 'bold' },
  progressBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  removeBtn: { marginTop: 10, alignSelf: 'flex-end' },
  removeText: { color: C.error, fontSize: 12, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { color: C.text, fontSize: 17, fontWeight: 'bold' },
  emptySubtitle: { color: C.muted, fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },
});
