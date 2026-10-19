import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ProductCard from '../../components/ProductCard';
import CartBar from '../../components/CartBar';
import { EmptyState, Loading } from '../../components/ui';
import { fetchCategories, fetchProducts, type ProductSort, type RxFilter } from '../../lib/api';
import type { Category, Product } from '../../lib/types';
import { colors, font, radius, spacing } from '../../constants/theme';

// This screen doubles as the search results screen when slug === 'search'
// (the home search bar routes here with a `q` param).
export default function CategoryScreen() {
  const { slug, q } = useLocalSearchParams<{ slug: string; q?: string }>();
  const navigation = useNavigation();
  const isSearch = slug === 'search';

  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(typeof q === 'string' ? q : '');
  const [sort, setSort] = useState<ProductSort>('name');
  const [rx, setRx] = useState<RxFilter>('all');

  // Resolve the category once (for the category view).
  useEffect(() => {
    let active = true;
    if (isSearch) return;
    (async () => {
      const cats = await fetchCategories();
      const cat = cats.find((c) => c.slug === slug) ?? null;
      if (active) {
        setCategory(cat);
        setCategoryId(cat?.id ?? null);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug, isSearch]);

  // Load products whenever filters change.
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const prods = await fetchProducts(
          isSearch
            ? { search, sort, rx }
            : categoryId
            ? { categoryId, sort, rx }
            : undefined,
        );
        if (active) setProducts(categoryId || isSearch ? prods : []);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isSearch, search, sort, rx, categoryId]);

  useEffect(() => {
    navigation.setOptions({ title: isSearch ? 'Search' : category?.name ?? 'Category' });
  }, [navigation, isSearch, category]);

  const header = useMemo(
    () => (
      <View>
        {isSearch ? (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by medicine, salt or symptom…"
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Chip label="Sort: Name" active={sort === 'name'} onPress={() => setSort('name')} />
          <Chip label="Price ↑" active={sort === 'price_asc'} onPress={() => setSort('price_asc')} />
          <Chip label="Price ↓" active={sort === 'price_desc'} onPress={() => setSort('price_desc')} />
          <View style={styles.sep} />
          <Chip label="All" active={rx === 'all'} onPress={() => setRx('all')} />
          <Chip label="No prescription" active={rx === 'otc'} onPress={() => setRx('otc')} />
          <Chip label="Prescription" active={rx === 'rx'} onPress={() => setRx('rx')} tone="rx" />
        </ScrollView>
      </View>
    ),
    [isSearch, search, sort, rx],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        numColumns={2}
        ListHeaderComponent={header}
        contentContainerStyle={{ padding: spacing.sm, paddingBottom: 96 }}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        renderItem={({ item }) => (
          <View style={{ width: '50%' }}>
            <ProductCard product={item} />
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <Loading />
          ) : (
            <EmptyState
              title={isSearch ? 'No matches' : 'No products'}
              subtitle={
                isSearch
                  ? 'Try a medicine name, salt (e.g. paracetamol) or symptom (e.g. fever).'
                  : 'Try changing the filters.'
              }
            />
          )
        }
      />
      <CartBar />
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
  tone,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  tone?: 'rx';
}) {
  const activeBg = tone === 'rx' ? colors.rxBadge : colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        active && { backgroundColor: activeBg, borderColor: activeBg },
      ]}
    >
      <Text style={[styles.chipText, active && { color: '#fff', fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
    margin: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: font.body, color: colors.text },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  sep: { width: 1, height: 22, backgroundColor: colors.border, marginHorizontal: 2 },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipText: { fontSize: font.small, color: colors.text },
});
