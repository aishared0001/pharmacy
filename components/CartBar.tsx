import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCart, cartLines, cartCount, cartSubtotal } from '../lib/cart-store';
import { colors, font, radius, spacing, shadow } from '../constants/theme';
import { formatINR } from '../lib/format';

// Floating "View cart" bar for screens that sit outside the bottom tabs
// (category listing, search results, product detail). Renders nothing when
// the cart is empty.
export default function CartBar() {
  const router = useRouter();
  const lines = useCart(cartLines);
  const count = cartCount(lines);
  const subtotal = cartSubtotal(lines);

  if (count === 0) return null;

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.bar} onPress={() => router.push('/(tabs)/cart')}>
        <View style={styles.left}>
          <Ionicons name="cart" size={20} color={colors.textInverse} />
          <Text style={styles.count}>
            {count} item{count === 1 ? '' : 's'}
          </Text>
          <Text style={styles.total}>{formatINR(subtotal)}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.cta}>View cart</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textInverse} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadow.card,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  count: { color: colors.textInverse, fontWeight: '700', fontSize: font.body },
  total: { color: colors.textInverse, fontWeight: '800', fontSize: font.body },
  right: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  cta: { color: colors.textInverse, fontWeight: '800', fontSize: font.body },
});
