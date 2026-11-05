import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text } from '../shared/i18n';
import { useTheme } from '../shared/theme/ThemeProvider';

const BLACK_MARK = require('../assets/takosware-mark-black.png');
const WHITE_MARK = require('../assets/takosware-mark-white.png');

export default function TakoswareCredit({ compact = false }) {
  const { theme } = useTheme();
  const mark = theme.mode === 'light' ? BLACK_MARK : WHITE_MARK;
  const styles = makeStyles(theme, compact);

  return (
    <View style={styles.root} accessibilityLabel="Bir Takosware projesi. Tarık Çetintürk tarafından geliştirildi.">
      <Image source={mark} style={styles.mark} resizeMode="contain" accessibilityElementsHidden />
      <View style={styles.copy}>
        <Text style={styles.title}>Bir Takosware projesi</Text>
        {!compact ? <Text style={styles.subtitle}>Tarık Çetintürk tarafından geliştirildi.</Text> : null}
      </View>
    </View>
  );
}

const makeStyles = (theme, compact) => StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  mark: { width: compact ? 42 : 52, height: compact ? 42 : 52 },
  copy: { flexShrink: 1 },
  title: { color: theme.colors.text.secondary, fontSize: compact ? 11 : 13, fontWeight: '700' },
  subtitle: { color: theme.colors.text.secondary, fontSize: 11, marginTop: 2 },
});
