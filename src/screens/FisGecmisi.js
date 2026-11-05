import { getLocale } from '../shared/i18n/runtime';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { receiptsApi } from '../services/api';
import { useTheme } from '../shared/theme/ThemeProvider';
import { EmptyState, ListRow, LoadingState, PageHeader, Pill, SectionHeader } from '../shared/ui/roomora/CanonicalUI';
import { Alert, Text, TouchableOpacity } from '../shared/i18n';
import { getReceiptTitle } from '../utils/receiptPresentation';

const statusLabel = {
  Uploaded: 'Yüklendi',
  Parsed: 'Kontrol bekliyor',
  Reviewed: 'Düzenlendi',
  Converted: 'Harcamaya dönüştü',
};

const isConverted = (item) => String(item.status).toLowerCase() === 'converted'
  || Number(item.status) === 3 || item.convertedExpenseId != null;

function ReceiptRow({ item, houseId, navigation, onDeleted, theme, styles }) {
  const swipeRef = useRef(null);
  const confirming = useRef(false);
  const converted = isConverted(item);

  const confirmDelete = () => {
    if (converted || confirming.current) return;
    confirming.current = true;
    Alert.alert('Fişi sil', 'Taslak listeden kaldırılacak. Kayıt ve görsel sistemde saklanacak.', [
      { text: 'Vazgeç', style: 'cancel', onPress: () => {
        confirming.current = false;
        swipeRef.current?.close();
      } },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try {
          await receiptsApi.remove(item.id);
          onDeleted(item.id);
        } catch {
          Alert.alert('Hata', 'Fiş silinemedi. Lütfen tekrar dene.');
          swipeRef.current?.close();
        } finally {
          confirming.current = false;
        }
      } },
    ], { cancelable: true, onDismiss: () => {
      confirming.current = false;
      swipeRef.current?.close();
    } });
  };

  const row = (
    <ListRow
      icon="scan-outline"
      title={getReceiptTitle(item, getLocale())}
      subtitle={`${getLocale().startsWith('en') ? 'Receipt' : 'Fiş'}: ${item.receiptDate ? new Date(item.receiptDate).toLocaleDateString(getLocale()) : '-'}\n${getLocale().startsWith('en') ? 'Added' : 'Eklendi'}: ${item.createdAt ? new Date(item.createdAt).toLocaleDateString(getLocale()) : '-'}`}
      subtitleLines={2}
      amount={item.detectedTotalAmount || 0}
      badge={statusLabel[item.status] || String(item.status || 'Taslak')}
      badgeTone={converted ? 'success' : 'info'}
      onPress={() => navigation.navigate('FisDetayi', { receiptId: item.id, houseId })}
    />
  );

  if (converted) return row;
  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      friction={2}
      rightThreshold={64}
      overshootRight={false}
      onSwipeableOpen={(direction) => { if (direction === 'left') confirmDelete(); }}
      renderRightActions={() => (
        <TouchableOpacity style={styles.deleteAction} accessibilityLabel="Fiş taslağını sil" onPress={confirmDelete}>
          <Ionicons name="trash-outline" size={22} color={theme.colors.text.onPrimary} />
          <Text style={styles.deleteActionText}>Sil</Text>
        </TouchableOpacity>
      )}
    >
      {row}
    </ReanimatedSwipeable>
  );
}

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
          <ReceiptRow key={String(item.id)} item={item} houseId={houseId} navigation={navigation} onDeleted={(id) => setItems((current) => current.filter((receipt) => receipt.id !== id))} theme={theme} styles={styles} />
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
  deleteAction: { width: 88, marginLeft: 8, marginBottom: 10, borderRadius: 8, backgroundColor: theme.colors.error[600], alignItems: 'center', justifyContent: 'center', gap: 4 },
  deleteActionText: { color: theme.colors.text.onPrimary, fontWeight: '700', fontSize: 12 },
});
