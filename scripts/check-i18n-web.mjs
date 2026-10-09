import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  locale: 'tr-TR',
  viewport: { width: 390, height: 844 },
});
const page = await context.newPage();
page.on('dialog', (dialog) => dialog.accept());

try {
  await page.goto(process.env.ROOMORA_WEB_URL || 'http://127.0.0.1:8091', { waitUntil: 'networkidle' });
  await page.getByText('EN', { exact: true }).click();
  await page.getByText('Sign In', { exact: true }).waitFor();
  const english = await page.locator('body').innerText();
  assert.match(english, /Shared living made simple\./);
  assert.match(english, /Email address/);
  assert.doesNotMatch(english, /Ortak yaşamın kolay hali/);
  await page.screenshot({ path: 'artifacts/i18n-login-en.png', fullPage: true });

  await page.getByText('TR', { exact: true }).click();
  await page.getByText('Giriş Yap', { exact: true }).waitFor();
  const turkish = await page.locator('body').innerText();
  assert.match(turkish, /Ortak yaşamın kolay hali\./);

  if (process.env.ROOMORA_TEST_EMAIL && process.env.ROOMORA_TEST_PASSWORD) {
    await page.getByPlaceholder('ornek@email.com').fill(process.env.ROOMORA_TEST_EMAIL);
    await page.getByPlaceholder('Şifreni gir').fill(process.env.ROOMORA_TEST_PASSWORD);
    await page.getByText('Giriş Yap', { exact: true }).click();
    await page.getByText('Ayarlar', { exact: true }).last().waitFor({ timeout: 20_000 });
    await page.getByText('Ayarlar', { exact: true }).last().click();
    await page.getByText('Dil Ayarları', { exact: true }).click();
    await page.getByText('English', { exact: true }).click();
    await page.getByText('Language Settings', { exact: true }).waitFor();
    await page.goBack();
    await page.getByText('Settings', { exact: true }).last().waitFor();
    const settings = await page.locator('body').innerText();
    assert.match(settings, /Edit Profile/);
    assert.match(settings, /Privacy Policy/);
    assert.doesNotMatch(settings, /Profil Düzenle/);
    await page.screenshot({ path: 'artifacts/i18n-settings-en.png', fullPage: true });
  }

  console.log('Roomora language switch smoke test passed.');
} finally {
  await browser.close();
}
