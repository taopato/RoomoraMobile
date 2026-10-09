import React, { forwardRef } from 'react';
import { StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

import { TextInput as RNTextInput } from '../../i18n';

type Props = Omit<TextInputProps, 'style'> & {
  value: string;
  onChangeText: (text: string) => void;
  style?: ViewStyle;
  disabled?: boolean;
};

export const PremiumTextInput = forwardRef<
  React.ElementRef<typeof RNTextInput>,
  Props
>(({ style,
  disabled,
  ...inputProps
}, ref) => {
  const { theme } = useTheme();
  const r = theme.radius;
  const s = theme.spacing;
  const ph = theme.colors.text.disabled;
  const typo = (theme as any)?.typography?.body || { size: 16 };
  return (
    <RNTextInput
      ref={ref}
      {...inputProps}
      placeholderTextColor={ph}
      editable={!disabled}
      style={[
        styles.input,
        {
          borderColor: theme.colors.neutral[300],
          backgroundColor: theme.colors.surface,
          color: theme.colors.text.primary,
          borderRadius: r.sm,
          paddingHorizontal: s.lg,
          paddingVertical: s.md,
          fontSize: (typo as any).size,
        },
        disabled && { opacity: 0.6, backgroundColor: theme.colors.neutral[100] },
        style,
      ]}
    />
  );
});

PremiumTextInput.displayName = 'PremiumTextInput';

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    minHeight: 54,
  },
});


