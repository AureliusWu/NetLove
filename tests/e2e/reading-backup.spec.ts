import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { chapters, finalEndingIds } from '../../src/story';
import { encodeSave } from '../../src/game/storage';
import { newGame, replay, sceneMap } from '../../src/game/engine';
import type { Decision } from '../../src/game/types';

const key = 'netlove:v1';
const route: Decision[] = [
  { sceneId: 'first-reply', choiceId: 'first-reply-1' }, { sceneId: 'c2-open', choiceId: 'c2-open-1' },
  { sceneId: 'c2-call', choiceId: 'c2-call-1' }, { sceneId: 'c3-choice', choiceId: 'c3-choice-2' },
  { sceneId: 'c4-choice', choiceId: 'c4-choice-1' }, { sceneId: 'c5-choice', choiceId: 'c5-choice-1' },
];
const fixed = new Date('2026-10-14T10:00:00Z');
function completeProfile() {
  const profile: Record<string, string> = {};
  for (const [index, id] of ['end-tinghe', 'end-xumi', 'end-friends', 'end-letter'].entries()) {
    const decisions = [...route.slice(0, -1), { sceneId: 'c5-choice', choiceId: `c5-choice-${index + 1}` }];
    const scene = sceneMap.get(id)!;
    profile[`${key}:save:${index === 3 ? 'auto' : index + 1}`] = JSON.stringify(encodeSave(replay(decisions, id, scene.lines.length - 1), fixed));
    profile[`${key}:ending:${scene.ending}`] = JSON.stringify(encodeSave(replay(decisions, id, 0), fixed));
  }
  for (const chapter of chapters) profile[`${key}:chapter:${chapter.id}`] = JSON.stringify(encodeSave(replay(route.filter(decision => sceneMap.get(decision.sceneId)!.chapter < chapter.id), chapter.start, 0), fixed));
  profile[`${key}:endings`] = JSON.stringify(finalEndingIds);
  profile[`${key}:gallery`] = JSON.stringify(['bedroom', 'balcony', 'gate', 'printshop', 'riverbank']);
  profile[`${key}:scores`] = JSON.stringify(['rain', 'window', 'workshop', 'distance', 'evening', 'after-rain']);
  return profile;
}
async function seed(page: Page, profile: Record<string, string> = {}, textSpeed = 0) {
  await page.addInitScript(({ profile, key, textSpeed }) => {
    if (localStorage.getItem('backup-fixture-ready')) return;
    for (const [name, raw] of Object.entries(profile)) localStorage.setItem(name, raw);
    localStorage.setItem(`${key}:settings`, JSON.stringify({ textSpeed, music: false }));
    localStorage.setItem('backup-fixture-ready', 'yes');
  }, { profile, key, textSpeed });
  await page.goto('/');
}
async function importFile(page: Page, buffer: Buffer) {
  await page.getByLabel('选择存档文件').setInputFiles({ name: 'NetLove-reading-backup.json', mimeType: 'application/json', buffer });
}
async function progress(page: Page) {
  return page.evaluate(key => Object.fromEntries(Object.keys(localStorage).filter(name => name.startsWith(key) && !name.endsWith(':settings')).sort().map(name => [name, localStorage.getItem(name)])), key);
}

test('downloads a complete compact backup and imports it in a separate browser context, then reopens offline', async ({ page, browser }, info) => {
  await seed(page, completeProfile());
  await page.getByRole('button', { name: '存档迁移', exact: true }).click();
  const waiting = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出阅读备份', exact: true }).click();
  const download = await waiting;
  expect(download.suggestedFilename()).toMatch(/^NetLove-reading-backup-.*\.json$/);
  await mkdir('test-results/backups', { recursive: true });
  const file = `test-results/backups/actual-download-${info.project.name}.json`;
  await download.saveAs(file);
  const destination = await browser.newContext({ viewport: info.project.name === 'mobile' ? { width: 412, height: 915 } : { width: 1440, height: 900 } });
  try {
    const target = await destination.newPage();
    await seed(target);
    await target.getByRole('button', { name: '存档迁移', exact: true }).click();
    await target.getByLabel('选择存档文件').setInputFiles(file);
    await expect(target.locator('.confirm-text')).toContainText('4 份存档、5 个章首和 4 段结局');
    await target.locator('.confirm-actions .primary').click();
    await expect(target.locator('.game-screen')).toHaveAttribute('data-scene', 'end-letter');
    await expect(target.locator('.ending-card')).toBeVisible();
    const imported = await progress(target);
    for (const [name, original] of Object.entries(completeProfile())) {
      if (name === `${key}:save:auto` || name.endsWith(':scores')) continue;
      const decoded = JSON.parse(imported[name]!) as { state?: unknown };
      const expected = JSON.parse(original) as { state?: unknown };
      expect(decoded.state ?? decoded).toEqual(expected.state ?? expected);
    }
    await target.getByRole('button', { name: '回到标题', exact: true }).click();
    await target.getByRole('button', { name: '回忆', exact: true }).click();
    await expect(target.locator('.memory.unlocked')).toHaveCount(4);
    await expect(target.getByRole('button', { name: /重读这段结局/ })).toHaveCount(4);
    await target.getByRole('button', { name: '关闭', exact: true }).click();
    await target.getByRole('button', { name: '章节', exact: true }).click();
    await expect(target.locator('.chapter-card:not([disabled])')).toHaveCount(5);
    await target.getByRole('button', { name: '关闭', exact: true }).click();
    await target.getByRole('button', { name: '安装与离线', exact: true }).click();
    await expect(target.getByRole('heading', { name: '可以离线阅读', exact: true })).toBeVisible({ timeout: 30000 });
    await target.getByRole('button', { name: '关闭', exact: true }).click();
    await destination.setOffline(true); await target.reload();
    await target.getByRole('button', { name: '继续上次的故事', exact: true }).click();
    await expect(target.locator('.game-screen')).toHaveAttribute('data-scene', 'end-letter');
    await expect(target.locator('.scene-background')).toHaveJSProperty('naturalWidth', 1672);
    await expect(target.locator('.toast')).not.toHaveClass(/visible/);
  } finally { await destination.close(); }
});

test('cancels without writes, rejects a damaged proof and rolls back a real browser quota failure', async ({ page }, info) => {
  await seed(page, { [`${key}:save:auto`]: JSON.stringify(encodeSave(newGame(), fixed)), [`${key}:save:2`]: JSON.stringify(encodeSave(newGame(), fixed)), [`${key}:gallery`]: '["bedroom"]' });
  await page.getByRole('button', { name: '存档迁移', exact: true }).click();
  const before = await progress(page);
  // The source backup is obtained through the player's download control.
  const source = await page.context().newPage();
  const sourceProfile = completeProfile();
  await source.goto('/'); await source.evaluate(profile => { for (const [name, raw] of Object.entries(profile)) localStorage.setItem(name, raw); }, sourceProfile);
  await source.reload(); await source.getByRole('button', { name: '存档迁移', exact: true }).click();
  const waiting = source.waitForEvent('download'); await source.getByRole('button', { name: '导出阅读备份', exact: true }).click();
  const download = await waiting; const stream = await download.createReadStream(); const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks); await source.close();
  // Restore the destination profile before exercising import.
  await page.evaluate(({ before, key }) => { for (const name of Object.keys(localStorage)) if (name.startsWith(key) && !name.endsWith(':settings')) localStorage.removeItem(name); for (const [name, value] of Object.entries(before)) localStorage.setItem(name, value!); }, { before, key });
  await importFile(page, raw); await expect(page.locator('.confirm-text')).toContainText('4 份存档');
  await page.getByRole('button', { name: '再想一下', exact: true }).click(); expect(await progress(page)).toEqual(before);
  const corrupt = JSON.parse(raw.toString()); corrupt.chapters['2'] = corrupt.chapters['1'];
  await importFile(page, Buffer.from(JSON.stringify(corrupt))); await expect(page.getByRole('status').last()).toContainText('证明不一致');
  expect(await progress(page)).toEqual(before); await expect(page.locator('.confirm-actions')).not.toBeVisible();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem; let count = 0;
    Storage.prototype.setItem = function (name, value) {
      if (name.startsWith('netlove:v1:') && !name.endsWith(':settings') && ++count === 8) throw new DOMException('fixture quota exhausted', 'QuotaExceededError');
      return original.call(this, name, value);
    };
  });
  await importFile(page, raw); await page.locator('.confirm-actions .primary').click();
  await expect(page.locator('.toast')).toContainText('原有进度已保留'); expect(await progress(page)).toEqual(before);
  await expect(page.locator('.title-screen')).toBeVisible();
  await page.setViewportSize({ width: 568, height: 320 });
  for (const name of ['导出阅读备份', '导入存档']) {
    const box = await page.getByRole('button', { name, exact: true }).boundingBox();
    expect(box?.y).toBeGreaterThan(0); expect(box!.y + box!.height).toBeLessThan(320);
  }
  await expect(page.locator('.toast')).not.toHaveClass(/visible/);
  await mkdir('test-results/previews', { recursive: true });
  await page.screenshot({ path: `test-results/previews/backup-toolbar-${info.project.name}.png` });
});

test('typing pauses in history, saves, confirmation, hidden UI and title, keeping the original character count', async ({ page }) => {
  await seed(page, {}, 4); await page.getByRole('button', { name: '开始阅读', exact: true }).click();
  const visible = page.locator('.dialogue-text > span[aria-hidden="true"]');
  await expect.poll(() => visible.textContent()).toMatch(/^一月/);
  const readBefore = await visible.textContent();
  await page.getByRole('button', { name: '回看', exact: true }).click();
  await expect(page.locator('.history-list article')).toHaveCount(0);
  await expect(page.getByText('还没有读过的文字。', { exact: true })).toBeVisible();
  await page.waitForTimeout(800); expect(await visible.textContent()).toBe(readBefore);
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  expect(await visible.textContent()).toBe(readBefore);
  await page.getByRole('button', { name: '存档', exact: true }).click();
  const savedCount = await visible.textContent();
  await page.waitForTimeout(700); expect(await visible.textContent()).toBe(savedCount);
  await page.getByRole('button', { name: '存入', exact: true }).first().click();
  await page.getByRole('button', { name: '存入', exact: true }).first().click();
  await expect(page.locator('.confirm-text')).toContainText('手动存档 1');
  await page.waitForTimeout(700); expect(await visible.textContent()).toBe(savedCount);
  await page.getByRole('button', { name: '再想一下', exact: true }).click();
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('button', { name: '隐藏界面', exact: true }).click();
  const hiddenCount = await visible.textContent(); await page.waitForTimeout(700); expect(await visible.textContent()).toBe(hiddenCount);
  await page.getByRole('button', { name: '恢复阅读界面', exact: true }).click(); expect(await visible.textContent()).toBe(hiddenCount);
  await page.getByRole('button', { name: '返回标题', exact: true }).click();
  await page.waitForTimeout(700); await page.getByRole('button', { name: '继续上次的故事', exact: true }).click();
  expect(await visible.textContent()).toBe(hiddenCount);
  await expect.poll(() => visible.textContent()).not.toBe(hiddenCount);
  await expect(page.locator('.game-screen')).toHaveAttribute('data-line', '0');
});
