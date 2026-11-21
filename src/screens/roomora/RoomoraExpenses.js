import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../shared/theme/ThemeProvider';
import useRoomoraDashboard from '../../hooks/useRoomoraDashboard';
import {
  EmptyState,
  ErrorState,
  ListRow,
  LoadingState,
  PageHeader,
  Pill,
  PrimaryButton,
  SectionHeader,
  money,
} from '../../shared/ui/roomora/CanonicalUI';
import { getCategoryDisplayName, getCategoryIconName } from '../../constants/ExpenseEnums';
import { getExpenseDisplayTitle, getItemDate } from '../../utils/expenseHelpers';
import { getTimelineDate, sortExpensesByTimeline } from '../../utils/expenseTimeline';
import { ANYONE, matchesPeople, shownAmount } from '../../utils/expensePeopleFilter';
import { houseApi } from '../../services/api';

import { Text, TextInput } from '../../shared/i18n';
import { getLocale } from '../../shared/i18n/runtime';

import { TouchableOpacity } from '../../shared/i18n';

const homeFilters = [
  { key: 'all', label: 'Tümü' },
  { key: 'Market', label: 'Market' },
  { key: 'bill', label: 'Faturalar' },
  { key: 'Rent', label: 'Kira' },
];

export default function RoomoraExpenses({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useRoomoraDashboard(user);
  const isTrip = String(data.groupType).toLowerCase() === 'trip';
  const screenError = data.errors?.expenses;
  const [filter, setFilter] = useState('all');
  const [period, setPeriod] = useState('month');
  const [sortMode, setSortMode] = useState('added');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);
  const [payer, setPayer] = useState(ANYONE);
  const [beneficiary, setBeneficiary] = useState(ANYONE);
  const [members, setMembers] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);

  useEffect(() => {
    setPayer(ANYONE);
    setBeneficiary(ANYONE);
    if (!data.houseId) { setMembers([]); return undefined; }
    let alive = true;
    houseApi.getMembers(data.houseId).then((res) => {
      const raw = res?.data?.data || res?.data || [];
      const list = (Array.isArray(raw) ? raw : [])
        .map((member) => ({
          id: Number(member.userId ?? member.user?.id ?? member.id),
          fullName: member.fullName ?? member.name ?? member.user?.fullName ?? '',
        }))
        .filter((member) => Number.isFinite(member.id));
      if (alive) setMembers(list);
    }).catch(() => { if (alive) setMembers([]); });
    return () => { alive = false; };
  }, [data.houseId]);

  // Kişi çipleri: önce "Ben", sonra diğer üyeler (ilk adlarıyla)
  const people = useMemo(() => {
    const me = Number(user?.id);
    const named = members.map((member) => ({
      id: member.id,
      label: member.id === me ? 'Ben' : (String(member.fullName).trim().split(/\s+/)[0] || 'Üye'),
    }));
    return [...named.filter((item) => item.id === me), ...named.filter((item) => item.id !== me)];
  }, [members, user?.id]);
  const personName = (id) => people.find((item) => item.id === Number(id))?.label || '';
  const peopleActive = payer !== ANYONE || beneficiary !== ANYONE;
  const activeFilterCount = Number(filter !== 'all') + Number(peopleActive && payer !== ANYONE)
    + Number(beneficiary !== ANYONE) + Number(period !== (isTrip ? 'all' : 'month'))
    + Number(sortMode !== 'added');

  useEffect(() => {
    setFilter('all');
    setPeriod(isTrip ? 'all' : 'month');
    setVisibleCount(10);
  }, [data.houseId, isTrip]);

  const filters = useMemo(() => {
    if (!isTrip) return homeFilters;
    const categories = [...new Set(data.expenses.map((item) => item.key).filter(Boolean))];
    return [{ key: 'all', label: 'Tümü' }, ...categories.map((key) => ({
      key,
      label: getCategoryDisplayName(key),
    }))];
  }, [data.expenses, isTrip]);

  const items = useMemo(() => sortExpensesByTimeline(data.expenses.filter((item) => {
    const matchesFilter = filter === 'all'
      || item.key === filter
      || (filter === 'bill' && item.kind === 'bill');
    const date = getTimelineDate(item, sortMode);
    const now = new Date();
    const matchesPeriod = period === 'all'
      || (period === 'month'
        && date.getFullYear() === now.getFullYear()
        && date.getMonth() === now.getMonth())
      || (period === '30days' && date >= new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)));
    const haystack = `${getExpenseDisplayTitle(item)} ${item.payerName || ''}`.toLocaleLowerCase('tr-TR');
    return matchesFilter
      && matchesPeriod
      && matchesPeople(item, payer, beneficiary)
      && haystack.includes(search.trim().toLocaleLowerCase('tr-TR'));
  }), sortMode), [data.expenses, filter, period, search, sortMode, payer, beneficiary]);
  const visibleItems = items.slice(0, visibleCount);

  const total = items.reduce((sum, item) => sum + shownAmount(item, beneficiary), 0);
  const en = getLocale().startsWith('en');
  const peopleSummary = !peopleActive ? '' : en
    ? `${payer === ANYONE ? 'Anyone' : personName(payer)} → ${beneficiary === ANYONE ? 'anyone' : personName(beneficiary)}`
    : `${payer === ANYONE ? 'Herkes' : personName(payer)} → ${beneficiary === ANYONE ? 'herkes' : personName(beneficiary)} için`;
  const openCreate = () => {
    if (!data.houseId) {
      navigation.navigate('GrupListesi', { redirectTo: 'HarcamaEkle' });
      return;
    }
    navigation.navigate('HarcamaEkle', { houseId: data.houseId, houseName: data.houseName });
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={data.refreshing} onRefresh={data.refresh} />}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader title="Giderler" subtitle={data.houseName} />

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>{beneficiary !== ANYONE ? 'Seçilen kişinin payı' : isTrip ? 'Görüntülenen gezi gideri' : 'Bu ay görüntülenen gider'}</Text>
          <View style={styles.totalRow}>
            <View>
          <Text style={styles.totalValue}>{screenError ? '—' : money(total)}</Text>
              <Text style={styles.totalSub}>{items.length} işlem{peopleSummary ? ` · ${peopleSummary}` : ''}</Text>
            </View>
            <View style={styles.totalIcon}>
              <Ionicons name="wallet-outline" size={28} color={theme.colors.primary[700]} />
            </View>
          </View>
        </View>

        <PrimaryButton label="Yeni Harcama Ekle" icon="add" onPress={openCreate} />

        <View style={styles.searchRow}>
          <View style={styles.search}>
            <Ionicons name="search-outline" size={20} color={theme.colors.text.secondary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Harcamalarda ara"
              placeholderTextColor={theme.colors.neutral[400]}
              style={styles.searchInput}
            />
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => setFiltersOpen(true)} accessibilityLabel="Gider filtrelerini aç" testID="expense-filters-open">
            <Ionicons name="options-outline" size={22} color={theme.colors.primary[700]} />
            {activeFilterCount > 0 ? <Text style={styles.filterCount}>{activeFilterCount}</Text> : null}
          </TouchableOpacity>
        </View>
        <Text style={styles.filterSummary} numberOfLines={1}>
          {filters.find((entry) => entry.key === filter)?.label || 'Tümü'} · {period === 'month' ? 'Bu ay' : period === '30days' ? 'Son 30 gün' : 'Tüm zamanlar'}
          {peopleActive ? ` · ${peopleSummary}` : ''} · {sortMode === 'added' ? 'Eklenme tarihi' : 'Harcama tarihi'}
        </Text>

        <SectionHeader
          title="Harcama Geçmişi"
          action={items.length > visibleCount ? 'Daha Fazla' : undefined}
          onAction={() => setVisibleCount((count) => count + 10)}
        />

        {data.loading ? (
          <LoadingState label="Giderler yükleniyor..." />
        ) : screenError ? (
          <ErrorState description={screenError} onRetry={data.retry} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="wallet-outline"
            title={search || filter !== 'all' || peopleActive ? 'Eşleşen harcama yok' : 'Henüz gider yok'}
            description="İlk ortak harcamayı eklediğinde burada görünecek."
            action="Harcama Ekle"
            onAction={openCreate}
          />
        ) : visibleItems.map((item) => (
          <ListRow
            key={String(item.id)}
            icon={getCategoryIconName(item.key)}
            title={getExpenseDisplayTitle(item)}
            subtitleLines={item.receiptUploadedAt ? 2 : 1}
            subtitle={item.receiptUploadedAt
              ? `${getLocale().startsWith('en') ? 'Receipt' : 'Fiş'}: ${getItemDate(item).toLocaleDateString(getLocale())}\n${getLocale().startsWith('en') ? 'Added' : 'Eklendi'}: ${getTimelineDate(item, 'added').toLocaleDateString(getLocale())}`
              : `${getTimelineDate(item, sortMode).toLocaleDateString(getLocale())}${item.payerName ? ` · ${item.payerName} ödedi` : ''}${beneficiary !== ANYONE ? ` · ${en ? 'Total' : 'Toplam'} ${money(item.amount)}` : ''}`}
            amount={shownAmount(item, beneficiary)}
            onPress={() => navigation.navigate('HarcamaDetayi', {
              expenseId: item.id,
              houseId: data.houseId,
              houseName: data.houseName,
              initialExpense: item._raw || item,
            })}
          />
        ))}
        {items.length > 10 && items.length <= visibleCount ? (
          <TouchableOpacity style={styles.collapseButton} onPress={() => setVisibleCount(10)}>
            <Text style={styles.collapseText}>İlk 10 kaydı göster</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
      <Modal visible={filtersOpen} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setFiltersOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setFiltersOpen(false)} accessibilityLabel="Filtreleri kapat" />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtreler</Text>
              <TouchableOpacity onPress={() => setFiltersOpen(false)} accessibilityLabel="Filtreleri kapat">
                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.filterLabel}>Kategori</Text>
              <View style={styles.filterOptions}>{filters.map((entry) => (
                <Pill key={entry.key} label={entry.label} active={filter === entry.key} onPress={() => { setFilter(entry.key); setVisibleCount(10); }} />
              ))}</View>
              {people.length > 1 ? ([['Ödeyen', payer, setPayer], ['Kimin için', beneficiary, setBeneficiary]].map(([label, value, setValue]) => (
                <View key={label}>
                  <Text style={styles.filterLabel}>{label}</Text>
                  <View style={styles.filterOptions}>
                    <Pill label="Herkes" active={value === ANYONE} onPress={() => { setValue(ANYONE); setVisibleCount(10); }} />
                    {people.map((person) => <Pill key={person.id} label={person.label} active={Number(value) === person.id} onPress={() => { setValue(person.id); setVisibleCount(10); }} />)}
                  </View>
                </View>
              ))) : null}
              <Text style={styles.filterLabel}>Dönem</Text>
              <View style={styles.filterOptions}>
                {[['month', 'Bu Ay'], ['30days', 'Son 30 Gün'], ['all', 'Tüm Zamanlar']].map(([value, label]) => (
                  <Pill key={value} label={label} active={period === value} onPress={() => { setPeriod(value); setVisibleCount(10); }} />
                ))}
              </View>
              <Text style={styles.filterLabel}>Sıralama</Text>
              <View style={styles.filterOptions}>
                <Pill label="Eklenme tarihi" active={sortMode === 'added'} onPress={() => { setSortMode('added'); setVisibleCount(10); }} />
                <Pill label="Harcama tarihi" active={sortMode === 'expense'} onPress={() => { setSortMode('expense'); setVisibleCount(10); }} />
              </View>
            </ScrollView>
            <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <TouchableOpacity onPress={() => { setFilter('all'); setPayer(ANYONE); setBeneficiary(ANYONE); setPeriod(isTrip ? 'all' : 'month'); setSortMode('added'); }}>
                <Text style={styles.resetText}>Sıfırla</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={() => setFiltersOpen(false)}>
                <Text style={styles.applyText}>{items.length} gideri göster</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (theme, insets) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingTop: insets.top + 6, paddingHorizontal: 18, paddingBottom: 32 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  search: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  filterButton: { height: 48, minWidth: 48, paddingHorizontal: 9, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.neutral[200], backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
  filterCount: { color: theme.colors.primary[700], fontSize: 12, fontFamily: theme.typography.bold },
  filterSummary: { color: theme.colors.text.secondary, fontSize: 12, marginTop: 9, marginBottom: 16 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10, 29, 45, 0.42)' },
  modalSheet: { maxHeight: '82%', backgroundColor: theme.colors.background, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  modalHeader: { minHeight: 56, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: theme.colors.neutral[200] },
  modalTitle: { color: theme.colors.text.primary, fontSize: 18, fontFamily: theme.typography.bold },
  modalContent: { paddingHorizontal: 18, paddingBottom: 24 },
  filterLabel: { color: theme.colors.text.secondary, fontSize: 13, fontFamily: theme.typography.semibold, marginTop: 18, marginBottom: 9 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modalFooter: { paddingHorizontal: 18, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 16, borderTopWidth: 1, borderTopColor: theme.colors.neutral[200] },
  resetText: { color: theme.colors.primary[700], fontFamily: theme.typography.semibold },
  applyButton: { flex: 1, minHeight: 44, borderRadius: 8, backgroundColor: theme.colors.primary[600], alignItems: 'center', justifyContent: 'center' },
  applyText: { color: theme.colors.text.onPrimary, fontFamily: theme.typography.bold },
  searchInput: {
    flex: 1,
    color: theme.colors.text.primary,
    fontFamily: theme.typography.regular,
    fontSize: 15,
    outlineStyle: 'none',
  },
  filters: { gap: 8, paddingVertical: 14 },
  periodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  peopleCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  peopleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  peopleTitle: { color: theme.colors.text.primary, fontFamily: theme.typography.semibold, fontSize: 14 },
  peopleClear: { color: theme.colors.primary[700], fontFamily: theme.typography.semibold, fontSize: 13, paddingVertical: 4 },
  peopleRow: { marginTop: 8 },
  peopleLabel: { color: theme.colors.text.secondary, fontFamily: theme.typography.medium, fontSize: 12, marginBottom: 6 },
  peoplePills: { gap: 8 },
  sortRow: { marginBottom: 16 },
  sortLabel: { color: theme.colors.text.secondary, fontFamily: theme.typography.medium, fontSize: 12, marginBottom: 8 },
  sortOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  collapseButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  collapseText: { color: theme.colors.primary[700], fontFamily: theme.typography.semibold, fontSize: 13 },
  totalCard: {
    borderRadius: 8,
    padding: 18,
    backgroundColor: theme.colors.primary[50],
    borderWidth: 1,
    borderColor: theme.colors.primary[100],
    marginTop: 14,
    marginBottom: 12,
  },
  totalLabel: {
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.medium,
    fontSize: 13,
    padding: 0,
  },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  totalValue: {
    color: theme.colors.text.primary,
    fontFamily: theme.typography.extrabold,
    fontSize: 28,
    padding: 0,
  },
  totalSub: {
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.regular,
    fontSize: 12,
    padding: 0,
    marginTop: 3,
  },
  totalIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
