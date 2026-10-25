import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const out = join(process.cwd(), 'media', 'store');
const today = new Date().toISOString();
const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString();
const people = [
  { userId: 101, fullName: 'Deniz Yılmaz' },
  { userId: 102, fullName: 'Ece Arslan' },
  { userId: 103, fullName: 'Mert Kaya' },
];
const scenarios = {
  home: {
    user: { id: 101, fullName: 'Deniz Yılmaz', defaultHouseId: 501, defaultHouseName: 'Örnek Ev', defaultHouseType: 'Home' },
    expenses: [
      { id: 1, tur: 'Elektrik faturası', categoryId: 2, tutar: 840, postDate: daysAgo(1), odeyenKullaniciAdi: 'Deniz Yılmaz' },
      { id: 2, tur: 'Su faturası', categoryId: 3, tutar: 420, postDate: daysAgo(2), odeyenKullaniciAdi: 'Ece Arslan' },
      { id: 3, tur: 'Haftalık market', categoryId: 4, tutar: 960, postDate: daysAgo(3), odeyenKullaniciAdi: 'Mert Kaya' },
      { id: 4, tur: 'İnternet faturası', categoryId: 1, tutar: 600, postDate: daysAgo(5), odeyenKullaniciAdi: 'Deniz Yılmaz' },
      { id: 5, tur: 'Ekim kirası', categoryId: 0, tutar: 18000, postDate: daysAgo(7), odeyenKullaniciAdi: 'Ece Arslan' },
    ],
    debts: { totals: [{ userId: 101, payable: 710, receivable: 420 }], pairs: [
      { fromUserId: 101, toUserId: 102, fromUserName: 'Deniz Yılmaz', toUserName: 'Ece Arslan', netAmount: 710 },
      { fromUserId: 103, toUserId: 101, fromUserName: 'Mert Kaya', toUserName: 'Deniz Yılmaz', netAmount: 420 },
    ] },
    pending: [{ id: 901, tutar: 420, odemeTarihi: today, borcluUserId: 103, alacakliUserId: 101, borcluUserName: 'Mert Kaya', alacakliUserName: 'Deniz Yılmaz', onayDurumu: 'Pending', aciklama: 'Market payı' }],
  },
  trip: {
    user: { id: 101, fullName: 'Deniz Yılmaz', defaultHouseId: 502, defaultHouseName: 'Kapadokya Gezisi', defaultHouseType: 'Trip' },
    expenses: [
      { id: 11, tur: 'Otel - iki gece', categoryId: 99, tutar: 7200, postDate: daysAgo(1), odeyenKullaniciAdi: 'Ece Arslan' },
      { id: 12, tur: 'Akşam yemeği', categoryId: 5, tutar: 1350, postDate: daysAgo(2), odeyenKullaniciAdi: 'Deniz Yılmaz' },
      { id: 13, tur: 'Havalimanı transferi', categoryId: 99, tutar: 900, postDate: daysAgo(3), odeyenKullaniciAdi: 'Mert Kaya' },
      { id: 14, tur: 'Kahvaltı', categoryId: 5, tutar: 750, postDate: daysAgo(4), odeyenKullaniciAdi: 'Ece Arslan' },
    ],
    debts: { totals: [{ userId: 101, payable: 1950, receivable: 450 }], pairs: [
      { fromUserId: 101, toUserId: 102, fromUserName: 'Deniz Yılmaz', toUserName: 'Ece Arslan', netAmount: 1950 },
      { fromUserId: 103, toUserId: 101, fromUserName: 'Mert Kaya', toUserName: 'Deniz Yılmaz', netAmount: 450 },
    ] },
    pending: [],
  },
};

const answer = (url, data) => {
  if (/Expenses\/GetExpenses/.test(url)) return data.expenses;
  if (/Houses\/GetUserDebts/.test(url)) return data.debts;
  if (/Houses\/\d+\/members/i.test(url)) return people;
  if (/QuickExpenseTemplates/.test(url)) return [];
  if (/Payments\/GetPendingPayments/.test(url)) return data.pending;
  if (/RecurringCharges/.test(url)) return [];
  if (/Payments\/GetPayments/.test(url)) return [];
  return [];
};

await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
for (const [scenario, data] of Object.entries(scenarios)) {
  for (const language of ['tr', 'en']) {
    const localized = language === 'en' ? {
      ...data,
      user: { ...data.user, defaultHouseName: scenario === 'home' ? 'Sample Home' : 'Cappadocia Trip' },
      expenses: data.expenses.map((expense) => ({ ...expense, tur: ({
        'Elektrik faturası': 'Electricity bill', 'Su faturası': 'Water bill',
        'Haftalık market': 'Weekly groceries', 'İnternet faturası': 'Internet bill',
        'Ekim kirası': 'October rent', 'Otel - iki gece': 'Hotel - two nights',
        'Akşam yemeği': 'Dinner', 'Havalimanı transferi': 'Airport transfer',
        'Kahvaltı': 'Breakfast',
      })[expense.tur] ?? expense.tur })),
    } : data;
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, locale: language === 'tr' ? 'tr-TR' : 'en-US', reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.addInitScript(({ user, language }) => {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('roomora.accessToken', 'local-demo-only');
      localStorage.setItem('appLanguage', language);
    }, { user: localized.user, language });
    await page.route('**/api/**', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(answer(route.request().url(), localized)) }));
    await page.goto('http://localhost:8092', { waitUntil: 'domcontentloaded' });
    await page.getByText(language === 'tr' ? 'Son İşlemler' : 'Recent Activity').waitFor({ timeout: 15000 });
    await page.waitForTimeout(750);
    const prefix = `${scenario}-${language}`;
    await page.screenshot({ path: join(out, `${prefix}-01-home.png`) });
    await page.getByText(language === 'tr' ? 'TOPLAM BAKİYEM' : 'TOTAL BALANCE').click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: join(out, `${prefix}-04-balance.png`) });
    await page.getByText(language === 'tr' ? 'Ödeme Yap' : 'Make Payment').last().click();
    await page.waitForTimeout(650);
    await page.getByText('Ece Arslan', { exact: true }).last().click();
    await page.locator('input:visible').first().fill('710');
    await page.getByText(language === 'tr' ? 'Ödenecek borcu seç' : 'Choose a debt to pay').click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(out, `${prefix}-06-payment.png`) });
    await page.goBack();
    await page.waitForTimeout(300);
    await page.goBack();
    await page.waitForTimeout(450);
    if (scenario === 'home') {
      await page.getByText(language === 'tr' ? 'Faturalar' : 'Bills', { exact: true }).last().click();
      await page.waitForTimeout(550);
      await page.screenshot({ path: join(out, `${prefix}-05-bills.png`) });
    }
    await page.getByText(language === 'tr' ? 'Giderler' : 'Expenses', { exact: true }).last().click();
    await page.getByText(language === 'tr' ? 'Harcama Geçmişi' : 'Expense History').waitFor({ timeout: 10000 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(out, `${prefix}-02-expenses.png`) });
    await page.getByText(language === 'tr' ? 'Yeni Harcama Ekle' : 'Add Expense').last().click();
    await page.waitForTimeout(1100);
    await page.locator('input:visible').first().fill(scenario === 'home' ? '960' : '1350');
    await page.locator('input:visible').nth(1).fill(scenario === 'home'
      ? (language === 'tr' ? 'Haftalık market' : 'Weekly groceries')
      : (language === 'tr' ? 'Akşam yemeği' : 'Dinner'));
    await page.getByText(scenario === 'home' ? (language === 'tr' ? 'Market' : 'Groceries') : (language === 'tr' ? 'Yemek' : 'Food'), { exact: true }).last().click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(out, `${prefix}-03-add-expense.png`) });
    await page.getByText('Ece Arslan', { exact: true }).last().click();
    await page.getByText('Mert Kaya', { exact: true }).last().click();
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(out, `${prefix}-07-selected-split.png`) });
    await context.close();
  }
}
await browser.close();
console.log(`Demo captures: ${out} (${today})`);
