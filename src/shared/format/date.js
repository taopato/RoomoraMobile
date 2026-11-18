// API tarihleri UTC saklanır ama 'Z' olmadan gelir; saat dilimsiz ISO değeri UTC kabul et
const NAIVE_ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/;

export const parseApiDate = (value) => {
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value === 'string' && NAIVE_ISO_DATE_TIME.test(value.trim())) return new Date(`${value.trim()}Z`);
  return new Date(value);
};
