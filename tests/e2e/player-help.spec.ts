import { test, expect, type Page } from '@playwright/test';
import { KEY } from '../../src/game/storage';

const text = (page: Page) => page.locator('.dialogue-text > span[aria-hidden="true"]');

async function boot(page: Page, speed = 4) {
  await page.addInitScript(({ key, speed }) => localStorage.setItem(`${key}:settings`, JSON.stringify({
    textSpeed: speed, autoDelay: 800, music: false, ambience: false, soundEffects: false,
    voiceEnabled: false, reducedMotion: false,
  })), { key: KEY, speed });
  await page.clock.install({ time: new Date('2026-10-23T00:00:00Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-10-23T00:00:10Z'));
}

async function expectInViewport(page: Page, locator: ReturnType<Page['getByRole']>) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
}

test('title help traps keyboard focus and restores its opener', async ({ page }) => {
  await boot(page);
  const opener = page.getByRole('button', { name: '游玩帮助', exact: true });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: '游玩帮助', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('五章完整故事');
  await expect(dialog).toContainText('四种结局');
  await expect(dialog).toContainText('220 条离线人物对白');
  const close = dialog.getByRole('button', { name: '关闭', exact: true });
  await expect(close).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
  await expect(page.locator('.title-screen')).toBeVisible();
});

test('reading help preserves partial text and save bytes, then resumes at the same character', async ({ page }) => {
  await boot(page);
  await page.getByRole('button', { name: '开始阅读', exact: true }).click();
  await page.clock.runFor(500);
  const beforeText = await text(page).innerText();
  expect(Array.from(beforeText)).toHaveLength(2);
  const beforeSave = await page.evaluate(key => localStorage.getItem(`${key}:save:auto`), KEY);
  const opener = page.getByRole('button', { name: '游玩帮助', exact: true });
  await opener.click();
  await page.clock.runFor(60_000);
  await page.keyboard.press(' ');
  await page.keyboard.press('ArrowRight');
  await expect(text(page)).toHaveText(beforeText);
  await expect(page.locator('.game-screen')).toHaveAttribute('data-line', '0');
  expect(await page.evaluate(key => localStorage.getItem(`${key}:save:auto`), KEY)).toBe(beforeSave);
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  await expect(text(page)).toHaveText(beforeText);
  await page.clock.runFor(750);
  expect(Array.from(await text(page).innerText())).toHaveLength(5);
  await expect(page.locator('.game-screen')).toHaveAttribute('data-line', '0');
});

test('help pauses queued auto and fast-forward callbacks', async ({ page }) => {
  await boot(page, 0);
  await page.getByRole('button', { name: '开始阅读', exact: true }).click();
  for (const mode of ['自动', '快进']) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    await page.getByRole('button', { name: '游玩帮助', exact: true }).click();
    const scene = await page.locator('.game-screen').getAttribute('data-scene');
    const line = await page.locator('.game-screen').getAttribute('data-line');
    await page.clock.runFor(60_000);
    await expect(page.locator('.game-screen')).toHaveAttribute('data-scene', scene!);
    await expect(page.locator('.game-screen')).toHaveAttribute('data-line', line!);
    await page.getByRole('button', { name: '关闭', exact: true }).click();
    await expect(page.getByRole('button', { name: mode, exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: mode, exact: true }).click();
  }
});

test('help stays reachable and scrollable on short landscape and portrait screens', async ({ page }, info) => {
  await boot(page);
  for (const size of [{ width: 568, height: 320 }, { width: 844, height: 390 }, { width: 412, height: 915 }]) {
    await page.setViewportSize(size);
    const opener = page.getByRole('button', { name: '游玩帮助', exact: true });
    await opener.click();
    const dialog = page.getByRole('dialog', { name: '游玩帮助', exact: true });
    await expectInViewport(page, dialog);
    await expectInViewport(page, dialog.getByRole('button', { name: '关闭', exact: true }));
    await dialog.locator('.dialog-body').evaluate(element => element.scrollTop = element.scrollHeight);
    await expect(dialog.getByText('Windows、离线与更新', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/previews/help-${size.width}x${size.height}-${info.project.name}.png` });
    await page.keyboard.press('Escape');
  }
  await page.getByRole('button', { name: '开始阅读', exact: true }).click();
  for (const size of [{ width: 568, height: 320 }, { width: 844, height: 390 }, { width: 412, height: 915 }]) {
    await page.setViewportSize(size);
    const opener = page.getByRole('button', { name: '游玩帮助', exact: true });
    await expectInViewport(page, opener);
    await opener.click();
    await page.clock.runFor(60_000);
    await page.keyboard.press('Escape');
    await expect(page.locator('.game-screen')).toHaveAttribute('data-line', '0');
    await expect(opener).toBeFocused();
  }
});
