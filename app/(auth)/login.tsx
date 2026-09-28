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

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    if (!isSupabaseConfigured) {
      setError('Supabase is not configured yet. See README to add your project keys.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.brandWrap}>
            <Text style={styles.brand}>MediGo</Text>
            <Text style={styles.tagline}>Medicines delivered across Chandigarh</Text>
          </View>

          <Text style={styles.heading}>Welcome back</Text>

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
            placeholder="Your password"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button title="Log in" onPress={onSubmit} loading={loading} />

          <View style={styles.footer}>
            <Text style={styles.muted}>New to MediGo? </Text>
            <Link href="/(auth)/register" style={styles.link}>
              Create an account
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
  brandWrap: { alignItems: 'center', marginBottom: spacing.xxl },
  brand: { fontSize: 40, fontWeight: '800', color: colors.primary },
  tagline: { color: colors.textMuted, marginTop: spacing.xs },
  heading: { fontSize: font.h2, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  error: { color: colors.danger, marginBottom: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  muted: { color: colors.textMuted },
  link: { color: colors.primary, fontWeight: '700' },
});
