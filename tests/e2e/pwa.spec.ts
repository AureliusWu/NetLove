import { test, expect, type Page } from '@playwright/test';
const host = 'http://127.0.0.1:4184';
async function panel(page: Page, scope = '/NetLove/') {
  await page.goto(host + scope);
  await page.getByRole('button', { name: /^(安装与离线|有新版本)$/ }).click();
}
async function ready(page: Page) {
  await expect(page.getByRole('heading', { name: '可以离线阅读', exact: true })).toBeVisible({ timeout: 30000 });
}
test('failed own precache is not hidden by an already-ready parent worker and retry recovers', async ({ page, context }) => {
  await page.goto(host);
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/parent-sw.js');
    await navigator.serviceWorker.ready;
  });
  await context.addCookies([{ name: 'pwa-fail', value: '1', url: host }]);
  await panel(page);
  await expect(page.getByRole('button', { name: '重新下载', exact: true })).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('heading', { name: '可以离线阅读', exact: true })).not.toBeVisible();
  await context.addCookies([{ name: 'pwa-fail', value: '0', url: host }]);
  await page.getByRole('button', { name: '重新下载', exact: true }).click();
  await ready(page);
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistration(location.href))?.scope)).toBe(host + '/NetLove/');
  await context.setOffline(true); await page.reload();
  await expect(page.locator('h1')).toContainText('“网”恋');
});
test('same game at two scopes keeps both caches and reopens both installations offline', async ({ page, context }) => {
  await panel(page); await ready(page);
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('button', { name: '开始阅读', exact: true }).click();
  await expect(page.locator('.scene-background')).toHaveJSProperty('naturalWidth', 1672);
  const copy = await context.newPage(); await panel(copy, '/Copy/'); await ready(copy);
  const keys = await page.evaluate(() => caches.keys());
  expect(keys.some(key => key.startsWith('netlove-v2:' + encodeURIComponent(host + '/NetLove/') + ':'))).toBe(true);
  expect(keys.some(key => key.startsWith('netlove-v2:' + encodeURIComponent(host + '/Copy/') + ':'))).toBe(true);
  await context.setOffline(true);
  for (const game of [page, copy]) {
    // Same-origin paths share the existing netlove:v1 storage namespace.
    await game.reload(); await game.getByRole('button', { name: '继续上次的故事', exact: true }).click();
    await expect(game.locator('.scene-background')).toHaveJSProperty('naturalWidth', 1672);
  }
});
test('downloaded update waits for close and keeps saved reading progress on the new cache', async ({ page, context }) => {
  await panel(page); await ready(page);
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.evaluate(() => localStorage.setItem('netlove:v1:settings', JSON.stringify({ textSpeed: 0, music: false })));
  await page.reload(); await page.getByRole('button', { name: '开始阅读', exact: true }).click();
  await page.locator('.dialogue-text').click();
  await expect(page.locator('.game-screen')).toHaveAttribute('data-line', '1');
  await page.getByRole('button', { name: '返回标题', exact: true }).click();
  await page.getByRole('button', { name: '安装与离线', exact: true }).click();
  const original = await page.evaluate(() => caches.keys());
  await context.addCookies([{ name: 'pwa-update', value: '1', url: host }]);
  await page.getByRole('button', { name: '检查更新', exact: true }).click();
  await expect(page.getByText('新版本已下载。关闭所有游戏窗口，再次打开即可更新。', { exact: true })).toBeVisible({ timeout: 30000 });
  expect(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration(location.href))?.waiting)).toBe(true);
  expect(await page.evaluate(() => caches.keys())).toEqual(expect.arrayContaining(original));
  await page.close();
  const reopened = await context.newPage();
  // Keep this observer outside the game's scope until all old clients are gone.
  // An immediate new scoped navigation can legitimately hold the update waiting.
  await reopened.goto(host + '/');
  await expect.poll(() => reopened.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration(location.origin + '/NetLove/');
    return !!registration?.active && registration.active.state === 'activated' && !registration.waiting;
  }), { timeout: 30000 }).toBe(true);
  await panel(reopened); await ready(reopened);
  await expect.poll(() => reopened.evaluate(() => caches.keys()), { timeout: 30000 }).toEqual([expect.stringContaining(':fixture-update')]);
  await context.setOffline(true); await reopened.reload();
  await reopened.getByRole('button', { name: '继续上次的故事', exact: true }).click();
  await expect(reopened.locator('.game-screen')).toHaveAttribute('data-line', '1');
  await expect(reopened.locator('.scene-background')).toHaveJSProperty('naturalWidth', 1672);
});
