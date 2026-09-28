import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ProductArt from '../../components/ProductArt';
import { Badge, Button, EmptyState } from '../../components/ui';
import {
  useCart,
  cartLines,
  cartSubtotal,
  cartDeliveryFee,
  cartNeedsPrescription,
} from '../../lib/cart-store';
import { colors, font, radius, spacing } from '../../constants/theme';
import { formatINR } from '../../lib/format';
import { FREE_DELIVERY_ABOVE } from '../../constants/theme';

export default function CartScreen() {
  const router = useRouter();
  const lines = useCart(cartLines);
  const setQty = useCart((s) => s.setQty);

  const subtotal = cartSubtotal(lines);
  const deliveryFee = cartDeliveryFee(subtotal);
  const total = subtotal + deliveryFee;
  const needsRx = cartNeedsPrescription(lines);

  if (lines.length === 0) {
    return (
      <EmptyState title="Your cart is empty" subtitle="Add medicines to see them here." />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 200 }}>
        {lines.map(({ product, quantity }) => (
          <View key={product.id} style={styles.row}>
            <View style={styles.thumb}>
              {product.image_url ? (
                <Image source={{ uri: product.image_url }} style={styles.thumbImg} contentFit="cover" />
              ) : (
                <ProductArt form={product.form} size={56} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={2} style={styles.name}>
                {product.name}
              </Text>
              {product.prescription_required ? <Badge text="Rx" tone="rx" /> : null}
              <Text style={styles.price}>{formatINR(product.price)}</Text>
            </View>
            <View style={styles.stepper}>
              <Pressable style={styles.stepBtn} onPress={() => setQty(product.id, quantity - 1)}>
                <Text style={styles.stepText}>−</Text>
              </Pressable>
              <Text style={styles.qty}>{quantity}</Text>
              <Pressable style={styles.stepBtn} onPress={() => setQty(product.id, quantity + 1)}>
                <Text style={styles.stepText}>+</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {needsRx ? (
          <View style={styles.rxNote}>
            <Ionicons name="document-attach-outline" size={18} color={colors.rxBadge} />
            <Text style={styles.rxNoteText}>
              Your cart has prescription medicines. You’ll upload a valid prescription at checkout.
            </Text>
          </View>
        ) : null}

        <View style={styles.summary}>
          <Row label="Item total" value={formatINR(subtotal)} />
          <Row
            label="Delivery fee"
            value={deliveryFee === 0 ? 'FREE' : formatINR(deliveryFee)}
          />
          {deliveryFee > 0 ? (
            <Text style={styles.freeHint}>
              Add {formatINR(FREE_DELIVERY_ABOVE - subtotal)} more for free delivery.
            </Text>
          ) : null}
          <View style={styles.divider} />
          <Row label="To pay" value={formatINR(total)} bold />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerTotal}>{formatINR(total)}</Text>
          <Text style={styles.footerLabel}>Cash on delivery</Text>
        </View>
        <Button title="Proceed to checkout" onPress={() => router.push('/checkout')} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.summaryValue, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  thumb: { width: 56, height: 56 },
  thumbImg: { width: 56, height: 56, borderRadius: radius.sm },
  name: { fontSize: font.small, fontWeight: '700', color: colors.text },
  price: { fontSize: font.body, fontWeight: '800', color: colors.text, marginTop: 2 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  stepBtn: { paddingHorizontal: spacing.md, paddingVertical: 6 },
  stepText: { color: '#fff', fontSize: font.h3, fontWeight: '800' },
  qty: { color: '#fff', fontWeight: '800', minWidth: 18, textAlign: 'center' },
  rxNote: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: '#FBEFF6',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  rxNoteText: { flex: 1, color: colors.rxBadge, fontSize: font.small },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  summaryLabel: { color: colors.textMuted, fontSize: font.body },
  summaryValue: { color: colors.text, fontSize: font.body },
  bold: { fontWeight: '800', color: colors.text },
  freeHint: { color: colors.accent, fontSize: font.small, marginBottom: spacing.sm },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  footerTotal: { fontSize: font.h3, fontWeight: '800', color: colors.text },
  footerLabel: { fontSize: font.tiny, color: colors.textMuted },
});
