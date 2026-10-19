import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../lib/auth-store';
import { registerForPushNotifications } from '../lib/notifications';
import { Loading } from '../components/ui';
import { colors } from '../constants/theme';

export default function RootLayout() {
  const init = useAuth((s) => s.init);
  const session = useAuth((s) => s.session);
  const initializing = useAuth((s) => s.initializing);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (initializing) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, segments, initializing, router]);

  // Register this device for order-update push notifications once logged in.
  useEffect(() => {
    if (session?.user?.id) registerForPushNotifications(session.user.id);
  }, [session?.user?.id]);

  // Tapping a notification opens the related order.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const orderId = (response.notification.request.content.data as any)?.orderId;
      if (orderId) router.push(`/order/${orderId}`);
    });
    return () => sub.remove();
  }, [router]);

  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Loading label="Starting MediGo…" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ title: 'Details' }} />
        <Stack.Screen name="category/[slug]" options={{ title: 'Category' }} />
        <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
        <Stack.Screen name="addresses" options={{ title: 'Saved addresses' }} />
        <Stack.Screen name="order/[id]" options={{ title: 'Order' }} />
        <Stack.Screen name="admin/index" options={{ title: 'Admin' }} />
        <Stack.Screen name="admin/product-edit" options={{ title: 'Edit product' }} />
        <Stack.Screen name="admin/orders" options={{ title: 'All orders' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
