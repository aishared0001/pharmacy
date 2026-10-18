import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState, Loading } from '../components/ui';
import { useAuth } from '../lib/auth-store';
import { fetchAddresses, deleteAddress, setDefaultAddress } from '../lib/api';
import type { Address } from '../lib/types';
import { colors, font, radius, spacing } from '../constants/theme';

export default function AddressesScreen() {
  const session = useAuth((s) => s.session);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setAddresses(await fetchAddresses());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onDelete(a: Address) {
    Alert.alert('Delete address', 'Remove this saved address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteAddress(a.id);
          load();
        },
      },
    ]);
  }

  async function onMakeDefault(a: Address) {
    if (!session) return;
    await setDefaultAddress(session.user.id, a.id);
    load();
  }

  if (loading) return <Loading />;

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      data={addresses}
      keyExtractor={(a) => a.id}
      contentContainerStyle={{ padding: spacing.lg }}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.name}>{item.full_name}</Text>
            {item.is_default ? <Text style={styles.defaultTag}>Default</Text> : null}
          </View>
          <Text style={styles.line}>{item.phone}</Text>
          <Text style={styles.line}>
            {item.address_line1}
            {item.address_line2 ? `, ${item.address_line2}` : ''}
            {item.landmark ? `, near ${item.landmark}` : ''}
          </Text>
          <Text style={styles.line}>
            {item.city} - {item.pincode}
          </Text>
          <View style={styles.actions}>
            {!item.is_default ? (
              <Pressable onPress={() => onMakeDefault(item)} style={styles.actionBtn}>
                <Ionicons name="star-outline" size={16} color={colors.primary} />
                <Text style={styles.actionText}>Set default</Text>
              </Pressable>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <Pressable onPress={() => onDelete(item)} style={styles.actionBtn}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
            </Pressable>
          </View>
        </View>
      )}
      ListEmptyComponent={
        <EmptyState
          title="No saved addresses"
          subtitle="Addresses you use at checkout are saved here for next time."
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontWeight: '800', color: colors.text, fontSize: font.body },
  defaultTag: { color: colors.primary, fontWeight: '700', fontSize: font.small },
  line: { color: colors.textMuted, marginTop: 2 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { color: colors.primary, fontWeight: '700', fontSize: font.small },
});
