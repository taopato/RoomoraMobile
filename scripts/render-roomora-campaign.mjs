import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'media', 'campaign-2026-11');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1800, height: 2600 }, deviceScaleFactor: 1 });
  await page.goto(`file:///${path.join(base, 'design.html').replaceAll('\\', '/')}`);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((img) => img.decode()));
  });
  for (const [id, name] of [
    ['instagram-home', 'roomora-instagram-ev.png'],
    ['instagram-trip', 'roomora-instagram-gezi.png'],
    ['linkedin', 'roomora-linkedin.png'],
    ['flyer', 'roomora-a5-on.png'],
  ]) {
    await page.locator(`#${id}`).screenshot({ path: path.join(base, name) });
  }
  const printPage = await browser.newPage({ viewport: { width: 1748, height: 2480 }, deviceScaleFactor: 1 });
  await printPage.goto(`file:///${path.join(base, 'roomora-a5-on.png').replaceAll('\\', '/')}`);
  await printPage.addStyleTag({ content: 'html,body{margin:0;width:100%;height:100%;overflow:hidden}body{display:block}img{display:block!important;margin:0!important;width:100vw!important;height:100vh!important;object-fit:fill!important;max-width:none!important}' });
  await printPage.pdf({ path: path.join(base, 'roomora-a5-on.pdf'), width: '148mm', height: '210mm', margin: { top: 0, right: 0, bottom: 0, left: 0 }, printBackground: true });
} finally {
  await browser.close();
}
