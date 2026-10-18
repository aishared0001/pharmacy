import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ProductArt from '../../components/ProductArt';
import ProductCard from '../../components/ProductCard';
import { EmptyState, Loading } from '../../components/ui';
import { fetchCategories, fetchProducts } from '../../lib/api';
import { isSupabaseConfigured } from '../../lib/supabase';
import type { Category, Product, ProductForm } from '../../lib/types';
import { colors, font, radius, spacing } from '../../constants/theme';
import { CITY_NAME } from '../../constants/chandigarh';

// Illustration used for each category tile, chosen to look distinct.
const categoryForm: Record<string, ProductForm> = {
  'pain-fever': 'tablet',
  'cough-cold': 'syrup',
  allergy: 'spray',
  digestive: 'capsule',
  vitamins: 'tablet',
  diabetes: 'injection',
  'heart-bp': 'tablet',
  cholesterol: 'tablet',
  skin: 'tube',
  'eye-ear': 'drops',
  antibiotics: 'capsule',
  antifungal: 'tube',
  respiratory: 'inhaler',
  'baby-mother': 'drops',
  womens: 'tablet',
  mens: 'tablet',
  'bone-joint': 'capsule',
  neuro: 'tablet',
  thyroid: 'tablet',
  urology: 'syrup',
  oral: 'tube',
  'first-aid': 'device',
};

export default function HomeScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const [cats, prods] = await Promise.all([
        fetchCategories(),
        fetchProducts({ limit: 12 }),
      ]);
      setCategories(cats);
      setFeatured(prods);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load the catalogue.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function submitSearch() {
    const q = search.trim();
    if (q) router.push({ pathname: '/category/search', params: { q } });
  }

  if (loading) return <Loading label="Loading medicines…" />;

  if (!isSupabaseConfigured) {
    return (
      <EmptyState
        title="Setup needed"
        subtitle="Add your Supabase URL and anon key (see README), then restart the app."
      />
    );
  }

  if (error) {
    return <EmptyState title="Couldn’t load catalogue" subtitle={error} />;
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
        />
      }
    >
      <View style={styles.hero}>
        <View style={styles.locationRow}>
          <Ionicons name="location" size={16} color={colors.textInverse} />
          <Text style={styles.locationText}>Delivering in {CITY_NAME}</Text>
        </View>
        <Text style={styles.heroTitle}>Medicines at your doorstep</Text>
        <Pressable style={styles.searchBar} onPress={() => {}}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search medicines, brands, salts…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={submitSearch}
          />
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Shop by category</Text>
      <View style={styles.catGrid}>
        {categories.map((cat) => (
          <Pressable
            key={cat.id}
            style={styles.catTile}
            onPress={() => router.push(`/category/${cat.slug}`)}
          >
            <ProductArt form={categoryForm[cat.slug] ?? 'generic'} size={54} />
            <Text numberOfLines={2} style={styles.catName}>
              {cat.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Popular right now</Text>
      <FlatList
        data={featured}
        keyExtractor={(p) => p.id}
        numColumns={2}
        scrollEnabled={false}
        contentContainerStyle={{ paddingHorizontal: spacing.sm, paddingBottom: spacing.xl }}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        renderItem={({ item }) => (
          <View style={{ width: '50%' }}>
            <ProductCard product={item} />
          </View>
        )}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { color: colors.textInverse, fontWeight: '600', fontSize: font.small },
  heroTitle: {
    color: colors.textInverse,
    fontSize: font.h2,
    fontWeight: '800',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: font.body, color: colors.text },
  sectionTitle: {
    fontSize: font.h3,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
  },
  catTile: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  catName: {
    fontSize: font.tiny,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.xs,
    fontWeight: '600',
  },
});
