import React, { useEffect, useState } from 'react';
import { Keyboard, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

import { Text, TextInput } from '../i18n';
import { getLocale } from '../i18n/runtime';

import { TouchableOpacity } from '../i18n';

const toISODate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const MONTHS = {
  tr: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
const WEEKDAYS = {
  tr: ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
};

const parseISODate = (value) => {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`);
  return new Date();
};

const formatDisplayDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return '';
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
};

const maskDate = (text) => {
  const digits = String(text || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
};

const displayToISO = (text) => {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text || '');
  if (!match) return null;
  const [, day, month, year] = match;
  const candidate = new Date(`${year}-${month}-${day}T00:00:00`);
  if (Number.isNaN(candidate.getTime())
    || candidate.getFullYear() !== Number(year)
    || candidate.getMonth() + 1 !== Number(month)
    || candidate.getDate() !== Number(day)) return null;
  return `${year}-${month}-${day}`;
};

export default function DateField({ value, onChange, placeholder, minimumDate, maximumDate }) {
  const { theme } = useTheme();
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState(() => formatDisplayDate(value));
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = parseISODate(value);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const dateValue = parseISODate(value);

  useEffect(() => setDraft(formatDisplayDate(value)), [value]);

  const handleTextChange = (text) => {
    const next = maskDate(text);
    setDraft(next);
    const iso = displayToISO(next);
    if (iso) onChange(iso);
  };

  const styles = makeStyles(theme);
  const language = getLocale().startsWith('tr') ? 'tr' : 'en';
  const openCalendar = () => {
    Keyboard.dismiss();
    setVisibleMonth(new Date(dateValue.getFullYear(), dateValue.getMonth(), 1));
    setShow((current) => !current);
  };
  const firstDayOffset = (visibleMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const calendarCells = Array.from({ length: Math.ceil((firstDayOffset + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstDayOffset + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });
  const minTime = minimumDate instanceof Date ? new Date(minimumDate.getFullYear(), minimumDate.getMonth(), minimumDate.getDate()).getTime() : -Infinity;
  const maxTime = maximumDate instanceof Date ? new Date(maximumDate.getFullYear(), maximumDate.getMonth(), maximumDate.getDate()).getTime() : Infinity;

  return (
    <View>
      <View style={styles.field}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={handleTextChange}
          onBlur={() => setDraft(formatDisplayDate(value))}
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={10}
          placeholder={placeholder || 'gg.aa.yyyy'}
          placeholderTextColor={theme.colors.text.disabled}
        />
        <TouchableOpacity accessibilityLabel="Takvimden tarih seç" style={styles.calendarButton} onPress={openCalendar} activeOpacity={0.85}>
          <Ionicons name="calendar-outline" size={18} color={theme.colors.primary[600]} />
        </TouchableOpacity>
      </View>

      {show && (
        <View style={styles.sheet}>
              <View style={styles.monthHeader}>
                <TouchableOpacity accessibilityLabel="Önceki ay" style={styles.monthButton} onPress={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}>
                  <Ionicons name="chevron-back" size={20} color={theme.colors.primary[700]} />
                </TouchableOpacity>
                <Text style={styles.monthTitle}>{MONTHS[language][visibleMonth.getMonth()]} {visibleMonth.getFullYear()}</Text>
                <TouchableOpacity accessibilityLabel="Sonraki ay" style={styles.monthButton} onPress={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.primary[700]} />
                </TouchableOpacity>
              </View>
              <View style={styles.calendarGrid}>
                {Array.from({ length: 7 }, (_, index) => (
                  <Text key={`weekday-${index}`} style={styles.weekday}>{WEEKDAYS[language][index]}</Text>
                ))}
                {calendarCells.map((day, index) => {
                  const date = day ? new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day) : null;
                  const iso = date ? toISODate(date) : null;
                  const disabled = date && (date.getTime() < minTime || date.getTime() > maxTime);
                  return (
                    <View key={`date-${index}`} style={styles.dayCell}>
                      {day ? <TouchableOpacity
                        accessibilityLabel={`${day} ${MONTHS[language][visibleMonth.getMonth()]}`}
                        disabled={disabled}
                        style={[styles.dayButton, iso === value && styles.selectedDay]}
                        onPress={() => { onChange(iso); setDraft(formatDisplayDate(iso)); setShow(false); }}
                      >
                        <Text style={[styles.dayText, disabled && styles.disabledDayText, iso === value && styles.selectedDayText]}>{day}</Text>
                      </TouchableOpacity> : null}
                    </View>
                  );
                })}
              </View>
              <TouchableOpacity style={styles.doneBtn} onPress={() => setShow(false)} activeOpacity={0.85}>
                <Text style={styles.doneBtnText}>{language === 'tr' ? 'Kapat' : 'Close'}</Text>
              </TouchableOpacity>
        </View>
      )}

    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.sm,
    minHeight: 48,
    paddingLeft: 12,
  },
  input: { flex: 1, color: theme.colors.text.primary, fontSize: 13, paddingVertical: 10 },
  calendarButton: { width: 42, height: 46, alignItems: 'center', justifyContent: 'center' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    marginTop: 8,
    padding: 10,
  },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  monthTitle: { color: theme.colors.text.primary, fontSize: 16, fontWeight: '700' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', textAlign: 'center', color: theme.colors.text.secondary, fontSize: 12, paddingVertical: 8 },
  dayCell: { width: '14.2857%', height: 44, alignItems: 'center', justifyContent: 'center' },
  dayButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  selectedDay: { backgroundColor: theme.colors.primary[600] },
  dayText: { color: theme.colors.text.primary, fontSize: 14 },
  disabledDayText: { color: theme.colors.text.disabled },
  selectedDayText: { color: theme.colors.text.onPrimary, fontWeight: '700' },
  doneBtn: { marginTop: 12, padding: 14, borderRadius: theme.radius.sm, alignItems: 'center', backgroundColor: theme.colors.primary[600] },
  doneBtnText: { color: theme.colors.text.onPrimary, fontWeight: '700' },
});
