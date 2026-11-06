import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../shared/theme/ThemeProvider';
import { Text, TouchableOpacity } from '../shared/i18n';

export default function MemberSelectionCard({
  label,
  value,
  icon,
  members,
  selectedIds,
  onSelect,
  allLabel,
  onSelectAll,
  footer,
}) {
  const { theme } = useTheme();
  const styles = makeStyles(theme);
  const selected = new Set((selectedIds || []).map(String));
  const allSelected = members.length > 0 && members.every((member) => selected.has(String(member.id)));

  return (
    <View style={styles.card}>
      <View style={styles.icon}><Ionicons name={icon} size={21} color={theme.colors.primary[700]} /></View>
      <View style={styles.body}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value} numberOfLines={2}>{value || 'Seç'}</Text>
      </View>
      <View style={styles.chips}>
        {allLabel ? (
          <TouchableOpacity style={[styles.chip, allSelected && styles.active]} onPress={onSelectAll} activeOpacity={0.8}>
            <Text style={[styles.chipText, allSelected && styles.activeText]}>{allLabel}</Text>
          </TouchableOpacity>
        ) : null}
        {members.map((member) => {
          const active = selected.has(String(member.id));
          return (
            <TouchableOpacity
              key={String(member.id)}
              accessibilityLabel={`${member.fullName} ${label}`}
              style={[styles.chip, active && styles.active]}
              onPress={() => onSelect(member.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, active && styles.activeText]}>{member.fullName}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {footer}
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.neutral[200], padding: 14, borderRadius: 8, marginBottom: 10, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  icon: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 110 },
  label: { color: theme.colors.text.secondary, fontFamily: theme.typography.medium, fontSize: 12 },
  value: { color: theme.colors.text.primary, fontFamily: theme.typography.semibold, fontSize: 15, marginTop: 2 },
  chips: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.colors.neutral[300], borderRadius: 20, backgroundColor: theme.colors.background },
  active: { borderColor: theme.colors.primary[600], backgroundColor: theme.colors.primary[50] },
  chipText: { color: theme.colors.text.primary, fontWeight: '500' },
  activeText: { color: theme.colors.primary[700], fontWeight: '700' },
});
