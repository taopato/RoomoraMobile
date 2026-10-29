const STORE_PATTERNS = [
  { pattern: /\bA\s*101\b|\bA101\b/i, name: 'A101' },
  { pattern: /\bM[Iİ]GROS\b/i, name: 'Migros' },
  { pattern: /\bB[Iİ]M\b|B[Iİ]RLE[SŞ][Iİ]K\s+MA[GĞ]AZALAR/i, name: 'BİM' },
  { pattern: /\b[SŞ]OK\s+MARKET/i, name: 'ŞOK' },
  { pattern: /\bCARREFOUR\s*SA\b/i, name: 'CarrefourSA' },
];

export const getReceiptStoreName = (receipt) => {
  const header = String(receipt?.rawOcrText || '').split(/\r?\n/).slice(0, 12).join(' ');
  const candidate = `${receipt?.storeName || ''} ${header}`;
  const chain = STORE_PATTERNS.find(({ pattern }) => pattern.test(candidate))?.name;
  if (chain) return chain;
  const name = String(receipt?.storeName || '').trim().replace(/\s+/g, ' ');
  if (name.length <= 50 && /(?:market|g[ıi]da|bakkal|manav)/i.test(name)
    && !/(?:e-ar[sş]iv|fatura|fi[sş]|tarih|toplam|\d{2}[./]\d{2}[./]\d{4})/i.test(name)) {
    return name;
  }
  return null;
};

export const getReceiptTitle = (receipt, locale = 'tr') => {
  const store = getReceiptStoreName(receipt);
  const noun = locale.startsWith('en') ? 'Receipt' : 'Fişi';
  return store ? `${store} ${noun}` : (locale.startsWith('en') ? 'Receipt' : 'Fiş');
};

export const getReadableReceiptItemName = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  let name = raw
    .replace(/PIZZAKING/gi, 'Pizza King ')
    .replace(/(\d+(?:[.,]\d+)?)\s*(KG|GR|G|ML|LT|L)(?=\b|[A-Z])/gi, '$1 $2 ')
    .replace(/\s+/g, ' ')
    .trim();
  // A trailing receipt code is not a reliable product attribute.
  name = name.replace(/\b(\d+\s*(?:KG|GR|G|ML|LT|L))\s*[A-Z]{2,3}$/i, '$1');
  if (name === name.toLocaleUpperCase('tr-TR')) {
    return name.toLowerCase()
      .replace(/(^|[\s.-])\p{L}/gu, (part) => part.toUpperCase())
      .replace(/\bPilic\b/g, 'Piliç');
  }
  return name;
};
