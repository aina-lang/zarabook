import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Storage, BookMetadata } from '@/core/storage/storage';
import { Colors, CategoryColors } from '@/constants/theme';
import {
  Download, Users, FileText, CheckCircle,
  BookOpen, HardDrive, Calendar,
} from 'lucide-react-native';
import { useNode, usePeerId } from '@/core/NodeContext';
import { TransferProtocol } from '@/services/transferProtocol';

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<BookMetadata | null>(null);
  const [downloading, setDownloading] = useState(false);
  const node = useNode();
  const myPeerId = usePeerId();
  const router = useRouter();

  useEffect(() => {
    if (id) {
      Storage.getBook(id).then(setBook);
    }
  }, [id]);

  if (!book) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={{ color: C.muted }}>Chargement…</Text>
      </View>
    );
  }

  const isLocal = !!book.localPath;
  const catColor = CategoryColors[book.category] ?? C.muted;

  const handleDownload = async () => {
    if (!node || !book) return;
    if (isLocal) {
      Alert.alert('Déjà disponible', 'Ce livre est dans ta bibliothèque.');
      return;
    }
    if (book.ownerPeerId === myPeerId || book.ownerPeerId === 'me') {
      Alert.alert('Info', 'Tu es le seul seed connu pour ce livre.');
      return;
    }

    try {
      setDownloading(true);
      const protocol = new TransferProtocol(node);
      const filename = `${book.hash}.${book.format}`;
      await protocol.downloadBook(
        book.ownerPeerId,
        { id: book.id, title: book.title, hash: book.hash, fileSize: book.fileSize },
        filename
      );
      // Update book entry with local path
      await Storage.saveBook({
        ...book,
        localPath: `${filename}`,
      });
      Alert.alert('Terminé', `"${book.title}" téléchargé avec succès !`);
      router.back();
    } catch (err: any) {
      Alert.alert('Erreur', `Téléchargement échoué : ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Cover header */}
      <View style={[styles.header, { backgroundColor: catColor + '44' }]}>
        <View style={[styles.coverBlock, { backgroundColor: catColor + '55' }]}>
          <Text style={[styles.coverLetter, { color: catColor }]}>
            {book.title.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={[styles.categoryPill, { backgroundColor: catColor + '33', borderColor: catColor + '66' }]}>
          <Text style={[styles.categoryPillText, { color: catColor }]}>{book.category}</Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* Title & Author */}
        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.author}>{book.author}</Text>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Users size={14} color={C.success} />
            <Text style={[styles.statValue, { color: C.success }]}>{book.seedCount ?? 0}</Text>
            <Text style={styles.statLabel}>seeds</Text>
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
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{book.description}</Text>
          </>
        ) : null}

        {/* Metadata table */}
        <Text style={styles.sectionTitle}>Informations</Text>
        <View style={styles.metaTable}>
          <MetaRow icon={<BookOpen size={14} color={C.muted} />} label="Format" value={book.format.toUpperCase()} />
          <MetaRow icon={<Calendar size={14} color={C.muted} />} label="Ajouté le" value={formatDate(book.addedAt)} />
          <MetaRow icon={<Users size={14} color={C.muted} />} label="Source" value={`${book.ownerPeerId.substring(0, 16)}…`} />
        </View>

        {/* Hash */}
        <Text style={styles.hash}>SHA-256: {book.hash.substring(0, 32)}…</Text>

        {/* Action button */}
        {isLocal ? (
          <View style={[styles.actionBtn, { backgroundColor: C.success + '22', borderColor: C.success + '44' }]}>
            <CheckCircle size={20} color={C.success} />
            <Text style={[styles.actionBtnText, { color: C.success }]}>Dans ta bibliothèque · Seeding</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: C.tint }]}
            onPress={handleDownload}
            disabled={downloading}
            activeOpacity={0.8}
          >
            <Download size={20} color="#fff" />
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>
              {downloading ? 'Téléchargement…' : 'Télécharger'}
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
