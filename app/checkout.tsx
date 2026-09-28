import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Field } from '../components/ui';
import { useAuth } from '../lib/auth-store';
import {
  useCart,
  cartLines,
  cartSubtotal,
  cartDeliveryFee,
  cartNeedsPrescription,
} from '../lib/cart-store';
import { placeOrder } from '../lib/api';
import { uploadPrescription } from '../lib/storage';
import { isChandigarhPincode, OUT_OF_AREA_MESSAGE, CITY_NAME } from '../constants/chandigarh';
import { colors, font, radius, spacing } from '../constants/theme';
import { formatINR } from '../lib/format';

export default function CheckoutScreen() {
  const router = useRouter();
  const session = useAuth((s) => s.session);
  const profile = useAuth((s) => s.profile);

  const lines = useCart(cartLines);
  const clear = useCart((s) => s.clear);
  const subtotal = cartSubtotal(lines);
  const deliveryFee = cartDeliveryFee(subtotal);
  const total = subtotal + deliveryFee;
  const needsRx = cartNeedsPrescription(lines);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [landmark, setLandmark] = useState('');
  const [pincode, setPincode] = useState('');
  const [rxImage, setRxImage] = useState<string | null>(null);

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
  }, [profile]);

  // Guard: if cart empties (e.g. after placing), leave.
  useEffect(() => {
    if (lines.length === 0 && !placing) router.replace('/(tabs)/cart');
  }, [lines.length, placing, router]);

  async function pickPrescription() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Photo permission is needed to attach a prescription.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setRxImage(result.assets[0].uri);
      setError(null);
    }
  }

  function validate(): string | null {
    if (!fullName.trim()) return 'Please enter your full name.';
    if (!/^\d{10}$/.test(phone.trim())) return 'Enter a valid 10-digit phone number.';
    if (!line1.trim()) return 'Please enter your address.';
    if (!isChandigarhPincode(pincode)) return OUT_OF_AREA_MESSAGE;
    if (needsRx && !rxImage) return 'Please attach a prescription for the Rx medicines in your cart.';
    return null;
  }

  async function onPlaceOrder() {
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    if (!session) {
      setError('Please log in again.');
      return;
    }
    setPlacing(true);
    try {
      let prescriptionUrl: string | null = null;
      if (needsRx && rxImage) {
        prescriptionUrl = await uploadPrescription(session.user.id, rxImage);
      }
      const order = await placeOrder({
        userId: session.user.id,
        lines,
        subtotal,
        deliveryFee,
        prescriptionUrl,
        address: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          address_line1: line1.trim(),
          address_line2: line2.trim() || undefined,
          landmark: landmark.trim() || undefined,
          pincode: pincode.trim(),
        },
      });
      clear();
      router.replace(`/order/${order.id}?justPlaced=1`);
    } catch (e: any) {
      setPlacing(false);
      setError(e?.message ?? 'Could not place the order. Please try again.');
    }
  }

  const pinValid = pincode.length === 0 || isChandigarhPincode(pincode);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 160 }}>
        <View style={styles.areaBanner}>
          <Ionicons name="location" size={16} color={colors.primaryDark} />
          <Text style={styles.areaText}>We deliver only within {CITY_NAME} (PIN 160001–160104).</Text>
        </View>

        <Text style={styles.section}>Delivery address</Text>
        <Field label="Full name" value={fullName} onChangeText={setFullName} />
        <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="10-digit mobile" />
        <Field label="House / Flat / Street" value={line1} onChangeText={setLine1} />
        <Field label="Area / Sector (optional)" value={line2} onChangeText={setLine2} />
        <Field label="Landmark (optional)" value={landmark} onChangeText={setLandmark} />
        <Field
          label="PIN code"
          value={pincode}
          onChangeText={setPincode}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="160XXX"
          error={!pinValid ? OUT_OF_AREA_MESSAGE : null}
        />

        {needsRx ? (
          <Card style={{ marginBottom: spacing.lg }}>
            <Text style={styles.rxTitle}>Prescription required</Text>
            <Text style={styles.rxText}>
              Your cart includes prescription medicines. Please attach a clear photo of a valid
              prescription.
            </Text>
            {rxImage ? (
              <View style={styles.rxPreviewWrap}>
                <Image source={{ uri: rxImage }} style={styles.rxPreview} contentFit="cover" />
                <Pressable onPress={pickPrescription}>
                  <Text style={styles.changeLink}>Change</Text>
                </Pressable>
              </View>
            ) : (
              <Button title="Attach prescription" variant="secondary" onPress={pickPrescription} />
            )}
          </Card>
        ) : null}

        <Text style={styles.section}>Payment</Text>
        <View style={styles.payRow}>
          <Ionicons name="cash-outline" size={22} color={colors.primary} />
          <Text style={styles.payText}>Cash on Delivery</Text>
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
        </View>

        <Text style={styles.section}>Order summary</Text>
        <View style={styles.summary}>
          <SummaryRow label={`Items (${lines.length})`} value={formatINR(subtotal)} />
          <SummaryRow label="Delivery" value={deliveryFee === 0 ? 'FREE' : formatINR(deliveryFee)} />
          <View style={styles.divider} />
          <SummaryRow label="To pay" value={formatINR(total)} bold />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <View style={styles.footer}>
        <View>
          <Text style={styles.footerTotal}>{formatINR(total)}</Text>
          <Text style={styles.footerLabel}>Pay on delivery</Text>
        </View>
        <Button title="Place order" onPress={onPlaceOrder} loading={placing} style={{ flex: 1 }} />
      </View>
    </KeyboardAvoidingView>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.summaryValue, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  areaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  areaText: { color: colors.primaryDark, fontSize: font.small, flex: 1 },
  section: { fontSize: font.h3, fontWeight: '800', color: colors.text, marginBottom: spacing.md, marginTop: spacing.sm },
  rxTitle: { fontWeight: '800', color: colors.rxBadge, marginBottom: spacing.xs },
  rxText: { color: colors.textMuted, fontSize: font.small, marginBottom: spacing.md },
  rxPreviewWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rxPreview: { width: 80, height: 80, borderRadius: radius.sm },
  changeLink: { color: colors.primary, fontWeight: '700' },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.sm,
  },
  payText: { flex: 1, fontWeight: '700', color: colors.text },
  summary: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  summaryLabel: { color: colors.textMuted },
  summaryValue: { color: colors.text },
  bold: { fontWeight: '800', color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  error: { color: colors.danger, marginTop: spacing.lg, fontWeight: '600' },
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
