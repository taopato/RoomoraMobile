const keepMoneyCharacters = (value) => String(value ?? '').replace(/[^0-9.,]/g, '');

export const formatMoneyInput = (value) => {
  const raw = keepMoneyCharacters(value);
  if (!raw) return '';

  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');
  const dotCount = (raw.match(/\./g) || []).length;
  let decimalIndex = -1;

  if (lastComma >= 0 && lastDot >= 0) {
    decimalIndex = Math.max(lastComma, lastDot);
  } else if (lastComma >= 0) {
    decimalIndex = lastComma;
  } else if (lastDot >= 0) {
    const digitsAfterDot = raw.slice(lastDot + 1).replace(/\D/g, '').length;
    if (dotCount === 1 && digitsAfterDot <= 2) decimalIndex = lastDot;
  }

  const integerDigits = (decimalIndex >= 0 ? raw.slice(0, decimalIndex) : raw)
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '') || '0';
  const english = getActiveLanguage() === 'en';
  const groupSeparator = english ? ',' : '.';
  const decimalSeparator = english ? '.' : ',';
  const groupedInteger = integerDigits.replace(/\B(?=(\d{3})+(?!\d))/g, groupSeparator);

  if (decimalIndex < 0) return groupedInteger;
  const decimals = raw.slice(decimalIndex + 1).replace(/\D/g, '').slice(0, 2);
  return `${groupedInteger}${decimalSeparator}${decimals}`;
};

export const parseMoneyInput = (value) => {
  const raw = keepMoneyCharacters(value);
  if (!raw) return 0;
  const lastComma = raw.lastIndexOf(',');
  const lastDot = raw.lastIndexOf('.');
  const decimalIndex = Math.max(lastComma, lastDot);
  const digitsAfterSeparator = decimalIndex >= 0
    ? raw.slice(decimalIndex + 1).replace(/\D/g, '').length
    : 0;
  const hasDecimal = decimalIndex >= 0 && digitsAfterSeparator <= 2;
  const integer = (hasDecimal ? raw.slice(0, decimalIndex) : raw).replace(/\D/g, '') || '0';
  const decimals = hasDecimal ? raw.slice(decimalIndex + 1).replace(/\D/g, '').slice(0, 2) : '';
  const numeric = Number(decimals ? `${integer}.${decimals}` : integer);
  return Number.isFinite(numeric) ? numeric : 0;
};
import { getActiveLanguage } from '../i18n/runtime.js';
