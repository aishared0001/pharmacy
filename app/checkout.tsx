import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
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
import { placeOrder, fetchAddresses, createAddress } from '../lib/api';
import { uploadPrescription } from '../lib/storage';
import { isChandigarhPincode, OUT_OF_AREA_MESSAGE, CITY_NAME } from '../constants/chandigarh';
import { colors, font, radius, spacing } from '../constants/theme';
import { formatINR } from '../lib/format';
import type { Address } from '../lib/types';

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

  const [saved, setSaved] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveForLater, setSaveForLater] = useState(true);

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fillFrom(a: Address) {
    setFullName(a.full_name);
    setPhone(a.phone);
    setLine1(a.address_line1);
    setLine2(a.address_line2 ?? '');
    setLandmark(a.landmark ?? '');
    setPincode(a.pincode);
    setSelectedId(a.id);
  }

  // Load saved addresses; prefill with the default (or most recent) one.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const list = await fetchAddresses();
        if (!active) return;
        setSaved(list);
        if (list.length > 0) {
          fillFrom(list[0]);
        } else {
          setFullName(profile?.full_name ?? '');
          setPhone(profile?.phone ?? '');
        }
      } catch {
        setFullName(profile?.full_name ?? '');
        setPhone(profile?.phone ?? '');
      }
    })();
    return () => {
      active = false;
    };
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

  function currentMatchesSaved(): boolean {
    return saved.some(
      (a) =>
        a.full_name === fullName.trim() &&
        a.phone === phone.trim() &&
        a.address_line1 === line1.trim() &&
        (a.address_line2 ?? '') === line2.trim() &&
        (a.landmark ?? '') === landmark.trim() &&
        a.pincode === pincode.trim(),
    );
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
      // Save this address for next time (skip if it duplicates a saved one).
      if (saveForLater && !currentMatchesSaved()) {
        try {
          await createAddress(session.user.id, {
            full_name: fullName.trim(),
            phone: phone.trim(),
            address_line1: line1.trim(),
            address_line2: line2.trim() || null,
            landmark: landmark.trim() || null,
            pincode: pincode.trim(),
            is_default: saved.length === 0,
          });
        } catch {
          // Non-fatal: the order is already placed.
        }
      }

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

        {saved.length > 0 ? (
          <>
            <Text style={styles.section}>Saved addresses</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.sm }}
            >
              {saved.map((a) => {
                const active = a.id === selectedId;
                return (
                  <Pressable
                    key={a.id}
                    onPress={() => fillFrom(a)}
                    style={[styles.savedCard, active && styles.savedCardActive]}
                  >
                    <View style={styles.savedCardHead}>
                      <Text style={styles.savedName} numberOfLines={1}>
                        {a.full_name}
                      </Text>
                      {a.is_default ? <Text style={styles.defaultTag}>Default</Text> : null}
                    </View>
                    <Text style={styles.savedLine} numberOfLines={2}>
                      {a.address_line1}
                      {a.address_line2 ? `, ${a.address_line2}` : ''}
                    </Text>
                    <Text style={styles.savedLine}>
                      {a.city} - {a.pincode}
                    </Text>
                    {active ? (
                      <View style={styles.savedCheck}>
                        <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              onPress={() => {
                setSelectedId(null);
                setFullName(profile?.full_name ?? '');
                setPhone(profile?.phone ?? '');
                setLine1('');
                setLine2('');
                setLandmark('');
                setPincode('');
              }}
              style={styles.newAddrBtn}
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={styles.newAddrText}>Use a new address</Text>
            </Pressable>
          </>
        ) : null}

        <Text style={styles.section}>Delivery address</Text>
        <Field label="Full name" value={fullName} onChangeText={(t) => { setFullName(t); setSelectedId(null); }} />
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

        <View style={styles.saveRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.saveLabel}>Save this address for next time</Text>
            <Text style={styles.saveHint}>Reuse it at checkout without retyping.</Text>
          </View>
          <Switch
            value={saveForLater}
            onValueChange={setSaveForLater}
            trackColor={{ true: colors.primary }}
          />
        </View>

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
  savedCard: {
    width: 220,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
  },
  savedCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  savedCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  savedName: { fontWeight: '700', color: colors.text, flex: 1 },
  defaultTag: { fontSize: font.tiny, color: colors.primary, fontWeight: '700' },
  savedLine: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  savedCheck: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  newAddrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  newAddrText: { color: colors.primary, fontWeight: '700', fontSize: font.small },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  saveLabel: { fontWeight: '700', color: colors.text },
  saveHint: { color: colors.textMuted, fontSize: font.tiny, marginTop: 2 },
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
