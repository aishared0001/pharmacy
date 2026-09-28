import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Button, Field } from '../../components/ui';
import { colors, font, spacing } from '../../constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setNotice(null);
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured yet. See README to add your project keys.');
      return;
    }
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill in your name, email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), phone: phone.trim() },
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // If email confirmation is on, there is no active session yet.
    if (data.session) {
      router.replace('/(tabs)');
    } else {
      setNotice('Account created. Please check your email to confirm, then log in.');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.brand}>Create your account</Text>
          <Text style={styles.tagline}>Order medicines for delivery in Chandigarh</Text>

          <View style={{ height: spacing.xl }} />

          <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your name" />
          <Field
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="10-digit mobile number"
          />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="At least 6 characters"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}

          <Button title="Sign up" onPress={onSubmit} loading={loading} />

          <View style={styles.footer}>
            <Text style={styles.muted}>Already have an account? </Text>
            <Link href="/(auth)/login" style={styles.link}>
              Log in
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, flexGrow: 1, justifyContent: 'center' },
  brand: { fontSize: font.h1, fontWeight: '800', color: colors.primary },
  tagline: { color: colors.textMuted, marginTop: spacing.xs },
  error: { color: colors.danger, marginBottom: spacing.md },
  notice: { color: colors.success, marginBottom: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  muted: { color: colors.textMuted },
  link: { color: colors.primary, fontWeight: '700' },
});
