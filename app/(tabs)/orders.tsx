import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState, Loading } from '../../components/ui';
import { fetchMyOrders } from '../../lib/api';
import type { Order, OrderStatus } from '../../lib/types';
import { colors, font, radius, spacing } from '../../constants/theme';
import { formatINR, formatDateTime } from '../../lib/format';

const statusLabel: Record<OrderStatus, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const statusColor: Record<OrderStatus, string> = {
  placed: colors.accent,
  confirmed: colors.primary,
  out_for_delivery: colors.primary,
  delivered: colors.success,
  cancelled: colors.danger,
};

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const data = await fetchMyOrders();
          if (active) setOrders(data);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  if (loading) return <Loading />;

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      data={orders}
      keyExtractor={(o) => o.id}
      contentContainerStyle={{ padding: spacing.lg }}
      renderItem={({ item }) => {
        const itemCount = item.order_items?.reduce((n, i) => n + i.quantity, 0) ?? 0;
        return (
          <Pressable style={styles.card} onPress={() => router.push(`/order/${item.id}`)}>
            <View style={styles.rowBetween}>
              <Text style={styles.orderId}>Order #{item.id.slice(0, 8).toUpperCase()}</Text>
              <View style={[styles.status, { backgroundColor: statusColor[item.status] }]}>
                <Text style={styles.statusText}>{statusLabel[item.status]}</Text>
              </View>
            </View>
            <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
            <View style={styles.rowBetween}>
              <Text style={styles.meta}>
                {itemCount} item{itemCount === 1 ? '' : 's'} • COD
              </Text>
              <Text style={styles.total}>{formatINR(item.total)}</Text>
            </View>
          </Pressable>
        );
      }}
      ListEmptyComponent={
        <EmptyState title="No orders yet" subtitle="Your placed orders will appear here." />
      }
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontWeight: '800', color: colors.text, fontSize: font.body },
  status: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  statusText: { color: '#fff', fontSize: font.tiny, fontWeight: '700' },
  date: { color: colors.textMuted, fontSize: font.small, marginVertical: spacing.sm },
  meta: { color: colors.textMuted, fontSize: font.small },
  total: { fontWeight: '800', color: colors.text, fontSize: font.body },
});
