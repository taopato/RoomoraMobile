import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput, TouchableOpacity } from '../shared/i18n';
import { money } from '../shared/ui/roomora/CanonicalUI';
import { allocateShareUnits } from '../utils/shareUnits';
import { getLocale } from '../shared/i18n/runtime';

export default function ShareUnitsPicker({ members, units, amount, onChange, onCancel, onApply, theme }) {
  const styles = makeStyles(theme);
  const totalUnits = units.reduce((sum, entry) => sum + entry.units, 0);
  const amounts = new Map(allocateShareUnits(amount, units).map((entry) => [entry.userId, entry.amount]));
  const selected = new Map(units.map((entry) => [Number(entry.userId), entry]));

  const setCount = (userId, count) => {
    const next = units.filter((entry) => Number(entry.userId) !== userId);
    if (count > 0) next.push({
      userId,
      units: Math.min(count, 50),
      forLabel: count > 1 ? selected.get(userId)?.forLabel || '' : '',
    });
    onChange(next.sort((a, b) => a.userId - b.userId));
  };

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.headingText}>
          <Text style={styles.title}>Payları özelleştir</Text>
          <Text style={styles.subtitle}>Ek payı borçtan sorumlu ev üyesine yaz.</Text>
        </View>
        <TouchableOpacity accessibilityLabel="Kapat" style={styles.close} onPress={onCancel}>
          <Ionicons name="close" size={22} color={theme.colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        {members.map((member) => {
          const userId = Number(member.id);
          const entry = selected.get(userId);
          const count = entry?.units || 0;
          return (
            <View key={String(userId)} style={styles.memberRow}>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName} numberOfLines={1}>{member.fullName}</Text>
                <Text style={styles.memberAmount}>{count ? money(amounts.get(userId) || 0) : 'Paylaştırılmıyor'}</Text>
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity
                  accessibilityLabel={`${member.fullName} payını azalt`}
                  disabled={!count}
                  style={[styles.stepButton, !count && styles.stepDisabled]}
                  onPress={() => setCount(userId, count - 1)}
                >
                  <Ionicons name="remove" size={18} color={theme.colors.primary[700]} />
                </TouchableOpacity>
                <Text style={styles.count}>{count}</Text>
                <TouchableOpacity
                  accessibilityLabel={`${member.fullName} payını artır`}
                  disabled={count >= 50 || totalUnits >= 100}
                  style={styles.stepButton}
                  onPress={() => setCount(userId, count + 1)}
                >
                  <Ionicons name="add" size={18} color={theme.colors.primary[700]} />
                </TouchableOpacity>
              </View>
              {count > 1 ? (
                <TextInput
                  style={styles.guestInput}
                  placeholder="Ek pay açıklaması (örn. Sedef için)"
                  placeholderTextColor={theme.colors.text.disabled}
                  value={entry.forLabel || ''}
                  maxLength={80}
                  onChangeText={(forLabel) => onChange(units.map((unit) =>
                    unit.userId === userId ? { ...unit, forLabel } : unit))}
                />
              ) : null}
            </View>
          );
        })}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>{getLocale().startsWith('en') ? `${totalUnits} shares total` : `Toplam ${totalUnits} pay`}</Text>
          <Text style={styles.totalAmount}>{money(amount)}</Text>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.reset} onPress={() => onChange(units.map((entry) => ({ userId: entry.userId, units: 1, forLabel: '' })))}>
          <Text style={styles.resetText}>Eşit paylaş</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.apply, !totalUnits && styles.applyDisabled]} disabled={!totalUnits} onPress={onApply}>
          <Text style={styles.applyText}>Uygula</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 8, borderTopRightRadius: 8, maxHeight: '88%' },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, gap: 12 },
  headingText: { flex: 1 },
  title: { color: theme.colors.text.primary, fontSize: 20, fontWeight: '800' },
  subtitle: { color: theme.colors.text.secondary, fontSize: 13, marginTop: 4 },
  close: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 10 },
  memberRow: { minHeight: 76, borderTopWidth: 1, borderColor: theme.colors.neutral[200], paddingVertical: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  memberInfo: { flex: 1, minWidth: 130 },
  memberName: { color: theme.colors.text.primary, fontSize: 15, fontWeight: '700' },
  memberAmount: { color: theme.colors.text.secondary, fontSize: 13, marginTop: 3 },
  stepper: { width: 132, height: 42, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.neutral[300], borderRadius: 8 },
  stepButton: { width: 42, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepDisabled: { opacity: 0.35 },
  count: { width: 46, textAlign: 'center', color: theme.colors.text.primary, fontSize: 17, fontWeight: '800' },
  guestInput: { width: '100%', borderWidth: 1, borderColor: theme.colors.neutral[200], borderRadius: 8, color: theme.colors.text.primary, backgroundColor: theme.colors.background, paddingHorizontal: 12, minHeight: 42, fontSize: 13 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: theme.colors.primary[50], borderRadius: 8, padding: 14, marginTop: 10 },
  totalLabel: { color: theme.colors.primary[700], fontWeight: '700' },
  totalAmount: { color: theme.colors.primary[800], fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 10, padding: 20, borderTopWidth: 1, borderColor: theme.colors.neutral[200] },
  reset: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.neutral[300], borderRadius: 8 },
  resetText: { color: theme.colors.text.primary, fontWeight: '700' },
  apply: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary[600], borderRadius: 8 },
  applyDisabled: { opacity: 0.45 },
  applyText: { color: theme.colors.text.onPrimary, fontWeight: '800' },
});
