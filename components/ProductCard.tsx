import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import ProductArt from './ProductArt';
import { Badge } from './ui';
import type { Product } from '../lib/types';
import { colors, font, radius, shadow, spacing } from '../constants/theme';
import { formatINR, discountPercent } from '../lib/format';
import { useCart } from '../lib/cart-store';

// A single catalogue card: image/illustration, name, short description snippet,
// price and an add-to-cart control.
function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const qty = useCart((s) => s.lines[product.id]?.quantity ?? 0);
  const setQty = useCart((s) => s.setQty);
  const disc = discountPercent(product.mrp, product.price);

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/product/${product.id}`)}
    >
      <View style={styles.imageWrap}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.image} contentFit="cover" />
        ) : (
          <ProductArt form={product.form} size={96} />
        )}
        {product.prescription_required ? (
          <View style={styles.rxCorner}>
            <Badge text="Rx" tone="rx" />
          </View>
        ) : null}
      </View>

      <Text numberOfLines={2} style={styles.name}>
        {product.name}
      </Text>
      {product.description ? (
        <Text numberOfLines={2} style={styles.snippet}>
          {product.description}
        </Text>
      ) : null}
      {product.pack_size ? <Text style={styles.pack}>{product.pack_size}</Text> : null}

      <View style={styles.priceRow}>
        <Text style={styles.price}>{formatINR(product.price)}</Text>
        {disc > 0 ? <Text style={styles.mrp}>{formatINR(product.mrp)}</Text> : null}
        {disc > 0 ? <Text style={styles.disc}>{disc}% off</Text> : null}
      </View>

      {qty === 0 ? (
        <Pressable style={styles.addBtn} onPress={() => add(product)}>
          <Text style={styles.addBtnText}>ADD</Text>
        </Pressable>
      ) : (
        <View style={styles.stepper}>
          <Pressable style={styles.stepBtn} onPress={() => setQty(product.id, qty - 1)}>
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Text style={styles.qty}>{qty}</Text>
          <Pressable style={styles.stepBtn} onPress={() => setQty(product.id, qty + 1)}>
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    margin: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  imageWrap: { alignItems: 'center', marginBottom: spacing.sm, position: 'relative' },
  image: { width: 96, height: 96, borderRadius: radius.md },
  rxCorner: { position: 'absolute', top: 0, left: 0 },
  name: { fontSize: font.small, fontWeight: '700', color: colors.text, minHeight: 34 },
  snippet: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2, minHeight: 28 },
  pack: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, flexWrap: 'wrap' },
  price: { fontSize: font.body, fontWeight: '800', color: colors.text },
  mrp: { fontSize: font.tiny, color: colors.textMuted, textDecorationLine: 'line-through' },
  disc: { fontSize: font.tiny, color: colors.accent, fontWeight: '700' },
  addBtn: {
    marginTop: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  addBtnText: { color: colors.primary, fontWeight: '800', fontSize: font.small },
  stepper: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  stepBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  stepText: { color: '#fff', fontSize: font.h3, fontWeight: '800' },
  qty: { color: '#fff', fontWeight: '800', fontSize: font.body },
});

export default ProductCard;
