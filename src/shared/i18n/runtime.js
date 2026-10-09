import { englishPartialTranslations, englishTranslations } from './translations.js';

let activeLanguage = 'tr';

export const setActiveLanguage = (language) => {
  activeLanguage = language === 'en' ? 'en' : 'tr';
};

export const getActiveLanguage = () => activeLanguage;
export const getLocale = () => (activeLanguage === 'en' ? 'en-US' : 'tr-TR');

const preserveWhitespace = (source, translated) => {
  const leading = source.match(/^\s*/)?.[0] ?? '';
  const trailing = source.match(/\s*$/)?.[0] ?? '';
  return `${leading}${translated}${trailing}`;
};

export const translate = (value, language = activeLanguage) => {
  if (language !== 'en' || typeof value !== 'string' || !value) return value;
  const trimmed = value.trim();
  if (!trimmed) return value;

  const exact = englishTranslations[trimmed];
  if (exact) return preserveWhitespace(value, exact);

  let translated = trimmed;
  for (const [source, target] of Object.entries(englishPartialTranslations).sort((a, b) => b[0].length - a[0].length)) {
    translated = translated.split(source).join(target);
  }
  return preserveWhitespace(value, translated);
};
