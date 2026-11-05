import React, { useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput, TouchableOpacity } from '../shared/i18n';
import { money } from '../shared/ui/roomora/CanonicalUI';
import { allocateShareUnits } from '../utils/shareUnits';
import { getLocale } from '../shared/i18n/runtime';

export default function ShareUnitsPicker({ members, units, amount, onChange, onCancel, onApply, theme }) {
  const styles = makeStyles(theme);
  const [expandedId, setExpandedId] = useState(null);
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
          <Text style={styles.subtitle}>Kişiye dokun, ek payı + ile artır.</Text>
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
          const expanded = expandedId === userId;
          return (
            <View key={String(userId)} style={[styles.memberRow, expanded && styles.memberRowExpanded]}>
              <TouchableOpacity
                style={styles.memberHeading}
                accessibilityLabel={`${member.fullName} paylaşımını düzenle`}
                onPress={() => {
                  Keyboard.dismiss();
                  setExpandedId(expanded ? null : userId);
                }}
              >
                <View style={styles.avatar}><Text style={styles.avatarText}>{String(member.fullName || '?').charAt(0).toUpperCase()}</Text></View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName} numberOfLines={1}>{member.fullName}</Text>
                  <Text style={styles.memberAmount}>{count ? money(amounts.get(userId) || 0) : 'Paylaştırılmıyor'}</Text>
                </View>
                {count > 1 ? <View style={styles.customBadge}><Text style={styles.customBadgeText}>Ek pay</Text></View> : null}
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.text.secondary} />
              </TouchableOpacity>
              {expanded ? (
                <View style={styles.expandedContent}>
                  <View style={styles.countRow}>
                    <Text style={styles.countLabel}>Bu kişinin payı</Text>
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        accessibilityLabel={`${member.fullName} payını azalt`}
                        disabled={!count}
                        style={[styles.stepButton, !count && styles.stepDisabled]}
                        onPress={() => setCount(userId, count - 1)}
                      >
                        <Ionicons name="remove" size={18} color={theme.colors.primary[700]} />
                      </TouchableOpacity>
                      <Text style={styles.count}>{count} pay</Text>
                      <TouchableOpacity
                        accessibilityLabel={`${member.fullName} payını artır`}
                        disabled={count >= 50 || totalUnits >= 100}
                        style={[styles.stepButton, (count >= 50 || totalUnits >= 100) && styles.stepDisabled]}
                        onPress={() => setCount(userId, count + 1)}
                      >
                        <Ionicons name="add" size={18} color={theme.colors.primary[700]} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {count > 1 ? (
                    <TextInput
                      style={styles.guestInput}
                      placeholder="Ek pay açıklaması (örn. Sedef için)"
                      placeholderTextColor={theme.colors.text.disabled}
                      value={entry.forLabel || ''}
                      maxLength={80}
                      returnKeyType="done"
                      onSubmitEditing={Keyboard.dismiss}
                      onChangeText={(forLabel) => onChange(units.map((unit) =>
                        unit.userId === userId ? { ...unit, forLabel } : unit))}
                    />
                  ) : null}
                </View>
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
        <TouchableOpacity style={[styles.apply, !totalUnits && styles.applyDisabled]} disabled={!totalUnits} onPress={() => { Keyboard.dismiss(); onApply(); }}>
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
  memberRow: { borderTopWidth: 1, borderColor: theme.colors.neutral[200] },
  memberRowExpanded: { backgroundColor: theme.colors.primary[50] },
  memberHeading: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary[100], alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: theme.colors.primary[700], fontWeight: '800' },
  memberInfo: { flex: 1, minWidth: 0 },
  memberName: { color: theme.colors.text.primary, fontSize: 15, fontWeight: '700' },
  memberAmount: { color: theme.colors.text.secondary, fontSize: 13, marginTop: 3 },
  customBadge: { borderRadius: 6, backgroundColor: theme.colors.primary[100], paddingHorizontal: 7, paddingVertical: 5 },
  customBadgeText: { color: theme.colors.primary[700], fontSize: 11, fontWeight: '700' },
  expandedContent: { paddingHorizontal: 12, paddingBottom: 14 },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  countLabel: { flex: 1, color: theme.colors.text.secondary, fontSize: 12, fontWeight: '700' },
  stepper: { width: 156, height: 42, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.neutral[300], borderRadius: 8, backgroundColor: theme.colors.surface },
  stepButton: { width: 42, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepDisabled: { opacity: 0.35 },
  count: { flex: 1, textAlign: 'center', color: theme.colors.text.primary, fontSize: 14, fontWeight: '800' },
  guestInput: { width: '100%', borderWidth: 1, borderColor: theme.colors.neutral[200], borderRadius: 8, color: theme.colors.text.primary, backgroundColor: theme.colors.surface, paddingHorizontal: 12, minHeight: 42, fontSize: 13, marginTop: 12 },
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
