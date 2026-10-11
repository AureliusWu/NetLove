import { chromium, devices, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const target = new URL(process.env.GAME_URL || 'https://aureliuswu.github.io/NetLove/');
const version = process.env.EXPECTED_VERSION || JSON.parse(await readFile('package.json', 'utf8')).version;
if (!['http:', 'https:'].includes(target.protocol)) throw new Error('Expected HTTP(S) URL');
target.searchParams.set('verify', process.env.GITHUB_SHA || `v${version}`);
await mkdir('test-results/live', { recursive: true });
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: JSON.parse(process.env.PLAYWRIGHT_CHROMIUM_ARGS || '[]') } : {}),
  ...(process.env.PLAYWRIGHT_PROXY ? { proxy: { server: process.env.PLAYWRIGHT_PROXY } } : {}),
});
const results = [];
try {
  const integrityContext = await browser.newContext();
  try {
    for (const file of ['index.html', 'sw.js']) {
      const url = new URL(file, target);
      url.searchParams.set('verify', process.env.GITHUB_SHA || `v${version}`);
      const response = await integrityContext.request.get(url.href, { headers: { 'Cache-Control': 'no-cache' }, timeout: 60000 });
      expect(response.status()).toBe(200);
      const expected = createHash('sha256').update(await readFile(`dist/${file}`)).digest('hex');
      const actual = createHash('sha256').update(await response.body()).digest('hex');
      expect(actual, `Published ${file} must match the tested build`).toBe(expected);
      console.log('PUBLISHED_FILE_OK', JSON.stringify({ file, sha256: actual }));
    }
  } finally { await integrityContext.close(); }
  for (const screen of ['desktop', 'mobile', 'landscape']) {
    const context = await browser.newContext(screen === 'desktop' ? { viewport: { width: 1440, height: 900 } } : { ...devices['Pixel 7'], viewport: screen === 'mobile' ? { width: 412, height: 915 } : { width: 844, height: 390 } });
    try {
      await context.addInitScript(() => localStorage.setItem('netlove:v1:settings', JSON.stringify({ textSpeed: 0, music: false, reducedMotion: true })));
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const response = await page.goto(target.href, { waitUntil: 'domcontentloaded', timeout: 60000 });
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toContainText('“网”恋');
      await expect(page.locator('.title-footer')).toContainText(`v${version}`);
      const manifest = await page.evaluate(async () => (await fetch(document.querySelector('link[rel="manifest"]').href)).json());
      expect(manifest.orientation).toBe('landscape');
      await page.getByRole('button', { name: '安装与离线', exact: true }).click();
      await expect(page.getByRole('heading', { name: '可以离线阅读', exact: true })).toBeVisible({ timeout: 60000 });
      const scope = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration(location.href))?.scope);
      expect(scope).toBe(new URL('./', target).href);
      await page.getByRole('button', { name: '关闭', exact: true }).click();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `test-results/live/title-${screen}.png`, fullPage: true });
      await page.getByRole('button', { name: '开始阅读', exact: true }).click();
      await expect(page.locator('.dialogue-text')).toContainText('一月二十七日');
      await page.locator('.dialogue-text').click();
      await expect(page.locator('.game-screen')).toHaveAttribute('data-line', '1');
      await page.getByRole('button', { name: '隐藏界面', exact: true }).click();
      await expect(page.locator('.game-screen')).toHaveAttribute('data-ui-hidden', 'true');
      await page.getByRole('button', { name: '恢复阅读界面', exact: true }).click();
      await expect(page.locator('.game-screen')).toHaveAttribute('data-line', '1');
      if (screen === 'mobile') {
        await page.setViewportSize({ width: 844, height: 390 });
        await expect(page.locator('.game-screen')).toHaveAttribute('data-line', '1');
        await page.setViewportSize({ width: 412, height: 915 });
      }
      await context.setOffline(true);
      await page.reload();
      await expect(page.locator('.title-footer')).toContainText(`v${version}`);
      await page.getByRole('button', { name: '继续上次的故事', exact: true }).click();
      await expect(page.locator('.game-screen')).toHaveAttribute('data-line', '1');
      await expect.poll(() => page.evaluate(() => [...document.images].every(image => image.complete && image.naturalWidth > 0))).toBe(true);
      const fullWindowArtwork = await page.locator('.scene-frame').evaluate(element => {
        const frame = element.getBoundingClientRect();
        return Math.abs(frame.left) <= 1 && Math.abs(frame.top) <= 1 && Math.abs(frame.width - innerWidth) <= 1 && Math.abs(frame.height - innerHeight) <= 1;
      });
      expect(fullWindowArtwork).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
      await page.screenshot({ path: `test-results/live/offline-reading-${screen}.png` });
      results.push({ screen, url: target.origin + target.pathname, version, scope, fullWindowArtwork, hideRestore: true, rotation: screen === 'mobile', offlineResume: true, assets: true, pageErrors: errors });
      console.log('LIVE_SMOKE_OK', JSON.stringify(results.at(-1)));
    } finally { await context.close(); }
  }
  await writeFile('test-results/live/result.json', JSON.stringify({ browserVersion: browser.version(), results }, null, 2) + '\n');
} finally { await browser.close(); }
