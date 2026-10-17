import { test, expect, type Page } from '@playwright/test';
import { getScene, newGame, replay } from '../../src/game/engine';
import { encodeSave, KEY } from '../../src/game/storage';

const initial = newGame();
const lines = getScene(initial).lines;
const text = (page: Page) => page.locator('.dialogue-text > span[aria-hidden="true"]');
const prefix = (line: number, count: number) => Array.from(lines[line].text).slice(0, count).join('');

// Only the lifecycle signal is injected. The production UI, timers, routes
// and storage remain real; headless tabs do not consistently become hidden.
async function visibility(page: Page, hidden: boolean, dispatch = true) {
  await page.evaluate(({ hidden, dispatch }) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => hidden ? 'hidden' : 'visible' });
    if (dispatch) document.dispatchEvent(new Event('visibilitychange'));
  }, { hidden, dispatch });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(key => localStorage.setItem(`${key}:settings`, JSON.stringify({
    textSpeed: 4, autoDelay: 800, music: false, ambience: false, soundEffects: false, reducedMotion: false,
  })), KEY);
  await page.clock.install({ time: new Date('2026-10-17T04:00:00Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-10-17T04:00:10Z'));
  await page.getByRole('button', { name: '开始阅读', exact: true }).click();
});

test('backgrounding preserves unread characters, the live route and the read boundary', async ({ page }) => {
  await page.clock.runFor(500);
  await expect(text(page)).toHaveText(prefix(0, 2));
  await page.getByRole('button', { name: '自动', exact: true }).click();
  const before = await page.evaluate(key => localStorage.getItem(`${key}:save:auto`), KEY);
  await visibility(page, true);
  await page.clock.runFor(60_000);
  await expect(text(page)).toHaveText(prefix(0, 2));
  await expect(page.locator('.game-screen')).toHaveAttribute('data-line', '0');
  await expect(page.getByRole('button', { name: '自动', exact: true })).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(key => localStorage.getItem(`${key}:save:auto`), KEY)).toBe(before);
  await visibility(page, false);
  await page.clock.runFor(750);
  await expect(text(page)).toHaveText(prefix(0, 5));
  await page.getByRole('button', { name: '回看', exact: true }).click();
  await expect(page.locator('.history-list article')).toHaveCount(0);
});

test('queued typing and automatic callbacks observe hidden state before the visibility event', async ({ page }) => {
  await page.clock.runFor(500);
  await expect(text(page)).toHaveText(prefix(0, 2));
  await visibility(page, true, false);
  await page.clock.runFor(60_000);
  await expect(text(page)).toHaveText(prefix(0, 2));
  await visibility(page, false);
  await page.locator('.dialogue-text').click();
  await page.getByRole('button', { name: '自动', exact: true }).click();
  await visibility(page, true, false);
  await page.clock.runFor(60_000);
  await expect(page.locator('.game-screen')).toHaveAttribute('data-line', '0');
  await visibility(page, true);
  await visibility(page, false);
  await expect(page.getByRole('button', { name: '自动', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('backgrounding an isolated reread preserves its text and the original partial paragraph', async ({ page }) => {
  await page.locator('.dialogue-text').click();
  await page.locator('.dialogue-text').click();
  await page.clock.runFor(500);
  await expect(text(page)).toHaveText(prefix(1, 2));
  const before = await page.evaluate(key => localStorage.getItem(`${key}:save:auto`), KEY);
  await page.getByRole('button', { name: '回看', exact: true }).click();
  await page.getByRole('button', { name: '回看这一段', exact: true }).click();
  await page.getByRole('button', { name: '从这里重读', exact: true }).click();
  await expect(page.locator('.game-screen')).toHaveAttribute('data-rereading', 'true');
  await page.clock.runFor(500);
  await expect(text(page)).toHaveText(prefix(0, 2));
  await visibility(page, true);
  await page.clock.runFor(60_000);
  await expect(text(page)).toHaveText(prefix(0, 2));
  await visibility(page, false);
  await page.getByRole('button', { name: '返回原进度', exact: true }).click();
  await expect(page.locator('.game-screen')).toHaveAttribute('data-line', '1');
  await expect(text(page)).toHaveText(prefix(1, 2));
  expect(await page.evaluate(key => localStorage.getItem(`${key}:save:auto`), KEY)).toBe(before);
  await page.clock.runFor(750);
  await expect(text(page)).toHaveText(prefix(1, 5));
});

test('loading the same saved paragraph restarts typing while closing its panel preserves the count', async ({ page }) => {
  await page.clock.runFor(500);
  await expect(text(page)).toHaveText(prefix(0, 2));
  await page.getByRole('button', { name: '存档', exact: true }).click();
  const manual = page.locator('.save-card').filter({ hasText: '手动存档 1' });
  await manual.getByRole('button', { name: '存入', exact: true }).click();
  const before = await page.evaluate(key => localStorage.getItem(`${key}:save:1`), KEY);
  await page.clock.runFor(60_000);
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await expect(text(page)).toHaveText(prefix(0, 2));
  await page.clock.runFor(750);
  await expect(text(page)).toHaveText(prefix(0, 5));
  await page.getByRole('button', { name: '存档', exact: true }).click();
  await manual.getByRole('button', { name: '读取', exact: true }).click();
  await expect(text(page)).toHaveText('');
  await page.clock.runFor(750);
  await expect(text(page)).toHaveText(prefix(0, 3));
  await page.locator('.dialogue-text').click();
  await expect(text(page)).toHaveText(lines[0].text);
  await page.getByRole('button', { name: '存档', exact: true }).click();
  await manual.getByRole('button', { name: '读取', exact: true }).click();
  await expect(text(page)).toHaveText('');
  await page.clock.runFor(750);
  await expect(text(page)).toHaveText(prefix(0, 3));
  expect(await page.evaluate(key => localStorage.getItem(`${key}:save:1`), KEY)).toBe(before);
});

test('importing an unread ending cannot reuse the previous paragraph count to unlock it', async ({ page }) => {
  const route = [
    { sceneId: 'first-reply', choiceId: 'first-reply-1' }, { sceneId: 'c2-open', choiceId: 'c2-open-1' },
    { sceneId: 'c2-call', choiceId: 'c2-call-1' }, { sceneId: 'c3-choice', choiceId: 'c3-choice-2' },
    { sceneId: 'c4-choice', choiceId: 'c4-choice-1' }, { sceneId: 'c5-choice', choiceId: 'c5-choice-1' },
  ];
  const scene = getScene(replay(route, 'end-tinghe', 0));
  const state = replay(route, scene.id, scene.lines.length - 1);
  await page.locator('.dialogue-text').click();
  await expect(text(page)).toHaveText(lines[0].text);
  await page.getByRole('button', { name: '存档', exact: true }).click();
  await page.getByLabel('选择存档文件', { exact: true }).setInputFiles({
    name: 'unread-ending.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(encodeSave(state))),
  });
  await page.locator('.confirm-actions .primary').click();
  await expect(text(page)).toHaveText('');
  await expect(page.locator('.ending-card')).not.toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(`${key}:endings`) ?? '[]'), KEY)).not.toContain('tinghe-final');
  expect(await page.evaluate(key => localStorage.getItem(`${key}:ending:tinghe-final`), KEY)).toBeNull();
  await page.locator('.dialogue-text').click();
  await expect(page.locator('.ending-card')).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(`${key}:endings`) ?? '[]'), KEY)).toContain('tinghe-final');
});
