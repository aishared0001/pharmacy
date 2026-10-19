import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Show notifications while the app is in the foreground too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getProjectId(): string | undefined {
  // Present once the app is built with EAS; absent in plain Expo Go.
  return (
    (Constants?.expoConfig as any)?.extra?.eas?.projectId ??
    (Constants as any)?.easConfig?.projectId ??
    undefined
  );
}

// Registers for push, saves the Expo token to the user's profile. Safe to call
// repeatedly; it no-ops gracefully where push isn't available (e.g. Expo Go,
// simulators, or before an EAS build exists).
export async function registerForPushNotifications(userId: string): Promise<void> {
  try {
    if (!Device.isDevice) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Order updates',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return;

    const projectId = getProjectId();
    if (!projectId) {
      console.log(
        '[MediGo] No EAS projectId yet - push works after a standalone build.',
      );
      return;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
  } catch (e) {
    console.warn('[MediGo] push registration failed:', e);
  }
}
