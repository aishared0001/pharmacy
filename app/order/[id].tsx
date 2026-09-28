import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, EmptyState, Loading } from '../../components/ui';
import { fetchOrder } from '../../lib/api';
import type { Order } from '../../lib/types';
import { colors, font, radius, spacing } from '../../constants/theme';
import { formatINR, formatDateTime } from '../../lib/format';

export default function OrderDetailScreen() {
  const { id, justPlaced } = useLocalSearchParams<{ id: string; justPlaced?: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const o = await fetchOrder(String(id));
        if (active) setOrder(o);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <Loading />;
  if (!order) return <EmptyState title="Order not found" />;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg }}>
      {justPlaced ? (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={40} color={colors.success} />
          <Text style={styles.successTitle}>Order placed!</Text>
          <Text style={styles.successText}>
            We’ve emailed a confirmation and notified the pharmacy. You’ll pay cash on delivery.
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.orderId}>Order #{order.id.slice(0, 8).toUpperCase()}</Text>
        <Text style={styles.date}>{formatDateTime(order.created_at)}</Text>

        <Text style={styles.section}>Items</Text>
        {order.order_items?.map((it) => (
          <View key={it.id} style={styles.itemRow}>
            <Text style={styles.itemName}>
              {it.name} × {it.quantity}
            </Text>
            <Text style={styles.itemPrice}>{formatINR(it.price * it.quantity)}</Text>
          </View>
        ))}

        <View style={styles.divider} />
        <Row label="Item total" value={formatINR(order.subtotal)} />
        <Row label="Delivery" value={order.delivery_fee === 0 ? 'FREE' : formatINR(order.delivery_fee)} />
        <Row label="Paid via" value="Cash on Delivery" />
        <View style={styles.divider} />
        <Row label="Total" value={formatINR(order.total)} bold />
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Delivery address</Text>
        <Text style={styles.addrName}>{order.full_name} • {order.phone}</Text>
        <Text style={styles.addr}>
          {order.address_line1}
          {order.address_line2 ? `, ${order.address_line2}` : ''}
          {order.landmark ? `, near ${order.landmark}` : ''}
        </Text>
        <Text style={styles.addr}>
          {order.city} - {order.pincode}
        </Text>
      </View>

      <Button title="Back to home" variant="secondary" onPress={() => router.replace('/(tabs)')} />
    </ScrollView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  successBanner: {
    alignItems: 'center',
    backgroundColor: '#EAF7EF',
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  successTitle: { fontSize: font.h2, fontWeight: '800', color: colors.success, marginTop: spacing.sm },
  successText: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, fontSize: font.small },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderId: { fontWeight: '800', color: colors.text, fontSize: font.h3 },
  date: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  section: { fontWeight: '800', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm, fontSize: font.body },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  itemName: { color: colors.text, flex: 1, paddingRight: spacing.md },
  itemPrice: { color: colors.text, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  rowLabel: { color: colors.textMuted },
  rowValue: { color: colors.text },
  bold: { fontWeight: '800', color: colors.text },
  addrName: { fontWeight: '700', color: colors.text, marginBottom: spacing.xs },
  addr: { color: colors.textMuted, lineHeight: 20 },
});
