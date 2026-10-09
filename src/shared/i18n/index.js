import React, { forwardRef } from 'react';
import {
  Alert as NativeAlert,
  Text as NativeText,
  TextInput as NativeTextInput,
  TouchableOpacity as NativeTouchableOpacity,
} from 'react-native';
import { translate } from './runtime';
export { getActiveLanguage, getLocale, setActiveLanguage, translate } from './runtime';

const translateNode = (node, language) => {
  if (typeof node === 'string') return translate(node, language);
  if (Array.isArray(node)) return node.map((child) => translateNode(child, language));
  return node;
};

const useCurrentLanguage = () => {
  const { useLanguage } = require('../../context/LanguageContext');
  return useLanguage().language;
};

export const Text = /** @type {typeof NativeText} */ (forwardRef(function LocalizedText({ children, ...props }, ref) {
  const language = useCurrentLanguage();
  return <NativeText ref={ref} {...props}>{translateNode(children, language)}</NativeText>;
}));

export const TextInput = /** @type {typeof NativeTextInput} */ (forwardRef(function LocalizedTextInput(props, ref) {
  const language = useCurrentLanguage();
  return (
    <NativeTextInput
      ref={ref}
      {...props}
      placeholder={translate(props.placeholder, language)}
      accessibilityLabel={translate(props.accessibilityLabel, language)}
    />
  );
}));

export const TouchableOpacity = /** @type {typeof NativeTouchableOpacity} */ (forwardRef(function LocalizedTouchableOpacity(props, ref) {
  const language = useCurrentLanguage();
  return (
    <NativeTouchableOpacity
      ref={ref}
      {...props}
      accessibilityLabel={translate(props.accessibilityLabel, language)}
      accessibilityHint={translate(props.accessibilityHint, language)}
    />
  );
}));

export const Alert = {
  alert(title, message, buttons, options) {
    const localizedButtons = buttons?.map((button) => ({
      ...button,
      text: translate(button.text),
    }));
    return NativeAlert.alert(
      translate(title),
      translate(message),
      localizedButtons,
      options
    );
  },
};
