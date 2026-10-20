import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { replay, sceneMap } from '../../src/game/engine';
import { encodeSave } from '../../src/game/storage';
import type { Decision } from '../../src/game/types';

const key = 'netlove:v1';
const route: Decision[] = [
  { sceneId: 'first-reply', choiceId: 'first-reply-1' }, { sceneId: 'c2-open', choiceId: 'c2-open-1' },
  { sceneId: 'c2-call', choiceId: 'c2-call-1' }, { sceneId: 'c3-choice', choiceId: 'c3-choice-2' },
  { sceneId: 'c4-choice', choiceId: 'c4-choice-1' }, { sceneId: 'c5-choice', choiceId: 'c5-choice-1' },
];
async function seed(page: Page, sceneId: string, line: number, branch = 1) {
  const decisions = sceneId === 'c2-call' ? route.slice(0, 2) : [...route.slice(0, -1), { sceneId: 'c5-choice', choiceId: `c5-choice-${branch}` }];
  const save = JSON.stringify(encodeSave(replay(decisions, sceneId, line)));
  await page.addInitScript(({ key, save }) => {
    const media = [] as HTMLMediaElement[];
    (window as unknown as { __voice: HTMLMediaElement[] }).__voice = media;
    const nativePlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (!media.includes(this)) media.push(this);
      this.playbackRate = .3;
      return nativePlay.call(this);
    };
    if (sessionStorage.getItem('voice-cg-seeded')) return;
    localStorage.setItem(`${key}:save:auto`, save);
    localStorage.setItem(`${key}:settings`, JSON.stringify({ textSpeed: 0, music: false, voiceEnabled: true, voiceVolume: .55, autoDelay: 800 }));
    sessionStorage.setItem('voice-cg-seeded', 'yes');
  }, { key, save });
  await page.goto('/');
  await page.getByRole('button', { name: '继续上次的故事', exact: true }).click();
  await expect(page.locator('.game-screen')).toHaveAttribute('data-scene', sceneId);
}

test('plays actual call audio, pauses for panels and hidden UI, and replays history without advancing', async ({ page }) => {
  const scene = sceneMap.get('c2-call')!;
  const line = scene.lines.findIndex(line => line.id === 'c2-call-004');
  await seed(page, scene.id, line);
  await page.getByRole('button', { name: '重听本句', exact: true }).click();
  await expect(page.getByRole('button', { name: '暂停语音', exact: true })).toBeVisible();
  expect(await page.evaluate(() => {
    const media = (window as unknown as { __voice: HTMLMediaElement[] }).__voice.at(-1)!;
    return media.readyState >= 2 && media.duration > 1 && !media.paused && media.volume === .55;
  })).toBe(true);
  await expect(page.locator('.netlove-character')).toHaveCount(0);
  await page.getByRole('button', { name: '自动', exact: true }).click();
  await page.waitForTimeout(2400);
  await expect(page.locator('.game-screen')).toHaveAttribute('data-line', String(line));
  await page.getByRole('button', { name: '自动', exact: true }).click();
  const saved = await page.evaluate(key => localStorage.getItem(`${key}:save:auto`), key);
  await page.getByRole('button', { name: '隐藏界面', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { __voice: HTMLMediaElement[] }).__voice.at(-1)!.paused)).toBe(true);
  await page.getByRole('button', { name: '恢复阅读界面', exact: true }).click();
  await expect(page.getByRole('button', { name: '暂停语音', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '回看', exact: true }).click();
  await page.getByRole('searchbox').fill(scene.lines[line].text.slice(0, 6));
  await page.getByRole('button', { name: '重听语音', exact: true }).click();
  await expect.poll(() => page.evaluate(() => !(window as unknown as { __voice: HTMLMediaElement[] }).__voice.at(-1)!.paused)).toBe(true);
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { __voice: HTMLMediaElement[] }).__voice.at(-1)!.paused)).toBe(true);
  expect(await page.evaluate(key => localStorage.getItem(`${key}:save:auto`), key)).toBe(saved);
});

for (const event of [
  { scene: 'c5-xumi', line: 1, branch: 2, id: 'xumi-envelope', other: 'tinghe-meeting', width: 1672 },
  { scene: 'c5-tinghe', line: 4, branch: 1, id: 'tinghe-meeting', other: 'xumi-envelope', width: 1659 },
]) test(`${event.id}: unlocks only the reached branch and keeps real CG/audio after offline reload`, async ({ page, context }, info) => {
  await seed(page, event.scene, event.line, event.branch);
  await expect(page.locator('.scene-background')).toHaveAttribute('data-cg', event.id);
  await expect(page.locator('.scene-background')).toHaveJSProperty('naturalWidth', event.width);
  await expect(page.locator('.netlove-sprite')).toHaveCount(0);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(`${key}:gallery`) ?? '[]'), key)).not.toContain(event.other);
  await page.getByRole('button', { name: '返回标题', exact: true }).click();
  await page.getByRole('button', { name: '安装与离线', exact: true }).click();
  await expect(page.getByRole('heading', { name: '可以离线阅读', exact: true })).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: '继续上次的故事', exact: true }).click();
  await page.getByRole('button', { name: '重听本句', exact: true }).click();
  await expect(page.getByRole('button', { name: '暂停语音', exact: true })).toBeVisible();
  await expect(page.locator('.scene-background')).toHaveJSProperty('naturalWidth', event.width);
  await expect(page.locator('.toast')).not.toHaveClass(/visible/);
  await mkdir('test-results/previews', { recursive: true });
  await page.screenshot({ path: `test-results/previews/${event.id}-offline-${info.project.name}.png` });
  await context.setOffline(false);
});

test('four bowls stays an event picture on phones and ships its actual scene music offline', async ({ page, context }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await seed(page, 'c5-friends', 0, 3);
  await expect(page.locator('.scene-background')).toHaveAttribute('data-cg', 'four-bowls');
  await expect(page.locator('.netlove-sprite')).toHaveCount(0);
  for (const [width, height] of [[1440, 900], [412, 915], [568, 320], [640, 360], [844, 390], [915, 412]]) {
    await page.setViewportSize({ width, height });
    await expect(page.locator('.scene-background')).toHaveJSProperty('naturalWidth', 1672);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('button', { name: '返回标题', exact: true }).click();
  await page.getByRole('button', { name: '安装与离线', exact: true }).click();
  await expect(page.getByRole('heading', { name: '可以离线阅读', exact: true })).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await context.setOffline(true); await page.reload();
  await page.getByRole('button', { name: '继续上次的故事', exact: true }).click();
  await expect(page.locator('.scene-background')).toHaveAttribute('data-cg', 'four-bowls');
  const duration = await page.evaluate(async () => {
    const audio = new AudioContext();
    try { return (await audio.decodeAudioData(await (await fetch('./audio/bgm/four-bowls.ogg')).arrayBuffer())).duration; }
    finally { await audio.close(); }
  });
  expect(duration).toBeGreaterThan(40); expect(duration).toBeLessThan(43);
  await mkdir('test-results/previews', { recursive: true });
  await page.screenshot({ path: `test-results/previews/four-bowls-offline-${info.project.name}.png` });
  expect(errors).toEqual([]); await context.setOffline(false);
});
