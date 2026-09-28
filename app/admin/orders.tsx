import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { EmptyState, Loading } from '../../components/ui';
import { useAuth } from '../../lib/auth-store';
import { fetchAllOrders, updateOrderStatus } from '../../lib/api';
import type { Order, OrderStatus } from '../../lib/types';
import { colors, font, radius, spacing } from '../../constants/theme';
import { formatINR, formatDateTime } from '../../lib/format';

const NEXT: Record<OrderStatus, OrderStatus | null> = {
  placed: 'confirmed',
  confirmed: 'out_for_delivery',
  out_for_delivery: 'delivered',
  delivered: null,
  cancelled: null,
};

const LABEL: Record<OrderStatus, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function AdminOrders() {
  const profile = useAuth((s) => s.profile);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setOrders(await fetchAllOrders());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function advance(order: Order) {
    const next = NEXT[order.status];
    if (!next) return;
    await updateOrderStatus(order.id, next);
    load();
  }

  if (!profile?.is_admin) return <EmptyState title="Admins only" />;
  if (loading) return <Loading />;

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      data={orders}
      keyExtractor={(o) => o.id}
      contentContainerStyle={{ padding: spacing.lg }}
      renderItem={({ item }) => {
        const next = NEXT[item.status];
        return (
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.orderId}>#{item.id.slice(0, 8).toUpperCase()}</Text>
              <Text style={styles.status}>{LABEL[item.status]}</Text>
            </View>
            <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
            <Text style={styles.addr}>
              {item.full_name} • {item.phone}
            </Text>
            <Text style={styles.addr}>
              {item.address_line1}
              {item.address_line2 ? `, ${item.address_line2}` : ''}, {item.city} - {item.pincode}
            </Text>
            {item.prescription_url ? <Text style={styles.rx}>Prescription attached</Text> : null}
            <View style={styles.rowBetween}>
              <Text style={styles.total}>{formatINR(item.total)} • COD</Text>
              {next ? (
                <Pressable style={styles.advanceBtn} onPress={() => advance(item)}>
                  <Text style={styles.advanceText}>Mark {LABEL[next]}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      }}
      ListEmptyComponent={<EmptyState title="No orders yet" />}
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
    gap: 4,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xs },
  orderId: { fontWeight: '800', color: colors.text },
  status: { color: colors.primary, fontWeight: '700', fontSize: font.small },
  date: { color: colors.textMuted, fontSize: font.small },
  addr: { color: colors.textMuted, fontSize: font.small },
  rx: { color: colors.rxBadge, fontSize: font.small, fontWeight: '600' },
  total: { fontWeight: '800', color: colors.text },
  advanceBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  advanceText: { color: '#fff', fontWeight: '700', fontSize: font.small },
});
