import { getLocale } from '../shared/i18n/runtime';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { receiptsApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import { EmptyState, ListRow, LoadingState, PageHeader, Pill, SectionHeader } from '../shared/ui/roomora/CanonicalUI';
import { Text } from '../shared/i18n';

const statusLabel = {
  Uploaded: 'Yüklendi',
  Parsed: 'Kontrol bekliyor',
  Reviewed: 'Düzenlendi',
  Converted: 'Harcamaya dönüştü',
};

export default function FisGecmisi({ navigation, route }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const houseId = Number(route?.params?.houseId || user?.defaultHouseId || 0);
  const [items, setItems] = useState([]);
  const [sortMode, setSortMode] = useState('added');
  const [loading, setLoading] = useState(true);
  const sortedItems = useMemo(() => [...items].sort((a, b) => {
    const dateFor = (item) => {
      const value = sortMode === 'expense'
        ? (item.receiptDate || item.createdAt)
        : (item.createdAt || item.receiptDate);
      return Date.parse(value || '') || 0;
    };
    return dateFor(b) - dateFor(a) || Number(b.id) - Number(a.id);
  }), [items, sortMode]);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await receiptsApi.getByHouse(houseId);
      const raw = response?.data?.data ?? response?.data ?? [];
      setItems(Array.isArray(raw) ? raw : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [houseId]);
  useEffect(() => {
    load();
    return navigation.addListener('focus', load);
  }, [load, navigation]);
  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 4 }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={theme.colors.primary[600]} />}
      >
        <PageHeader title="Fiş Geçmişi" subtitle="Taranan ve kaydedilen fişler" onBack={() => navigation.goBack()} />
        <Text style={styles.sortLabel}>Sırala</Text>
        <View style={styles.sortRow}>
          <Pill label="Eklenme tarihi" active={sortMode === 'added'} onPress={() => setSortMode('added')} />
          <Pill label="Harcama tarihi" active={sortMode === 'expense'} onPress={() => setSortMode('expense')} />
        </View>
        <SectionHeader title="Fişler" />
        {loading ? <LoadingState label="Fişler yükleniyor..." /> : sortedItems.map((item) => (
          <ListRow
            key={String(item.id)}
            icon="scan-outline"
            title={item.storeName || 'İsimsiz fiş'}
            subtitle={`${getLocale().startsWith('en') ? 'Receipt' : 'Fiş'}: ${item.receiptDate ? new Date(item.receiptDate).toLocaleDateString(getLocale()) : '-'}\n${getLocale().startsWith('en') ? 'Added' : 'Eklendi'}: ${item.createdAt ? new Date(item.createdAt).toLocaleDateString(getLocale()) : '-'}`}
            subtitleLines={2}
            amount={item.detectedTotalAmount || 0}
            badge={statusLabel[item.status] || String(item.status || 'Taslak')}
            badgeTone={item.status === 'Converted' ? 'success' : 'info'}
            onPress={() => navigation.navigate('FisDetayi', { receiptId: item.id, houseId })}
          />
        ))}
        {!loading && !items.length && <EmptyState icon="scan-outline" title="Henüz fiş yok" description="Harcama eklerken kamerayı kullanarak ilk fişini tarayabilirsin." action="Harcama Ekle" onAction={() => navigation.navigate('HarcamaEkle', { houseId })} />}
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 18, paddingBottom: 36 },
  sortLabel: { color: theme.colors.text.secondary, fontFamily: theme.typography.medium, fontSize: 12, marginTop: 14, marginBottom: 8 },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
});
