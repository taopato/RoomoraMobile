import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextInput, TouchableOpacity } from '../i18n';

export default function PasswordInput({ style, toggleColor = '#667786', ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.container}>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
        style={[style, styles.input]}
        secureTextEntry={!visible}
      />
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
        accessibilityState={{ selected: visible }}
        onPress={() => setVisible((current) => !current)}
        style={styles.toggle}
      >
        <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={21} color={toggleColor} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  input: { paddingRight: 54 },
  toggle: { position: 'absolute', right: 4, top: 4, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
