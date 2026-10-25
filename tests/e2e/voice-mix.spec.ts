import { test, expect } from '@playwright/test';
import { replay, sceneMap } from '../../src/game/engine';
import { encodeSave, KEY } from '../../src/game/storage';
test('actual voice lowers music and restores it on pause without changing voice volume', async ({ page }) => {
  const scene = sceneMap.get('c2-call')!, line = scene.lines.findIndex(line => line.id === 'c2-call-004');
  const state = replay([{ sceneId: 'first-reply', choiceId: 'first-reply-1' }, { sceneId: 'c2-open', choiceId: 'c2-open-1' }], scene.id, line);
  await page.addInitScript(({ save, key }) => {
    localStorage.setItem(`${key}:save:auto`, save);
    localStorage.setItem(`${key}:settings`, JSON.stringify({ textSpeed: 0, music: true, volume: .4, voiceEnabled: true, voiceVolume: .6, soundEffects: false, ambience: false }));
    const levels: number[] = [], media: HTMLMediaElement[] = [];
    (window as unknown as { __voiceMix: { levels: number[]; media: HTMLMediaElement[] } }).__voiceMix = { levels, media };
    const target = AudioParam.prototype.setTargetAtTime;
    AudioParam.prototype.setTargetAtTime = function (value, time, constant) { levels.push(value); return target.call(this, value, time, constant); };
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { if (!media.includes(this)) media.push(this); this.playbackRate = .25; return play.call(this); };
  }, { key: KEY, save: JSON.stringify(encodeSave(state)) });
  await page.goto('/'); await page.getByRole('button', { name: '继续上次的故事', exact: true }).click();
  await expect(page.getByRole('button', { name: '暂停语音', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __voiceMix: { levels: number[] } }).__voiceMix.levels.some(value => Math.abs(value - .128) < .0001))).toBe(true);
  expect(await page.evaluate(() => (window as unknown as { __voiceMix: { media: HTMLMediaElement[] } }).__voiceMix.media.at(-1)!.volume)).toBe(.6);
  await page.evaluate(() => { (window as unknown as { __voiceMix: { levels: number[] } }).__voiceMix.levels.length = 0; });
  await page.getByRole('button', { name: '暂停语音', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __voiceMix: { levels: number[] } }).__voiceMix.levels.includes(.4))).toBe(true);
  await expect(page.locator('.game-screen')).toHaveAttribute('data-line', String(line));
});

