import React, { useState, useEffect } from 'react';
import {
  View, FlatList, StyleSheet, Text, TouchableOpacity,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { CheckCircle, Download, XCircle, AlertCircle, Loader } from 'lucide-react-native';
import { DownloadStore, ActiveDownload } from '@/core/store/downloadStore';
import { Storage } from '@/core/storage/storage';

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

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.statusIcon, { backgroundColor: cfg.color + '22' }]}>
          <Icon size={18} color={cfg.color} />
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{item.bookTitle}</Text>
          <Text style={styles.meta}>
            {cfg.label}
            {item.status === 'downloading' && ` — ${formatSize(item.bytesReceived)} / ${formatSize(item.bookSize)}`}
            {item.status === 'error' && ` — ${item.error}`}
          </Text>
        </View>
        <Text style={[styles.pct, { color: cfg.color }]}>
          {item.status === 'completed' ? '✓' : `${pct}%`}
        </Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: cfg.color }]} />
      </View>

      {/* Actions */}
      {(item.status === 'completed' || item.status === 'error' || item.status === 'cancelled') && (
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
          <Text style={styles.removeText}>Supprimer</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function DownloadsScreen() {
  const [downloads, setDownloads] = useState<ActiveDownload[]>([]);

  useEffect(() => {
    // Merge persisted downloads from AsyncStorage into the in-memory store on mount
    (async () => {
      const persisted = await Storage.getDownloads();
      for (const entry of Object.values(persisted)) {
        if (!DownloadStore.get(entry.bookId)) {
          DownloadStore.start({
            bookId: entry.bookId,
            bookTitle: entry.bookTitle,
            bookSize: entry.bookSize,
            fromPeerId: entry.fromPeerId,
          });
          if (entry.status === 'completed') {
            DownloadStore.complete(entry.bookId, entry.localPath ?? '');
          } else if (entry.status === 'error') {
            DownloadStore.fail(entry.bookId, entry.error ?? 'Erreur');
          }
        }
      }
      setDownloads(DownloadStore.getAll());
    })();

    return DownloadStore.subscribe(() => {
      setDownloads([...DownloadStore.getAll()]);
    });
  }, []);

  const handleRemove = async (bookId: string) => {
    DownloadStore.remove(bookId);
    await Storage.deleteDownload(bookId);
  };

  const active = downloads.filter(d => d.status === 'pending' || d.status === 'downloading');
  const done   = downloads.filter(d => d.status === 'completed' || d.status === 'error' || d.status === 'cancelled');

  return (
    <View style={styles.container}>
      {downloads.length === 0 ? (
        <View style={styles.empty}>
          <Download size={52} color={C.border} />
          <Text style={styles.emptyTitle}>Aucun téléchargement</Text>
          <Text style={styles.emptySubtitle}>Les fichiers reçus depuis le réseau apparaîtront ici</Text>
        </View>
      ) : (
        <FlatList
          data={[...active, ...done]}
          keyExtractor={item => item.bookId}
          renderItem={({ item }) => (
            <DownloadCard item={item} onRemove={() => handleRemove(item.bookId)} />
          )}
          contentContainerStyle={{ padding: 12 }}
          ListHeaderComponent={
            active.length > 0 ? (
              <Text style={styles.sectionTitle}>En cours · {active.length}</Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  sectionTitle: { color: C.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 },
  card: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
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
