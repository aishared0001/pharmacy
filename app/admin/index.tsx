import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ProductArt from '../../components/ProductArt';
import { Badge, Button, EmptyState, Loading } from '../../components/ui';
import { useAuth } from '../../lib/auth-store';
import { fetchAllProducts, deleteProduct } from '../../lib/api';
import type { Product } from '../../lib/types';
import { colors, font, radius, spacing } from '../../constants/theme';
import { formatINR } from '../../lib/format';

export default function AdminHome() {
  const router = useRouter();
  const profile = useAuth((s) => s.profile);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await fetchAllProducts());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function confirmDelete(p: Product) {
    Alert.alert('Delete product', `Remove "${p.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteProduct(p.id);
          load();
        },
      },
    ]);
  }

  if (!profile?.is_admin) {
    return (
      <EmptyState
        title="Admins only"
        subtitle="This area is restricted to store administrators."
      />
    );
  }

  if (loading) return <Loading />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.topActions}>
        <Button
          title="View all orders"
          variant="secondary"
          onPress={() => router.push('/admin/orders')}
          style={{ flex: 1 }}
        />
        <Button
          title="+ Add product"
          onPress={() => router.push('/admin/product-edit')}
          style={{ flex: 1 }}
        />
      </View>

      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.thumb}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.thumbImg} contentFit="cover" />
              ) : (
                <ProductArt form={item.form} size={48} />
              )}
            </View>
            <Pressable
              style={{ flex: 1 }}
              onPress={() => router.push({ pathname: '/admin/product-edit', params: { id: item.id } })}
            >
              <Text numberOfLines={1} style={styles.name}>
                {item.name}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.price}>{formatINR(item.price)}</Text>
                {item.prescription_required ? <Badge text="Rx" tone="rx" /> : null}
                {!item.in_stock ? <Badge text="Out of stock" tone="neutral" /> : null}
              </View>
            </Pressable>
            <Pressable onPress={() => confirmDelete(item)} hitSlop={10}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<EmptyState title="No products" subtitle="Add your first product." />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topActions: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: { width: 48, height: 48 },
  thumbImg: { width: 48, height: 48, borderRadius: radius.sm },
  name: { fontWeight: '700', color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 },
  price: { color: colors.text, fontWeight: '700' },
});
