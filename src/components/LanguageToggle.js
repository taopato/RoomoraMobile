import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../shared/theme/ThemeProvider';
import { Text, TouchableOpacity } from '../shared/i18n';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.container} accessibilityRole="radiogroup">
      <Ionicons name="language-outline" size={17} color={theme.colors.text.secondary} />
      {['tr', 'en'].map((option) => {
        const active = language === option;
        return (
          <TouchableOpacity
            key={option}
            accessibilityRole="radio"
            accessibilityLabel={option === 'tr' ? 'Türkçe' : 'English'}
            accessibilityState={{ checked: active }}
            onPress={() => setLanguage(option).catch(() => {})}
            style={[styles.option, active && styles.optionActive]}
            activeOpacity={0.82}
          >
            <Text style={[styles.optionText, active && styles.optionTextActive]}>
              {option.toUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: {
    alignSelf: 'flex-end',
    minHeight: 36,
    padding: 3,
    paddingLeft: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 14,
  },
  option: {
    minWidth: 38,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: {
    backgroundColor: theme.colors.primary[600],
  },
  optionText: {
    color: theme.colors.text.secondary,
    fontFamily: theme.typography.semibold,
    fontSize: 11,
    letterSpacing: 0,
  },
  optionTextActive: {
    color: theme.colors.text.onPrimary,
  },
});
