const toNumber = (value, fallback = 0) => {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const parseReceiptAmount = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  const negative = /[-−]/.test(raw);
  let normalized = raw
    .replace(/TL/gi, '')
    .replace(/[-−*xX+]/g, '')
    .replace(/\s+/g, '');

  if ((normalized.match(/[,.]/g) || []).length > 1 || (normalized.includes(',') && normalized.includes('.'))) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return negative ? -parsed : parsed;
};

const RECEIPT_META_KEYWORDS = [
  'TCKN', 'VKN', 'VERGI', 'NİHAI', 'NIHAI', 'HESAP ADI', 'HESAP KODU',
  'BAKIYE', 'TARIH', 'SAAT', 'SATIS', 'KASIYER', 'ALINAN PARA', 'PARA USTU',
  'GENEL TOPLAM', 'TOPLAM KDV', 'ODENECEK', 'TUTAR', 'FIS NO', 'Z NO',
  'VERESIYE', 'KDV FISI',
];

export const isReceiptMetaName = (value) => {
  const upper = String(value || '').trim().toUpperCase();
  if (!upper) return true;
  if (RECEIPT_META_KEYWORDS.some((keyword) => upper.includes(keyword))) return true;
  if (/^\d{6,}$/.test(upper)) return true;
  if (/^\d+\s+AD(?:ET)?\s+X\s+\d/.test(upper)) return true;
  return false;
};

const cleanProductName = (value) => String(value || '')
  .replace(/%\s*\d+[.,]?\d*/g, '')
  .replace(/\b\d+(?:[.,]\d+)?\s*(?:L|LT|ML|GR|G|KG|CL)\b/gi, '')
  .replace(/[*:.-]+$/g, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

const productMatchKey = (value) => cleanProductName(value)
  .toLocaleUpperCase('tr-TR')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^A-Z0-9]/g, '');

const makeItem = (name, amount) => ({
  name: cleanProductName(name),
  price: amount,
  quantity: 1,
  lineTotal: amount,
  isAssigned: false,
  isShared: true,
  personalUserId: null,
});

const extractDiscount = (line, assumeDiscount = false) => {
  const normalized = String(line || '').trim();
  const matches = [...normalized.matchAll(/[-−]\s*(\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{2}))/g)];
  const fallbackMatches = assumeDiscount
    ? [...normalized.matchAll(/\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{2})/g)]
    : [];
  const match = matches.at(-1) || fallbackMatches.at(-1);
  if (!match) return null;
  const amount = Math.abs(parseReceiptAmount(match[0]) || 0);
  const name = cleanProductName(normalized.slice(0, match.index));
  return amount > 0 && name && !isReceiptMetaName(name) ? { name, amount } : null;
};

const applyDiscounts = (items, discounts) => {
  discounts.forEach((discount) => {
    const key = productMatchKey(discount.name);
    const candidates = items.filter((item) => {
      const itemKey = productMatchKey(item.name);
      return key && itemKey && (key === itemKey || key.includes(itemKey) || itemKey.includes(key));
    });
    if (!candidates.length) return;

    const item = candidates.sort((a, b) => toNumber(b.lineTotal) - toNumber(a.lineTotal))[0];
    const original = toNumber(item.originalLineTotal ?? item.lineTotal);
    const applied = toNumber(item.discountAmount) + discount.amount;
    const net = Math.max(0, Number((original - applied).toFixed(2)));
    item.originalLineTotal = original;
    item.discountAmount = Number(applied.toFixed(2));
    item.lineTotal = net;
    if (toNumber(item.quantity, 1) === 1) item.price = net;
  });
};

const splitSegmentedReceiptLine = (line) => {
  const normalized = String(line || '').trim();
  if (/[-−]\s*\d/.test(normalized)) return [];
  const matches = [...normalized.matchAll(/\*?\s*(\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{2})?)/g)];
  if (matches.length < 2) return [];

  const items = [];
  let previousEnd = 0;
  matches.forEach((match) => {
    const amount = parseReceiptAmount(match[0]);
    const name = cleanProductName(normalized.slice(previousEnd, match.index));
    previousEnd = (match.index ?? 0) + match[0].length;
    if (amount > 0 && name && !isReceiptMetaName(name)) items.push(makeItem(name, amount));
  });
  return items;
};

const synthesizeItemsFromRawText = (rawText, detectedTotalAmount = 0) => {
  const text = String(rawText || '').trim();
  if (!text) return detectedTotalAmount > 0 ? [makeItem('Fiş Toplamı', detectedTotalAmount)] : [];

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const items = [];
  const discounts = [];
  let inDiscountSection = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const upper = line.toLocaleUpperCase('tr-TR');
    if (/ÜRÜN İNDİRİMLERİ|URUN INDIRIMLERI/.test(upper)) {
      inDiscountSection = true;
      continue;
    }
    if (inDiscountSection && /MAL[ /]HİZMET|MAL[ /]HIZMET|ÖDENECEK|ODENECEK|TOPKDV|TOPLAM KDV/.test(upper)) {
      inDiscountSection = false;
    }

    const discount = extractDiscount(line, inDiscountSection);
    if (discount) {
      discounts.push(discount);
      continue;
    }
    if (inDiscountSection) continue;

    const decimalAmounts = [...line.matchAll(/\*?\s*(\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{2}))/g)];
    const lastAmount = decimalAmounts.at(-1);
    if (lastAmount) {
      const amount = parseReceiptAmount(lastAmount[0]);
      const name = cleanProductName(line.slice(0, lastAmount.index));
      if (amount > 0 && /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(name) && !isReceiptMetaName(name)) {
        items.push(makeItem(name, amount));
        continue;
      }
    }

    const segmentedItems = splitSegmentedReceiptLine(line);
    if (segmentedItems.length > 0) {
      items.push(...segmentedItems);
      continue;
    }
    if (isReceiptMetaName(line)) continue;

    const inlineMatch = line.match(/^(?<name>.*?)(?<amount>\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{2}))$/);
    if (inlineMatch?.groups?.name && inlineMatch?.groups?.amount) {
      const amount = parseReceiptAmount(inlineMatch.groups.amount);
      const name = cleanProductName(inlineMatch.groups.name);
      if (amount > 0 && /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(name)) {
        items.push(makeItem(name, amount));
        continue;
      }
    }

    const nextLine = lines[index + 1];
    const amount = parseReceiptAmount(nextLine);
    if (/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(line) && amount > 0) {
      items.push(makeItem(line, amount));
      index += 1;
    }
  }

  applyDiscounts(items, discounts);
  if (items.length > 0) return items.map((item, index) => ({ ...item, sortOrder: index }));
  return detectedTotalAmount > 0 ? [{ ...makeItem('Fiş Toplamı', detectedTotalAmount), sortOrder: 0 }] : [];
};

export const normalizeReceiptItems = (items = []) => items.map((item, index) => ({
  ...item,
  sortOrder: item?.sortOrder ?? index,
  name: item?.name ?? '',
  price: toNumber(item?.price),
  quantity: toNumber(item?.quantity, 1),
  lineTotal: toNumber(item?.lineTotal ?? item?.price),
  discountAmount: toNumber(item?.discountAmount),
  originalLineTotal: item?.originalLineTotal == null ? undefined : toNumber(item.originalLineTotal),
  isAssigned: item?.isAssigned === true,
  isShared: item?.isShared !== false,
}));

export const extractDetectedTotalFromRawText = (rawText) => {
  const lines = String(rawText || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const priorities = [/ÖDENECEK|ODENECEK/i, /GENEL TOPLAM/i, /TOPLAM|TUTAR/i];
  for (const priority of priorities) {
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const line = lines[index];
      if (!priority.test(line) || /TOPLAM KDV/i.test(line)) continue;
      const matches = [...line.matchAll(/\d{1,3}(?:[ .]\d{3})*(?:[.,]\d{2})/g)];
      const amount = parseReceiptAmount(matches.at(-1)?.[0]);
      if (amount > 0) return amount;
    }
  }
  return 0;
};

export const isMeaningfulReceiptItem = (item) => {
  const name = String(item?.name || '').trim();
  const lineTotal = toNumber(item?.lineTotal ?? item?.price);
  const price = toNumber(item?.price);
  if (!name && lineTotal <= 0 && price <= 0) return false;
  if (/^isimsiz kalem$/i.test(name) && lineTotal <= 0 && price <= 0) return false;
  if (!/kalem|toplam/i.test(name) && isReceiptMetaName(name)) return false;
  return true;
};

export const normalizeResolvedItems = (items = []) => items
  .filter(isMeaningfulReceiptItem)
  .map((item, index) => ({ ...item, sortOrder: index }));

export const calculateItemsTotal = (items = []) => items.reduce(
  (sum, item) => sum + toNumber(item?.lineTotal ?? item?.price),
  0
);

export const resolveReceiptItems = (preferredItems = [], rawText = '', detectedTotalAmount = 0) => {
  const sanitizedPreferred = normalizeResolvedItems(normalizeReceiptItems(preferredItems));
  if (sanitizedPreferred.length) return sanitizedPreferred;
  return normalizeResolvedItems(synthesizeItemsFromRawText(rawText, detectedTotalAmount));
};
