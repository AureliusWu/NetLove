import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { getScene, replay } from '../../src/game/engine';
import { encodeSave } from '../../src/game/storage';
import type { Decision, GameState } from '../../src/game/types';

const key = 'netlove:v1';
const route: Decision[] = [
  { sceneId: 'first-reply', choiceId: 'first-reply-1' }, { sceneId: 'c2-open', choiceId: 'c2-open-1' },
  { sceneId: 'c2-call', choiceId: 'c2-call-1' }, { sceneId: 'c3-choice', choiceId: 'c3-choice-2' },
  { sceneId: 'c4-choice', choiceId: 'c4-choice-1' }, { sceneId: 'c5-choice', choiceId: 'c5-choice-1' },
];
async function seed(page: Page, state: GameState, speed = 0) {
  await page.addInitScript(({ key, save, speed }) => {
    if (localStorage.getItem('reread-fixture-ready')) return;
    localStorage.setItem(`${key}:save:auto`, save);
    localStorage.setItem(`${key}:save:1`, save);
    localStorage.setItem(`${key}:settings`, JSON.stringify({ textSpeed: speed, music: false }));
    localStorage.setItem('reread-fixture-ready', 'yes');
  }, { key, save: JSON.stringify(encodeSave(state)), speed });
  await page.goto('/');
  await page.getByRole('button', { name: '继续上次的故事', exact: true }).click();
  await expect(page.locator('.game-screen')).toHaveAttribute('data-scene', state.sceneId);
  if (speed === 0) await expect(page.locator('.dialogue-text')).toHaveAttribute('aria-label', '显示下一段');
}
async function progress(page: Page) {
  return page.evaluate(key => Object.fromEntries(Object.keys(localStorage).filter(name => name.startsWith(`${key}:`) && !name.endsWith(':settings') && !name.endsWith(':dialogue-opacity')).sort().map(name => [name, localStorage.getItem(name)])), key);
}
async function preview(page: Page, text: string) {
  await page.getByRole('button', { name: '回看', exact: true }).click();
  await page.getByRole('searchbox').fill(text);
  await expect(page.locator('.history-list article')).toHaveCount(1);
  await page.getByRole('button', { name: '回看这一段', exact: true }).click();
  return page.locator('.history-preview');
}
async function confirm(page: Page) { await page.locator('.confirm-actions .primary').click(); }

test('reviews original expressions, retains filter focus and traps keyboard navigation inside visible controls', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  const source = replay(route.slice(0, 3), 'c2-camera', 7);
  await seed(page, source);
  const before = await progress(page);
  const target = getScene(source).lines[6];
  const frame = await preview(page, target.text);
  await expect(frame).toHaveAttribute('data-scene', 'c2-camera');
  await expect(frame).toHaveAttribute('data-line', '6');
  await expect(frame.locator('[data-character="tinghe"]')).toHaveAttribute('data-expression', 'surprised');
  await expect(frame.locator('.history-preview-background')).toHaveJSProperty('naturalWidth', 1672);
  await page.getByRole('button', { name: '从这里重读', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '关闭', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: '从这里重读', exact: true })).toBeFocused();
  await page.getByRole('button', { name: '下一段', exact: true }).click();
  await expect(frame).toHaveAttribute('data-line', '7');
  await expect(page.getByRole('button', { name: '下一段', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '返回记录', exact: true }).click();
  await expect(page.getByRole('searchbox')).toHaveValue(target.text);
  await expect(page.getByRole('button', { name: '回看这一段', exact: true })).toBeFocused();
  await page.getByRole('button', { name: '回看这一段', exact: true }).click();
  await mkdir('test-results/previews', { recursive: true });
  await expect(page.locator('.toast')).not.toHaveClass(/visible/);
  await page.screenshot({ path: `test-results/previews/history-preview-${info.project.name}.png` });
  await page.getByRole('button', { name: '回到当前阅读', exact: true }).click();
  await expect(page.locator('.game-screen')).toHaveAttribute('data-line', '7');
  expect(await progress(page)).toEqual(before);
  expect(errors).toEqual([]);
});

test('rechooses on an isolated route, protects export and canceled writes, and only saves rereading on confirmation', async ({ page }, info) => {
  const original = replay(route, 'end-tinghe', 0);
  const source = replay(route, original.sceneId, getScene(original).lines.length - 1);
  await seed(page, source);
  await expect(page.locator('.ending-card')).toBeVisible();
  const before = await progress(page);
  const choice = getScene(replay(route.slice(0, -1), 'c5-choice', 0));
  await preview(page, choice.lines.at(-1)!.text);
  await page.getByRole('button', { name: '从这里重读', exact: true }).click();
  await expect(page.locator('.game-screen')).toHaveAttribute('data-rereading', 'true');
  await expect(page.locator('.choice-panel')).toBeVisible();
  await page.locator('.choice-panel button').nth(1).click();
  for (let step = 0; step < 80; step++) {
    if (await page.locator('.ending-card').isVisible()) break;
    await expect(page.locator('.dialogue-text')).toHaveAttribute('aria-label', '显示下一段');
    await page.locator('.dialogue-text').click();
  }
  await expect(page.locator('.game-screen')).toHaveAttribute('data-scene', 'end-xumi');
  await expect(page.locator('.ending-card')).toBeVisible();
  expect(await progress(page)).toEqual(before);
  await page.getByRole('button', { name: '回看', exact: true }).click();
  await page.getByRole('searchbox').fill(getScene(source).lines[0].text);
  await expect(page.locator('.history-list article')).toHaveCount(0);
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('button', { name: '存档', exact: true }).click();
  const waiting = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出阅读备份', exact: true }).click();
  const download = await waiting; const stream = await download.createReadStream(); const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const backup = JSON.parse(Buffer.concat(chunks).toString());
  expect(backup.slots.auto.state.sceneId).toBe(source.sceneId);
  expect(backup.slots.auto.state.decisions).toEqual(route);
  expect(await progress(page)).toEqual(before);
  const manual = page.locator('.save-card').filter({ has: page.getByText('手动存档 1', { exact: true }) });
  await manual.getByRole('button', { name: '存入', exact: true }).click();
  await expect(page.locator('.confirm-text')).toContainText('重读内容');
  await page.getByRole('button', { name: '再想一下', exact: true }).click();
  expect(await progress(page)).toEqual(before);
  await manual.getByRole('button', { name: '读取', exact: true }).click();
  await expect(page.locator('.confirm-text')).toContainText('结束这次重读');
  await page.getByRole('button', { name: '再想一下', exact: true }).click();
  expect(await progress(page)).toEqual(before);
  await page.getByLabel('选择存档文件').setInputFiles({ name: 'original.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(encodeSave(source))) });
  await expect(page.locator('.confirm-text')).toContainText('导入会结束这次重读');
  await page.getByRole('button', { name: '再想一下', exact: true }).click();
  expect(await progress(page)).toEqual(before);
  await manual.getByRole('button', { name: '存入', exact: true }).click();
  await confirm(page);
  const after = await progress(page);
  expect(JSON.parse(after[`${key}:save:1`]!).state.sceneId).toBe('end-xumi');
  delete after[`${key}:save:1`]; const expected = { ...before }; delete expected[`${key}:save:1`];
  expect(after).toEqual(expected);
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.setViewportSize({ width: 568, height: 320 });
  const banner = await page.getByRole('button', { name: '返回原进度', exact: true }).boundingBox();
  expect(banner!.y).toBeGreaterThanOrEqual(0); expect(banner!.y + banner!.height).toBeLessThanOrEqual(320);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize(info.project.name === 'mobile' ? { width: 412, height: 915 } : { width: 1440, height: 900 });
  await expect(page.locator('.toast')).not.toHaveClass(/visible/);
  await page.screenshot({ path: `test-results/previews/history-reread-${info.project.name}.png` });
  await page.getByRole('button', { name: '返回原进度', exact: true }).click();
  await expect(page.locator('.game-screen')).toHaveAttribute('data-rereading', 'false');
  await expect(page.locator('.game-screen')).toHaveAttribute('data-scene', source.sceneId);
  await expect(page.locator('.game-screen')).toHaveAttribute('data-line', String(source.line));
  expect((await progress(page))[`${key}:save:auto`]).toBe(before[`${key}:save:auto`]);
});

test('returns to the original unfinished typing count and discards an offline reread on reload', async ({ page, context }) => {
  const source = replay(route.slice(0, 3), 'c2-camera', 7);
  await seed(page, source, 4);
  const visible = page.locator('.dialogue-text > span[aria-hidden="true"]');
  await expect.poll(() => visible.textContent()).not.toBe('');
  await page.getByRole('button', { name: '回看', exact: true }).click();
  const originalText = await visible.textContent();
  const before = await progress(page);
  await page.getByRole('searchbox').fill(getScene(source).lines[source.line].text);
  await expect(page.locator('.history-list article')).toHaveCount(0);
  await page.getByRole('searchbox').fill(getScene(source).lines[6].text);
  await page.getByRole('button', { name: '回看这一段', exact: true }).click();
  await page.getByRole('button', { name: '从这里重读', exact: true }).click();
  await page.getByRole('button', { name: '返回原进度', exact: true }).click();
  expect(await visible.textContent()).toBe(originalText);
  expect(await progress(page)).toEqual(before);
  await expect.poll(() => visible.textContent()).not.toBe(originalText);
  await page.getByRole('button', { name: '返回标题', exact: true }).click();
  await page.getByRole('button', { name: '安装与离线', exact: true }).click();
  await expect(page.getByRole('heading', { name: '可以离线阅读', exact: true })).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('button', { name: '继续上次的故事', exact: true }).click();
  await context.setOffline(true);
  await preview(page, getScene(source).lines[6].text);
  await page.getByRole('button', { name: '从这里重读', exact: true }).click();
  await expect(page.locator('.game-screen')).toHaveAttribute('data-line', '6');
  await page.reload();
  await page.getByRole('button', { name: '继续上次的故事', exact: true }).click();
  await expect(page.locator('.game-screen')).toHaveAttribute('data-rereading', 'false');
  await expect(page.locator('.game-screen')).toHaveAttribute('data-line', '7');
  await expect(page.locator('.scene-background')).toHaveJSProperty('naturalWidth', 1672);
});

test('returning from a longer reread cannot unlock an unfinished original ending', async ({ page }) => {
  const first = replay(route, 'end-tinghe', 0);
  const source = replay(route, first.sceneId, getScene(first).lines.length - 1);
  const originalLine = getScene(source).lines[source.line];
  const target = source.history.find(entry => entry.text.length > originalLine.text.length && entry.text.length <= 80 && entry.sceneId !== 'c5-choice')!;
  expect(target).toBeDefined();
  await seed(page, source, 4);
  const visible = page.locator('.dialogue-text > span[aria-hidden="true"]');
  await expect.poll(() => visible.textContent()).not.toBe('');
  await preview(page, target.text);
  const originalVisible = await visible.textContent();
  const before = await progress(page);
  expect(before[`${key}:endings`]).toBeUndefined();
  await page.getByRole('button', { name: '从这里重读', exact: true }).click();
  await page.locator('.dialogue-text').click();
  await expect(visible).toHaveText(target.text);
  await page.getByRole('button', { name: '返回原进度', exact: true }).click();
  expect(await visible.textContent()).toBe(originalVisible);
  await page.getByRole('button', { name: '回看', exact: true }).click();
  const after = await progress(page);
  expect(Object.keys(after)).toEqual(Object.keys(before));
  for (const name of Object.keys(before)) expect(after[name] === before[name], name).toBe(true);
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.locator('.dialogue-text').click();
  await expect(page.locator('.ending-card')).toBeVisible();
  await expect.poll(async () => JSON.parse((await progress(page))[`${key}:endings`] ?? '[]')).toEqual(['tinghe-final']);
});
