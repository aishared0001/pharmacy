import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ProductArt from '../../components/ProductArt';
import { Badge, Button, EmptyState, Loading } from '../../components/ui';
import { fetchProduct } from '../../lib/api';
import type { Product } from '../../lib/types';
import { colors, font, radius, spacing } from '../../constants/theme';
import { formatINR, discountPercent } from '../../lib/format';
import { useCart } from '../../lib/cart-store';

function InfoBlock({ icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <View style={styles.block}>
      <View style={styles.blockHead}>
        <Ionicons name={icon} size={18} color={colors.primary} />
        <Text style={styles.blockTitle}>{title}</Text>
      </View>
      <Text style={styles.blockText}>{text}</Text>
    </View>
  );
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const add = useCart((s) => s.add);
  const qty = useCart((s) => (id ? s.lines[id]?.quantity ?? 0 : 0));
  const setQty = useCart((s) => s.setQty);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const p = await fetchProduct(String(id));
        if (active) setProduct(p);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <Loading />;
  if (!product) return <EmptyState title="Product not found" />;

  const disc = discountPercent(product.mrp, product.price);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <View style={styles.imageWrap}>
          {product.image_url ? (
            <Image source={{ uri: product.image_url }} style={styles.image} contentFit="cover" />
          ) : (
            <ProductArt form={product.form} size={160} />
          )}
        </View>

        <View style={styles.badges}>
          {product.prescription_required ? (
            <Badge text="Prescription required" tone="rx" />
          ) : (
            <Badge text="Over the counter" tone="otc" />
          )}
          {disc > 0 ? <Badge text={`${disc}% off`} tone="discount" /> : null}
        </View>

        <Text style={styles.name}>{product.name}</Text>
        {product.brand ? (
          <Text style={styles.brand}>
            {product.brand}
            {product.manufacturer ? ` • ${product.manufacturer}` : ''}
          </Text>
        ) : null}
        {product.pack_size ? <Text style={styles.pack}>{product.pack_size}</Text> : null}

        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatINR(product.price)}</Text>
          {disc > 0 ? <Text style={styles.mrp}>MRP {formatINR(product.mrp)}</Text> : null}
          <Text style={styles.taxNote}>(incl. of all taxes)</Text>
        </View>

        {product.description ? (
          <InfoBlock icon="information-circle-outline" title="About" text={product.description} />
        ) : null}
        {product.generic_name ? (
          <InfoBlock icon="flask-outline" title="Composition / salt" text={product.generic_name} />
        ) : null}
        {product.uses ? (
          <InfoBlock icon="medkit-outline" title="Used for" text={product.uses} />
        ) : null}
        {product.side_effects ? (
          <InfoBlock icon="warning-outline" title="Common side effects" text={product.side_effects} />
        ) : null}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            General information only — not medical advice. Always read the label and consult a
            doctor or pharmacist before use.
            {product.prescription_required
              ? ' A valid doctor’s prescription is required for this medicine at checkout.'
              : ''}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {qty === 0 ? (
          <Button title="Add to cart" onPress={() => add(product)} style={{ flex: 1 }} />
        ) : (
          <View style={styles.footerRow}>
            <View style={styles.stepper}>
              <Text style={styles.stepBtn} onPress={() => setQty(product.id, qty - 1)}>
                −
              </Text>
              <Text style={styles.qty}>{qty}</Text>
              <Text style={styles.stepBtn} onPress={() => setQty(product.id, qty + 1)}>
                +
              </Text>
            </View>
            <Button title="Go to cart" onPress={() => router.push('/(tabs)/cart')} style={{ flex: 1 }} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: { width: 180, height: 180, borderRadius: radius.md },
  badges: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  name: { fontSize: font.h2, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  brand: { color: colors.textMuted, marginTop: 2 },
  pack: { color: colors.textMuted, marginTop: 2, fontWeight: '600' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
  price: { fontSize: font.h1, fontWeight: '800', color: colors.text },
  mrp: { color: colors.textMuted, textDecorationLine: 'line-through' },
  taxNote: { color: colors.textMuted, fontSize: font.tiny },
  block: { marginTop: spacing.xl },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  blockTitle: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  blockText: { color: colors.text, lineHeight: 21, fontSize: font.body },
  disclaimer: {
    marginTop: spacing.xl,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  disclaimerText: { color: colors.primaryDark, fontSize: font.small, lineHeight: 19 },
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
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  stepBtn: { color: '#fff', fontSize: font.h2, fontWeight: '800', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  qty: { color: '#fff', fontWeight: '800', fontSize: font.body, minWidth: 20, textAlign: 'center' },
});
