const { test, expect } = require('@playwright/test');

const baseUrl = 'http://localhost:8092';
const user = { id: 101, fullName: 'Deniz Yılmaz', email: 'demo@example.com', defaultHouseId: 501, defaultHouseName: 'Örnek Ev', defaultHouseType: 'Home' };
const members = [
  { userId: 101, fullName: 'Deniz Yılmaz' },
  { userId: 102, fullName: 'Ece Arslan' },
  { userId: 103, fullName: 'Mert Kaya' },
];

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });

async function useDemoSession(page, receipt = null, theme = 'light') {
  await page.addInitScript(({ demoUser, themeKey }) => {
    localStorage.setItem('user', JSON.stringify(demoUser));
    localStorage.setItem('roomora.accessToken', 'local-demo-only');
    localStorage.setItem('appLanguage', 'tr');
    localStorage.setItem('app_theme', themeKey);
  }, { demoUser: user, themeKey: theme });
  await page.route('**/api/**', (route) => {
    const url = route.request().url();
    const body = /Houses\/\d+\/members/i.test(url) ? members
      : /Houses\/GetUserDebts/i.test(url) ? { totals: [], pairs: [] }
        : /Receipts\/ByHouse/i.test(url) ? (receipt ? [receipt] : [])
          : /Receipts\/\d+$/i.test(url) ? receipt
        : [];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}

test('settings and notifications stay aligned on mobile widths', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await useDemoSession(page);

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.getByText('Ayarlar', { exact: true }).last().click();
    await expect(page.getByText('Bir Takosware projesi')).toBeVisible();
    const brandImage = page.locator('img[aria-hidden="true"]').first();
    await expect(brandImage).toBeVisible();
    await expect.poll(() => brandImage.evaluate((img) => ({ complete: img.complete, width: img.naturalWidth }))).toEqual({ complete: true, width: 1254 });
    await page.screenshot({ path: testInfo.outputPath(`settings-${width}.png`) });

    await page.getByText('Bildirim Ayarları', { exact: true }).last().click();
    await expect(page.getByText('Ara verme hatırlatması')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`notifications-${width}.png`) });
    const switches = page.getByRole('switch');
    await expect(switches).toHaveCount(4);
    const boxes = await switches.evaluateAll((nodes) => nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }));
    expect(boxes.every((box) => box.x + box.width <= width && box.x >= 0)).toBe(true);
    expect(boxes.every((box, index) => index === 0 || box.y > boxes[index - 1].y)).toBe(true);
    for (const key of ['payment', 'bill', 'house', 'inactivity']) {
      const row = await page.getByTestId(`notification-row-${key}`).boundingBox();
      const toggle = await page.getByRole('switch').nth(['payment', 'bill', 'house', 'inactivity'].indexOf(key)).boundingBox();
      expect(Math.abs((row.y + row.height / 2) - (toggle.y + toggle.height / 2)), key).toBeLessThanOrEqual(3);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  }
  expect(errors).toEqual([]);
});

test('converted receipt status stays compact and readable', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const receipt = {
    id: 63,
    status: 'Converted',
    storeName: 'Migros',
    receiptDate: '2026-11-05T18:00:00Z',
    createdAt: '2026-11-06T12:00:00Z',
    detectedTotalAmount: 220,
    items: [{ id: 1, name: 'Tavuk', quantity: 1, price: 220, lineTotal: 220, sortOrder: 0 }],
  };
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await useDemoSession(page, receipt);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.getByText('Giderler', { exact: true }).last().click();
  await page.getByText('Yeni Harcama Ekle', { exact: true }).last().click();
  await page.getByText('Fiş Geçmişi', { exact: true }).last().click();
  await expect(page.getByText('Migros', { exact: false }).first()).toBeVisible();
  await page.getByText('Migros', { exact: false }).first().click();
  const notice = page.getByLabel('Harcamaya dönüştürüldü, salt okunur');
  await expect(notice).toBeVisible();
  expect((await notice.boundingBox()).height).toBeLessThan(32);
  await page.screenshot({ path: testInfo.outputPath('converted-receipt.png') });
  expect(errors).toEqual([]);
});

test('dark settings and notification controls remain usable', async ({ page }, testInfo) => {
  await useDemoSession(page, null, 'amoled');
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.getByText('Ayarlar', { exact: true }).last().click();
  await expect(page.getByText('Bir Takosware projesi')).toBeVisible();
  await expect.poll(() => page.locator('img[src*="takosware-mark-black"]').evaluate((img) => img.naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath('dark-settings.png') });
  await page.getByText('Bildirim Ayarları', { exact: true }).last().click();
  const paymentSwitch = page.getByRole('switch', { name: 'Ödeme bildirimleri' });
  await expect(paymentSwitch).toBeChecked();
  await paymentSwitch.click();
  await expect(paymentSwitch).not.toBeChecked();
  await page.screenshot({ path: testInfo.outputPath('dark-notifications.png') });
});

test('primary screens and settings subpages render at mobile width', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await useDemoSession(page);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  const capture = async (name) => {
    await page.screenshot({ path: testInfo.outputPath(`${name}.png`) });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, name).toBeLessThanOrEqual(2);
  };

  await expect(page.getByText('Son İşlemler')).toBeVisible();
  await capture('01-home');
  await page.getByText('Giderler', { exact: true }).last().click();
  await expect(page.getByText('Harcama Geçmişi')).toBeVisible();
  await capture('02-expenses');
  await page.getByText('Yeni Harcama Ekle', { exact: true }).last().click();
  await expect(page.getByText('Harcama Ekle', { exact: true }).last()).toBeVisible();
  await capture('03-add-expense');
  await page.goBack();
  await page.getByText('Notlar', { exact: true }).last().click();
  await capture('04-notes');
  await page.getByText('Faturalar', { exact: true }).last().click();
  await capture('05-bills');
  await page.getByText('Ayarlar', { exact: true }).last().click();
  await capture('06-settings');

  for (const [label, name] of [
    ['Tema Ayarları', '07-theme'],
    ['Dil Ayarları', '08-language'],
    ['Güvenlik', '09-security'],
    ['Hakkında', '10-about'],
  ]) {
    await page.getByText(label, { exact: true }).last().click();
    await expect(page.getByLabel('Geri')).toBeVisible();
    await capture(name);
    await page.getByLabel('Geri').click();
  }
  expect(errors).toEqual([]);
});

test('secondary routes render without horizontal overflow', async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await useDemoSession(page);
  for (const [route, title] of [
    ['debt-summary', 'Borç / Alacak Özeti'],
    ['ev-uyeleri', 'Ev Üyeleri'],
    ['bekleyen-odemeler', 'Bekleyen Ödemeler'],
    ['bildirimler', 'Bildirimler'],
  ]) {
    await page.goto(`${baseUrl}/${route}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`${route}.png`) });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, route).toBeLessThanOrEqual(2);
  }
  expect(errors).toEqual([]);
});

test('expense shares and receipt item editor open and close cleanly', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const receipt = {
    id: 63,
    status: 'Parsed',
    storeName: 'Migros',
    receiptDate: '2026-11-05T18:00:00Z',
    createdAt: '2026-11-06T12:00:00Z',
    detectedTotalAmount: 220,
    items: [{ id: 1, name: 'Tavuk', quantity: 1, price: 220, lineTotal: 220, sortOrder: 0, boxLeft: 0.2, boxTop: 0.1, boxWidth: 0.4, boxHeight: 0.05 }],
  };
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await useDemoSession(page, receipt);
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.getByText('Giderler', { exact: true }).last().click();
  await page.getByText('Yeni Harcama Ekle', { exact: true }).last().click();
  await page.getByText('Payları özelleştir', { exact: true }).last().click();
  await expect(page.getByLabel('Deniz Yılmaz paylaşımını düzenle')).toBeVisible();
  await page.getByLabel('Deniz Yılmaz paylaşımını düzenle').click();
  await page.getByLabel('Deniz Yılmaz payını artır').click();
  await expect(page.getByText('Ek pay', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('expense-shares.png') });
  await page.getByLabel('Kapat').click();
  await expect(page.getByLabel('Kapat')).toBeHidden();
  await page.getByText('Fiş ile eklemek ister misin?').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('add-expense-receipt-actions.png') });
  await page.getByText('Fiş Geçmişi', { exact: true }).last().click();
  await page.getByText('Migros', { exact: false }).first().click();
  await page.screenshot({ path: testInfo.outputPath('receipt-draft.png') });
  await page.getByLabel('Tavuk, kalemi düzenle').click();
  await expect(page.getByText('Kalemi düzenle', { exact: true })).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: testInfo.outputPath('receipt-editor.png') });
  await page.getByTestId('receipt-editor-backdrop').click({ position: { x: 10, y: 10 }, force: true });
  await expect(page.getByText('Kalemi düzenle', { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('account and group settings render on a narrow screen', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await useDemoSession(page);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.getByText('Ayarlar', { exact: true }).last().click();
  for (const [label, visibleText, name] of [
    ['Profil Düzenle', 'Profili Düzenle', 'profile'],
    ['Evlerim ve Favori Ev', 'Gruplarım', 'groups'],
    ['IBAN Bilgileri', 'Türkiye IBAN’ı', 'iban'],
    ['Gizlilik Politikası', 'Topladığımız bilgiler', 'privacy'],
    ['Kullanım Koşulları', 'Hizmetin kapsamı', 'terms'],
  ]) {
    await page.getByText(label, { exact: true }).last().click();
    await expect(page.getByText(visibleText, { exact: true }).last()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`${name}-320.png`) });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, name).toBeLessThanOrEqual(2);
    await page.getByLabel('Geri').click();
  }
  expect(errors).toEqual([]);
});

test('sign-in and account entry screens render without clipping', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 700 });
  await page.addInitScript(() => localStorage.setItem('appLanguage', 'tr'));
  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Giriş Yap', { exact: true }).last()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('login-320.png') });
  await page.getByText('Şifremi unuttum', { exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('forgot-password-320.png') });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
});

test('bill creation and payment forms open at narrow mobile width', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await useDemoSession(page);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.getByText('Faturalar', { exact: true }).last().click();
  await page.getByText('Yeni Fatura Ekle', { exact: true }).last().click();
  await expect(page.getByText('Ödeyen', { exact: true })).toBeVisible();
  await expect(page.getByText('Kimin için?', { exact: true })).toBeVisible();
  await page.getByLabel('Ece Arslan Ödeyen').click();
  await page.getByLabel('Ece Arslan Kimin için?').click();
  await page.screenshot({ path: testInfo.outputPath('bill-create-320.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(2);
  await page.getByLabel('Geri').click();
  await page.getByText('Ana Sayfa', { exact: true }).last().click();
  await page.getByText('Ödeme Yap', { exact: true }).last().click();
  await page.screenshot({ path: testInfo.outputPath('payment-320.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
});

test('registration screen fits a narrow viewport', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 700 });
  await page.addInitScript(() => localStorage.setItem('appLanguage', 'tr'));
  await page.goto(`${baseUrl}/register`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Hesap Oluştur', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('register-320.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
});

test('group, invite, recurring charge, and account safety screens fit', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await useDemoSession(page);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.getByText('Ayarlar', { exact: true }).last().click();
  await page.getByText('Evlerim ve Favori Ev', { exact: true }).last().click();
  await page.getByText('Yeni Ev Oluştur', { exact: true }).click();
  await expect(page.getByText('Yeni Grup Oluştur', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('new-group-320.png') });
  await page.getByText('Gezi', { exact: true }).click();
  await expect(page.getByText('Gezi Adı', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('new-trip-320.png') });
  await page.getByLabel('Geri').last().click();
  await page.getByLabel('Geri').last().click();
  await page.getByText('Faturalar', { exact: true }).last().click();
  await page.getByText('Düzenli veya taksitli gider ekle', { exact: true }).click();
  await expect(page.getByText('Düzenli Gider Ekle', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('recurring-320.png') });
  await page.getByText('Taksitli gider', { exact: true }).click();
  await expect(page.getByText('Kalan taksit sayısı', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('installment-320.png') });
  await page.getByLabel('Geri').last().click();
  await page.getByText('Ayarlar', { exact: true }).last().click();
  await page.getByText('Güvenlik', { exact: true }).last().click();
  await page.getByText('Hesabımı sil', { exact: true }).click();
  await expect(page.getByText('Hesabını ve kişisel verilerini sil')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('delete-account-320.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(2);
  await page.goto(`${baseUrl}/davet-et`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Arkadaş Davet Et', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('invite-320.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
});
