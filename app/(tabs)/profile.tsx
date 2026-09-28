import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth-store';
import { upsertProfile } from '../../lib/api';
import { Button, Card, Field } from '../../components/ui';
import { colors, font, spacing } from '../../constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const session = useAuth((s) => s.session);
  const profile = useAuth((s) => s.profile);
  const refreshProfile = useAuth((s) => s.refreshProfile);
  const signOut = useAuth((s) => s.signOut);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
  }, [profile]);

  async function onSave() {
    if (!session) return;
    setSaving(true);
    setSaved(false);
    try {
      await upsertProfile(session.user.id, { full_name: fullName.trim(), phone: phone.trim() });
      await refreshProfile();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={{ marginBottom: spacing.lg }}>
        <Text style={styles.email}>{session?.user.email}</Text>
        {profile?.is_admin ? <Text style={styles.adminTag}>Admin account</Text> : null}
      </Card>

      <Text style={styles.section}>Your details</Text>
      <Field label="Full name" value={fullName} onChangeText={setFullName} />
      <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      {saved ? <Text style={styles.saved}>Saved.</Text> : null}
      <Button title="Save changes" onPress={onSave} loading={saving} />

      {profile?.is_admin ? (
        <Pressable style={styles.adminRow} onPress={() => router.push('/admin')}>
          <Ionicons name="construct-outline" size={20} color={colors.primary} />
          <Text style={styles.adminRowText}>Open admin panel</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}

      <View style={{ height: spacing.xl }} />
      <Button title="Log out" variant="danger" onPress={signOut} />

      <Text style={styles.disclaimer}>
        MediGo is a demo pharmacy app for the Chandigarh area. Information shown is general
        and not a substitute for advice from a doctor or pharmacist.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  email: { fontSize: font.h3, fontWeight: '700', color: colors.text },
  adminTag: { color: colors.primary, marginTop: spacing.xs, fontWeight: '600' },
  section: { fontSize: font.h3, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  saved: { color: colors.success, marginBottom: spacing.sm },
  adminRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  adminRowText: { flex: 1, fontWeight: '700', color: colors.text },
  disclaimer: {
    marginTop: spacing.xxl,
    color: colors.textMuted,
    fontSize: font.small,
    lineHeight: 19,
  },
});
