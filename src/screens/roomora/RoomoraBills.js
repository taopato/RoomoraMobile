import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
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
import { BILL_KEYS } from '../../utils/expenseClassifier';
import { getCategoryIconName } from '../../constants/ExpenseEnums';
import { getExpenseDisplayTitle, getItemDate } from '../../utils/expenseHelpers';
import ScheduledChargeCard from '../../components/ScheduledChargeCard';
import { expensesApi, ledgerApi, scheduledChargesApi } from '../../services/api';
import eventBus from '../../shared/events/bus';

import { Alert, Text } from '../../shared/i18n';
import { getLocale } from '../../shared/i18n/runtime';
import { parseApiDate } from '../../shared/format/date';

import { TouchableOpacity } from '../../shared/i18n';

export default function RoomoraBills({ navigation }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const data = useRoomoraDashboard(user);
  const screenError = data.errors?.expenses || data.errors?.scheduled;
  const [filter, setFilter] = useState('all');
  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [busyCycleId, setBusyCycleId] = useState(null);
  const [installmentStatus, setInstallmentStatus] = useState({});
  const [busyInstallmentId, setBusyInstallmentId] = useState(null);
  const styles = useMemo(() => makeStyles(theme, insets), [theme, insets]);

  const now = new Date();
  const bills = useMemo(() => data.expenses
    .filter((item) => BILL_KEYS.includes(item.key))
    .filter((item) => {
      const raw = item?._raw || {};
      const isPlannedPeriod = (raw.parentExpenseId ?? raw.ParentExpenseId) != null;
      if (!isPlannedPeriod) return true;

      const visibleFrom = parseApiDate(raw.postDate ?? raw.PostDate ?? item.date);
      const dueDate = parseApiDate(raw.dueDate ?? raw.DueDate ?? item.date);
      if (Number.isNaN(visibleFrom.getTime()) || Number.isNaN(dueDate.getTime())) return false;
      dueDate.setHours(23, 59, 59, 999);
      return now >= visibleFrom && now <= dueDate;
    })
    .filter((item) => filter === 'all' || item.key === filter), [data.expenses, filter]);
  const total = bills.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const openCreate = () => {
    if (!data.houseId) {
      navigation.navigate('GrupListesi', { redirectTo: 'FaturaEkle' });
      return;
    }
    navigation.navigate('FaturaEkle', { houseId: data.houseId, houseName: data.houseName });
  };

  const toggleShare = async (plan, share, isPaid) => {
    if (!plan?.cycle?.id || !share?.userId || busyCycleId) return;
    setBusyCycleId(plan.cycle.id);
    try {
      await scheduledChargesApi.setSharePaid(plan.cycle.id, share.userId, isPaid);
      eventBus.emit('scheduled-charges:updated', { houseId: data.houseId });
      await data.refresh();
    } catch (error) {
      Alert.alert('İşlem tamamlanamadı', error?.response?.data?.message || 'Lütfen tekrar deneyin.');
    } finally {
      setBusyCycleId(null);
    }
  };

  const toggleExternal = async (plan, isPaid) => {
    if (!plan?.cycle?.id || busyCycleId) return;
    setBusyCycleId(plan.cycle.id);
    try {
      await scheduledChargesApi.setExternalPaid(plan.cycle.id, isPaid);
      eventBus.emit('scheduled-charges:updated', { houseId: data.houseId });
      await data.refresh();
    } catch (error) {
      Alert.alert('İşlem tamamlanamadı', error?.response?.data?.message || 'Lütfen tekrar deneyin.');
    } finally {
      setBusyCycleId(null);
    }
  };

  const togglePlan = async (planId, installments) => {
    if (Number(expandedPlanId) === Number(planId)) {
      setExpandedPlanId(null);
      return;
    }
    setExpandedPlanId(planId);
    const results = await Promise.allSettled(installments.map((item) => ledgerApi.byExpense(item.id)));
    setInstallmentStatus((current) => {
      const next = { ...current };
      results.forEach((result, index) => {
        const id = installments[index].id;
        if (result.status !== 'fulfilled') {
          next[id] = 'unknown';
          return;
        }
        const response = result.value?.data?.data ?? result.value?.data;
        const lines = Array.isArray(response) ? response : [];
        next[id] = lines.some((line) => Number(line.paidAmount ?? line.PaidAmount) > 0) &&
          lines.every((line) => Number(line.paidAmount ?? line.PaidAmount) >= Number(line.amount ?? line.Amount) - 0.01)
          ? 'paid' : 'open';
      });
      return next;
    });
  };

  const removeInstallment = (item) => Alert.alert(
    'Taksiti sil',
    'Yalnızca bu taksit silinecek. Ödeme kaydı varsa işlem engellenir.',
    [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        setBusyInstallmentId(item.id);
        try {
          await expensesApi.remove(item.id);
          eventBus.emit('expenses:updated', { houseId: data.houseId });
          await data.refresh();
        } catch (error) {
          Alert.alert('Silinemedi', error?.response?.data?.message || 'Ödeme kaydı olan taksit silinemez.');
        } finally {
          setBusyInstallmentId(null);
        }
      } },
    ]
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={data.refreshing} onRefresh={data.refresh} />}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader title="Faturalar" subtitle={data.houseName} />

        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>TOPLAM FATURA</Text>
          <Text style={styles.summaryValue}>
            {screenError ? '—' : `₺${Number(total || 0).toLocaleString(getLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </Text>
          <View style={styles.summaryStats}>
            <View>
              <Text style={styles.statLabel}>Aktif</Text>
              <Text style={styles.statValue}>{bills.length}</Text>
            </View>
            <View style={styles.statDivider} />
            <View>
              <Text style={styles.statLabel}>Planlı gider</Text>
              <Text style={styles.statValue}>{data.scheduled.length}</Text>
            </View>
          </View>
        </View>

        <PrimaryButton label="Yeni Fatura Ekle" icon="add" onPress={openCreate} />
        <TouchableOpacity
          style={styles.plannedAction}
          onPress={() => navigation.navigate('DuzenliGiderEkle', {
            houseId: data.houseId,
            houseName: data.houseName,
          })}
          activeOpacity={0.84}
        >
          <Text style={styles.plannedActionText}>Düzenli veya taksitli gider ekle</Text>
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <Pill label="Tümü" active={filter === 'all'} onPress={() => setFilter('all')} />
          <Pill label="Elektrik" active={filter === 'Electricity'} onPress={() => setFilter('Electricity')} />
          <Pill label="Su" active={filter === 'Water'} onPress={() => setFilter('Water')} />
          <Pill label="İnternet" active={filter === 'Internet'} onPress={() => setFilter('Internet')} />
          <Pill label="Kira" active={filter === 'Rent'} onPress={() => setFilter('Rent')} />
        </ScrollView>

        {!!data.scheduled.length && (
          <>
            <SectionHeader
              title="Planlı Ödemeler"
              action="Düzenle"
              onAction={() => navigation.navigate('DuzenliGiderEkle', {
                houseId: data.houseId,
                houseName: data.houseName,
              })}
            />
            {data.scheduled.map((plan, index) => (
              <ScheduledChargeCard
                key={String(plan.id ?? index)}
                plan={plan}
                currentUserId={user?.id}
                busy={Number(busyCycleId) === Number(plan?.cycle?.id)}
                onToggleShare={toggleShare}
                onToggleExternal={toggleExternal}
              />
            ))}
          </>
        )}

        {!!data.installmentPlans.length && (
          <>
            <SectionHeader title="Taksit Planları" />
            {data.installmentPlans.map((plan) => {
              const installments = data.expenses
                .filter((item) => Number(item?._raw?.parentExpenseId ?? item?._raw?.ParentExpenseId) === Number(plan.id))
                .sort((a, b) => Number(a?._raw?.installmentIndex ?? a?._raw?.InstallmentIndex) - Number(b?._raw?.installmentIndex ?? b?._raw?.InstallmentIndex));
              const count = Number(plan?._raw?.installmentCount ?? plan?._raw?.InstallmentCount) || installments.length;
              const expanded = Number(expandedPlanId) === Number(plan.id);
              return (
                <View key={String(plan.id)}>
                  <ListRow
                    icon="calendar-outline"
                    title={getExpenseDisplayTitle(plan)}
                    subtitle={`${count} taksit · Ayrıntıları göster`}
                    amount={plan.amount}
                    onPress={() => togglePlan(plan.id, installments)}
                  />
                  {expanded && installments.map((item) => {
                    const due = item?._raw?.dueDate ?? item?._raw?.DueDate;
                    const date = due ? new Date(due) : getItemDate(item);
                    const index = item?._raw?.installmentIndex ?? item?._raw?.InstallmentIndex;
                    const status = installmentStatus[item.id];
                    return (
                      <View key={String(item.id)} style={styles.installmentRow}>
                      <ListRow
                        icon={status === 'paid' ? 'checkmark-circle-outline' : 'card-outline'}
                        title={`Taksit ${index || '·'}/${count}`}
                        subtitle={`${Number.isNaN(date.getTime()) ? 'Tarih belirtilmedi' : date.toLocaleDateString(getLocale())}${status === 'paid' ? ' · Paylar ödendi' : status === 'open' ? ' · Ödeme bekliyor' : ''}`}
                        amount={item.amount}
                        onPress={() => navigation.navigate('HarcamaDetayi', {
                          expenseId: item.id,
                          houseId: data.houseId,
                          houseName: data.houseName,
                          initialExpense: item._raw || item,
                        })}
                      />
                      <View style={styles.installmentActions}>
                        <TouchableOpacity style={styles.installmentAction} onPress={() => navigation.navigate('HarcamaDuzenle', {
                          expenseId: item.id, houseId: data.houseId, houseName: data.houseName, initialExpense: item._raw || item,
                        })} accessibilityLabel={`Taksit ${index} düzenle`}>
                          <Ionicons name="create-outline" size={17} color={theme.colors.primary[700]} />
                          <Text style={styles.installmentActionText}>Düzenle</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.installmentAction} disabled={busyInstallmentId === item.id || status === 'paid'} onPress={() => removeInstallment(item)} accessibilityLabel={`Taksit ${index} sil`}>
                          <Ionicons name="trash-outline" size={17} color={theme.colors.error[700]} />
                          <Text style={styles.installmentDeleteText}>Sil</Text>
                        </TouchableOpacity>
                      </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </>
        )}

        <SectionHeader title="Güncel Faturalar" />
        {data.loading ? (
          <LoadingState label="Faturalar yükleniyor..." />
        ) : screenError ? (
          <ErrorState description={screenError} onRetry={data.retry} />
        ) : bills.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="Henüz fatura yok"
            description="Elektrik, su, internet veya kira kaydını buradan ekleyebilirsin."
            action="Fatura Ekle"
            onAction={openCreate}
          />
        ) : bills.map((item) => (
          <ListRow
            key={String(item.id)}
            icon={getCategoryIconName(item.key)}
            title={getExpenseDisplayTitle(item)}
            subtitle={`${item?._raw?.odeyenKullaniciAdi || 'Bir ev üyesi'} ödedi · ${getItemDate(item).toLocaleDateString(getLocale())}`}
            amount={item.amount}
            badge="PAYLAŞILDI"
            badgeTone="success"
            onPress={() => navigation.navigate('BillDetail', {
              billId: item.id,
              houseId: data.houseId,
              houseName: data.houseName,
              initialBill: item._raw || item,
            })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme, insets) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingTop: insets.top + 6, paddingHorizontal: 18, paddingBottom: 32 },
  summary: {
    borderRadius: 8,
    backgroundColor: theme.colors.primary[900],
    padding: 20,
    marginTop: 14,
    marginBottom: 12,
  },
  summaryLabel: {
    color: theme.colors.balanceHero.muted,
    fontFamily: theme.typography.semibold,
    fontSize: 13,
  },
  summaryValue: {
    color: theme.colors.text.onPrimary,
    fontFamily: theme.typography.extrabold,
    fontSize: 34,
    marginTop: 8,
  },
  summaryStats: { flexDirection: 'row', alignItems: 'center', gap: 24, marginTop: 18 },
  statLabel: { color: theme.colors.balanceHero.muted, fontFamily: theme.typography.regular, fontSize: 12 },
  statValue: { color: theme.colors.text.onPrimary, fontFamily: theme.typography.bold, fontSize: 18, marginTop: 2 },
  statDivider: { width: 1, height: 35, backgroundColor: theme.colors.balanceHero.divider },
  plannedAction: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  plannedActionText: {
    color: theme.colors.primary[700],
    fontFamily: theme.typography.bold,
    fontSize: 14,
  },
  filters: { gap: 8, paddingVertical: 14 },
  installmentRow: { marginLeft: 14, marginBottom: 8, borderLeftWidth: 2, borderLeftColor: theme.colors.primary[100], paddingLeft: 8 },
  installmentActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginTop: -4, paddingBottom: 8 },
  installmentAction: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8 },
  installmentActionText: { color: theme.colors.primary[700], fontFamily: theme.typography.semibold, fontSize: 13 },
  installmentDeleteText: { color: theme.colors.error[700], fontFamily: theme.typography.semibold, fontSize: 13 },
});
