import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { pushDevicesApi } from './api';
import { getActiveLanguage, translate } from '../shared/i18n/runtime';

const TOKEN_KEY = 'roomora:expo-push-token';
const BILL_REMINDERS_KEY = 'roomora:bill-reminder-ids';
const PREFERENCES_KEY = 'notification_preferences';
const DEFAULT_PREFERENCES = { payment: true, bill: true, house: true };

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerPushNotifications(preferences = {}) {
  if (Platform.OS === 'web' || !Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Roomora',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const current = await Notifications.getPermissionsAsync();
  const permission = current.status === 'granted'
    ? current
    : await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return null;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId
    || Constants.easConfig?.projectId;
  if (!projectId) return null;

  let storedPreferences = {};
  try {
    storedPreferences = JSON.parse(await AsyncStorage.getItem(PREFERENCES_KEY)) || {};
  } catch {
    storedPreferences = {};
  }
  const resolvedPreferences = { ...DEFAULT_PREFERENCES, ...storedPreferences, ...preferences };
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await pushDevicesApi.register({
    expoPushToken: token,
    platform: Platform.OS,
    languageCode: getActiveLanguage(),
    deviceName: Device.deviceName || Device.modelName || undefined,
    paymentEnabled: resolvedPreferences.payment !== false,
    billEnabled: resolvedPreferences.bill !== false,
    groupEnabled: resolvedPreferences.house !== false,
  });
  return token;
}

export async function unregisterPushNotifications() {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) await pushDevicesApi.unregister(token).catch(() => {});
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export function subscribeToNotificationNavigation(onOpen) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response?.notification?.request?.content?.data || {};
    onOpen?.(data);
  });
  return () => subscription.remove();
}

export async function syncBillReminders(plans = [], enabled = true) {
  if (Platform.OS === 'web') return;
  const previousRaw = await AsyncStorage.getItem(BILL_REMINDERS_KEY);
  let previous = [];
  try { previous = previousRaw ? JSON.parse(previousRaw) : []; } catch { previous = []; }
  await Promise.all(previous.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
  if (!enabled) {
    await AsyncStorage.setItem(BILL_REMINDERS_KEY, '[]');
    return;
  }

  const now = new Date();
  const identifiers = [];
  for (const plan of plans) {
    const dueDay = Number(plan?.dueDay);
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28 || plan?.amountMode === 'Variable') continue;
    const trigger = new Date(now.getFullYear(), now.getMonth(), Math.max(1, dueDay - 1), 10, 0, 0, 0);
    if (trigger <= now) trigger.setMonth(trigger.getMonth() + 1);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: translate('Yaklaşan fatura'),
        body: translate(`${plan?.title || 'Fatura'} için ödeme zamanı yaklaşıyor.`),
        data: { route: 'Faturalar', houseId: plan?.houseId },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
    });
    identifiers.push(id);
  }
  await AsyncStorage.setItem(BILL_REMINDERS_KEY, JSON.stringify(identifiers));
}
