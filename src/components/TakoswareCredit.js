import React from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { Text } from '../shared/i18n';
import { useTheme } from '../shared/theme/ThemeProvider';

const BLACK_MARK = require('../assets/takosware-mark-black.png');

export default function TakoswareCredit({ compact = false }) {
  const { theme } = useTheme();
  const styles = makeStyles(theme, compact);
  const markSize = compact ? 52 : 64;
  const webMark = Platform.OS === 'web' && React.createElement('img', {
    src: BLACK_MARK?.uri || BLACK_MARK,
    alt: '',
    'aria-hidden': true,
    style: {
      width: markSize,
      height: markSize,
      objectFit: 'contain',
      filter: theme.mode === 'light' ? 'none' : 'invert(1)',
    },
  });

  return (
    <View style={styles.root} accessibilityLabel="Bir Takosware projesi. Tarık Çetintürk tarafından geliştirildi.">
      {webMark || <Image source={BLACK_MARK} style={[styles.mark, theme.mode !== 'light' && { tintColor: theme.colors.text.primary }]} resizeMode="contain" accessibilityElementsHidden />}
      <View style={styles.copy}>
        <Text style={styles.title}>Bir Takosware projesi</Text>
        {!compact ? <Text style={styles.subtitle}>Tarık Çetintürk tarafından geliştirildi.</Text> : null}
      </View>
    </View>
  );
}

const makeStyles = (theme, compact) => StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  mark: { width: compact ? 52 : 64, height: compact ? 52 : 64 },
  copy: { flexShrink: 1 },
  title: { color: theme.colors.text.secondary, fontSize: compact ? 11 : 13, fontWeight: '700' },
  subtitle: { color: theme.colors.text.secondary, fontSize: 11, marginTop: 2 },
});
