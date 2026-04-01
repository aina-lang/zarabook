import React, { useState, useEffect, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, TouchableOpacity, Text,
  Alert, RefreshControl,
} from 'react-native';
import { Storage, BookMetadata } from '@/core/storage/storage';
import { FileStore } from '@/core/storage/fileStore';
import * as DocumentPicker from 'expo-document-picker';
import { Plus, Book as BookIcon, Radio } from 'lucide-react-native';
import { Colors, CategoryColors, CATEGORIES } from '@/constants/theme';
import { usePeerId } from '@/core/NodeContext';
import { useRouter } from 'expo-router';

const C = Colors.dark;

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function LibraryScreen() {
  const [books, setBooks] = useState<BookMetadata[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const peerId = usePeerId();
  const router = useRouter();

  const load = useCallback(async () => {
    const bookMap = await Storage.getBooks();
    const local = Object.values(bookMap)
      .filter(b => !!b.localPath)
      .sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
    setBooks(local);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const importBook = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/epub+zip'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const file = result.assets[0];
        const hash = await FileStore.calculateHash(file.uri);
        const name = file.name;
        const localPath = await FileStore.saveFile(file.uri, name);

        const newBook: BookMetadata = {
          id: hash,
          title: name.replace(/\.[^/.]+$/, ''),
          author: 'Inconnu',
          category: 'Autre',
          format: name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'epub',
          fileSize: file.size ?? 0,
          hash,
          ownerPeerId: peerId || 'me',
          isPublic: true,
          localPath,
          addedAt: Date.now(),
          seedCount: 1,
        };

        await Storage.saveBook(newBook);
        await load();
        Alert.alert('Importé', `"${newBook.title}" ajouté à ta bibliothèque.`);
      }
    } catch (err) {
      Alert.alert('Erreur', "Impossible d'importer ce fichier.");
    }
  };

  const renderItem = ({ item }: { item: BookMetadata }) => {
    const catColor = CategoryColors[item.category] ?? C.muted;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/book/${item.id}`)}
        activeOpacity={0.75}
      >
        <View style={[styles.cover, { backgroundColor: catColor + '33' }]}>
          <BookIcon size={28} color={catColor} />
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.author}>{item.author}</Text>
          <Text style={styles.meta}>{item.format.toUpperCase()} • {formatSize(item.fileSize)}</Text>
        </View>
        {/* Seeding badge */}
        {item.isPublic && (
          <View style={styles.seedBadge}>
            <Radio size={12} color={C.success} />
            <Text style={styles.seedText}>Seeding</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={books}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.tint} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <BookIcon size={52} color={C.border} />
            <Text style={styles.emptyTitle}>Bibliothèque vide</Text>
            <Text style={styles.emptySubtitle}>Importe un PDF ou EPUB pour commencer à partager</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={importBook}>
        <Plus size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
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
    width: 48,
    height: 64,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  title: { color: C.text, fontSize: 14, fontWeight: '700' },
  author: { color: C.muted, fontSize: 12, marginTop: 2 },
  meta: { color: C.muted, fontSize: 11, marginTop: 4 },
  seedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.success + '22',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.success + '44',
    marginLeft: 8,
  },
  seedText: { color: C.success, fontSize: 10, fontWeight: '700' },
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
  empty: { marginTop: 80, alignItems: 'center', gap: 10 },
  emptyTitle: { color: C.text, fontSize: 17, fontWeight: 'bold' },
  emptySubtitle: { color: C.muted, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
});
