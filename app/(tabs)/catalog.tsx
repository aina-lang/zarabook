import React, { useState, useEffect, useCallback } from 'react';
import {
  View, FlatList, StyleSheet, TextInput, TouchableOpacity,
  Text, ScrollView, RefreshControl, Dimensions,
} from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withSpring, 
  useSharedValue, 
  useAnimatedScrollHandler,
  interpolate,
  Extrapolate,
  SharedValue
} from 'react-native-reanimated';
import { Storage, BookMetadata } from '@/core/storage/storage';
import { Colors, CategoryColors, CATEGORIES } from '@/constants/theme';
import { Search, Download, Users } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const C = Colors.dark;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHIP_WIDTH = 100;
const CHIP_MARGIN = 8;
const FULL_CHIP_WIDTH = CHIP_WIDTH + CHIP_MARGIN;
const SPACER_WIDTH = (SCREEN_WIDTH - CHIP_WIDTH) / 2;

function CategoryChip({ 
  item, 
  index,
  active, 
  scrollX,
  onPress 
}: { 
  item: string | null; 
  index: number;
  active: boolean; 
  scrollX: SharedValue<number>;
  onPress: () => void 
}) {
  const color = item ? CategoryColors[item] : C.tint;
  
  const animatedStyle = useAnimatedStyle(() => {
    // Distance from the center of the viewport
    // Since we have a spacer at the start, the 0-th item is at scrollX = 0
    const step = index * FULL_CHIP_WIDTH;
    const scale = interpolate(
      scrollX.value,
      [step - FULL_CHIP_WIDTH, step, step + FULL_CHIP_WIDTH],
      [1, 1.25, 1],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ scale }],
      backgroundColor: active ? color + '33' : C.card,
      borderColor: active ? color : C.border,
    };
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View style={[styles.chip, { width: CHIP_WIDTH }, animatedStyle]}>
        <Text 
          style={[
            styles.chipText, 
            active && { color, fontWeight: '700' }
          ]}
          numberOfLines={1}
        >
          {item ?? 'Tous'}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function BookCard({ item, onPress }: { item: BookMetadata; onPress: () => void }) {
  const catColor = CategoryColors[item.category] ?? C.muted;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      {/* Cover block */}
      <View style={[styles.cover, { backgroundColor: catColor + '33' }]}>
        <Text style={[styles.coverLetter, { color: catColor }]}>
          {item.title.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.row}>
          <View style={[styles.categoryChip, { backgroundColor: catColor + '22', borderColor: catColor + '55' }]}>
            <Text style={[styles.categoryText, { color: catColor }]}>{item.category}</Text>
          </View>
          <Text style={styles.format}>{item.format.toUpperCase()}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.author} numberOfLines={1}>{item.author}</Text>
        <View style={[styles.row, { marginTop: 6 }]}>
          <View style={styles.stat}>
            <Users size={11} color={C.success} />
            <Text style={[styles.statText, { color: C.success }]}>
              {item.seedCount ?? 0} seeds
            </Text>
          </View>
          <Text style={styles.size}>{formatSize(item.fileSize)}</Text>
        </View>
      </View>

      {/* Download button */}
      <TouchableOpacity style={styles.dlBtn} onPress={onPress}>
        <Download size={18} color={C.tint} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function BrowseScreen() {
  const [allBooks, setAllBooks] = useState<BookMetadata[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const scrollX = useSharedValue(0);
  const flatListRef = React.useRef<FlatList>(null);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const onMomentumScrollEnd = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / FULL_CHIP_WIDTH);
    const categories = [null, ...CATEGORIES];
    if (categories[index] !== undefined) {
      setActiveCategory(categories[index]);
    }
  };

  const load = useCallback(async () => {
    const bookMap = await Storage.getBooks();
    // Browse shows remote books (without localPath)
    const remote = Object.values(bookMap).filter(b => !b.localPath);
    remote.sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
    setAllBooks(remote);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const filtered = allBooks.filter(b => {
    const matchCat = !activeCategory || b.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
    return matchCat && matchSearch;
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

      {/* Category filters */}
      <View style={{ height: 75, marginBottom: 4 }}>
        <Animated.FlatList
          ref={flatListRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[null, ...CATEGORIES]}
          keyExtractor={item => item ?? 'all'}
          contentContainerStyle={{
            paddingLeft: SPACER_WIDTH,
            paddingRight: SPACER_WIDTH,
            height: 75,
            alignItems: 'center',
          }}
          snapToInterval={FULL_CHIP_WIDTH}
          decelerationRate="fast"
          onScroll={onScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={onMomentumScrollEnd}
          renderItem={({ item, index }) => (
            <CategoryChip 
              item={item} 
              index={index}
              active={activeCategory === item} 
              scrollX={scrollX}
              onPress={() => {
                setActiveCategory(item);
                flatListRef.current?.scrollToOffset({
                  offset: index * FULL_CHIP_WIDTH,
                  animated: true,
                });
              }} 
            />
          )}
        />
      </View>

      {/* Book list */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <BookCard item={item} onPress={() => router.push(`/book/${item.id}`)} />
        )}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.tint} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aucun livre trouvé</Text>
            <Text style={styles.emptySubtitle}>
              {allBooks.length === 0
                ? 'Connecte-toi à des pairs pour voir leur catalogue'
                : 'Essaie un autre filtre'}
            </Text>
          </View>
        }
      />
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
  format: { color: C.muted, fontSize: 10, fontWeight: '600' },
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
