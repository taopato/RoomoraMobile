import React from 'react';
import { ActivityIndicator, AppState, Linking, Platform, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import BrandMark from '../../components/BrandMark';
import { Text, TouchableOpacity } from '../i18n';
import { useTheme } from '../theme/ThemeProvider';
import { getRequiredUpdate, VERSION_POLICY_URL } from './requiredUpdate';
import { getLocale } from '../i18n/runtime';

const installedVersion = Constants.expoConfig?.version;

export default function RequiredUpdateGate({ children }) {
  const { theme } = useTheme();
  const [status, setStatus] = React.useState(Platform.OS === 'web' ? 'ready' : 'checking');
  const [requiredUpdate, setRequiredUpdate] = React.useState(null);

  const check = React.useCallback(async () => {
    if (Platform.OS === 'web') return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(VERSION_POLICY_URL, {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Update policy: ${response.status}`);
      const policy = await response.json();
      setRequiredUpdate(getRequiredUpdate(policy, Platform.OS, installedVersion));
    } catch {
      // An unavailable policy endpoint must never lock everyone out of the app.
    } finally {
      clearTimeout(timeout);
      setStatus('ready');
    }
  }, []);

  React.useEffect(() => {
    check();
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => listener.remove();
  }, [check]);

  if (status === 'checking') {
    return <View style={[styles.center, { backgroundColor: theme.colors.background }]}><ActivityIndicator color={theme.colors.primary[700]} /></View>;
  }

  if (!requiredUpdate) return children;

  const english = getLocale().startsWith('en');

  return (
    <View style={[styles.center, styles.content, { backgroundColor: theme.colors.background }]}>
      <BrandMark variant="mark" size={68} />
      <Text style={[styles.title, { color: theme.colors.text.primary }]}>{english ? 'Update Roomora' : 'Roomora güncellenmeli'}</Text>
      <Text style={[styles.description, { color: theme.colors.text.secondary }]}>
        {english ? 'Install the latest store version to continue.' : 'Devam etmek için mağazadaki yeni sürümü yükle.'}
      </Text>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={() => Linking.openURL(requiredUpdate.storeUrl).catch(() => {})}
        style={[styles.button, { backgroundColor: theme.colors.primary[700] }]}
      >
        <Text style={styles.buttonText}>{english ? 'Update in store' : 'Mağazada güncelle'}</Text>
      </TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" onPress={check} style={styles.retry}>
        <Text style={[styles.retryText, { color: theme.colors.primary[700] }]}>{english ? 'Check again' : 'Tekrar kontrol et'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 32 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginTop: 24 },
  description: { fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 10 },
  button: { minHeight: 52, minWidth: 220, alignItems: 'center', justifyContent: 'center', borderRadius: 8, marginTop: 28 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  retry: { minHeight: 44, justifyContent: 'center', marginTop: 14 },
  retryText: { fontSize: 14, fontWeight: '600' },
});
