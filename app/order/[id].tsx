import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, EmptyState, Loading } from '../../components/ui';
import { fetchOrder, fetchProductsByIds } from '../../lib/api';
import { useCart } from '../../lib/cart-store';
import type { Order, OrderStatus } from '../../lib/types';
import { colors, font, radius, spacing } from '../../constants/theme';
import { formatINR, formatDateTime } from '../../lib/format';

const STEPS: { key: OrderStatus; label: string; icon: any }[] = [
  { key: 'placed', label: 'Placed', icon: 'receipt-outline' },
  { key: 'confirmed', label: 'Confirmed', icon: 'checkmark-done-outline' },
  { key: 'out_for_delivery', label: 'Out for delivery', icon: 'bicycle-outline' },
  { key: 'delivered', label: 'Delivered', icon: 'home-outline' },
];

function StatusTracker({ status }: { status: OrderStatus }) {
  if (status === 'cancelled') {
    return (
      <View style={[styles.card, styles.cancelled]}>
        <Ionicons name="close-circle" size={22} color={colors.danger} />
        <Text style={styles.cancelledText}>This order was cancelled.</Text>
      </View>
    );
  }
  const currentIndex = STEPS.findIndex((s) => s.key === status);
  return (
    <View style={styles.card}>
      <Text style={styles.section}>Order status</Text>
      <View style={styles.tracker}>
        {STEPS.map((step, i) => {
          const done = i <= currentIndex;
          return (
            <View key={step.key} style={styles.step}>
              <View style={styles.stepTop}>
                <View style={[styles.line, i === 0 && styles.lineHidden, done && styles.lineDone]} />
                <View style={[styles.dot, done && styles.dotDone]}>
                  <Ionicons name={step.icon} size={16} color={done ? '#fff' : colors.textMuted} />
                </View>
                <View
                  style={[
                    styles.line,
                    i === STEPS.length - 1 && styles.lineHidden,
                    i < currentIndex && styles.lineDone,
                  ]}
                />
              </View>
              <Text style={[styles.stepLabel, done && styles.stepLabelDone]}>{step.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function OrderDetailScreen() {
  const { id, justPlaced } = useLocalSearchParams<{ id: string; justPlaced?: string }>();
  const router = useRouter();
  const addToCart = useCart((s) => s.add);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);

  async function onReorder() {
    if (!order?.order_items?.length) return;
    setReordering(true);
    try {
      const ids = order.order_items
        .map((it) => it.product_id)
        .filter((x): x is string => !!x);
      const products = await fetchProductsByIds(ids);
      const byId = new Map(products.map((p) => [p.id, p]));
      let added = 0;
      let missing = 0;
      for (const it of order.order_items) {
        const prod = it.product_id ? byId.get(it.product_id) : undefined;
        if (prod && prod.in_stock) {
          addToCart(prod, it.quantity);
          added += 1;
        } else {
          missing += 1;
        }
      }
      if (added === 0) {
        Alert.alert('Unavailable', 'These items are no longer available.');
      } else {
        router.push('/(tabs)/cart');
        if (missing > 0) {
          Alert.alert('Added to cart', `${missing} item(s) are no longer available and were skipped.`);
        }
      }
    } catch {
      Alert.alert('Could not reorder', 'Please try again.');
    } finally {
      setReordering(false);
    }
  }

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

      <StatusTracker status={order.status} />

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

      <Button title="Reorder these items" onPress={onReorder} loading={reordering} />
      <View style={{ height: spacing.md }} />
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
  tracker: { flexDirection: 'row', marginTop: spacing.xs },
  step: { flex: 1, alignItems: 'center' },
  stepTop: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' },
  line: { flex: 1, height: 3, backgroundColor: colors.border },
  lineHidden: { backgroundColor: 'transparent' },
  lineDone: { backgroundColor: colors.primary },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepLabel: { fontSize: font.tiny, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  stepLabelDone: { color: colors.text, fontWeight: '700' },
  cancelled: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cancelledText: { color: colors.danger, fontWeight: '700' },
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
