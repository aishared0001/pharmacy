import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ProductCard from '../../components/ProductCard';
import { EmptyState, Loading } from '../../components/ui';
import { fetchCategories, fetchProducts } from '../../lib/api';
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(typeof q === 'string' ? q : '');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        if (isSearch) {
          const prods = await fetchProducts({ search });
          if (active) setProducts(prods);
        } else {
          const cats = await fetchCategories();
          const cat = cats.find((c) => c.slug === slug) ?? null;
          const prods = cat ? await fetchProducts({ categoryId: cat.id }) : [];
          if (active) {
            setCategory(cat);
            setProducts(prods);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug, isSearch, search]);

  useEffect(() => {
    navigation.setOptions({ title: isSearch ? 'Search' : category?.name ?? 'Category' });
  }, [navigation, isSearch, category]);

  const header = useMemo(
    () =>
      isSearch ? (
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search medicines…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
        </View>
      ) : null,
    [isSearch, search],
  );

  if (loading) return <Loading />;

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      data={products}
      keyExtractor={(p) => p.id}
      numColumns={2}
      ListHeaderComponent={header}
      contentContainerStyle={{ padding: spacing.sm, paddingBottom: spacing.xxl }}
      columnWrapperStyle={{ justifyContent: 'space-between' }}
      renderItem={({ item }) => (
        <View style={{ width: '50%' }}>
          <ProductCard product={item} />
        </View>
      )}
      ListEmptyComponent={
        <EmptyState
          title={isSearch ? 'No matches' : 'No products yet'}
          subtitle={
            isSearch ? 'Try a different medicine name or salt.' : 'Check back soon.'
          }
        />
      }
    />
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
});
