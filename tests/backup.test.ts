import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chapters, finalEndingIds } from '../src/story';
import { newGame, replay, sceneMap } from '../src/game/engine';
import { rememberProgress, readChapter, readEnding, readGallery } from '../src/game/progress';
import { applyProgressImport, createReadingBackup, decodeProgressFile } from '../src/game/backup';
import { encodeSave, KEY, readEndings, readSave, slots, writeSave } from '../src/game/storage';
import type { Decision } from '../src/game/types';

const decisions: Decision[] = [
  { sceneId: 'first-reply', choiceId: 'first-reply-1' }, { sceneId: 'c2-open', choiceId: 'c2-open-1' },
  { sceneId: 'c2-call', choiceId: 'c2-call-1' }, { sceneId: 'c3-choice', choiceId: 'c3-choice-2' },
  { sceneId: 'c4-choice', choiceId: 'c4-choice-1' }, { sceneId: 'c5-choice', choiceId: 'c5-choice-1' },
];
let data: Map<string, string>;
let storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
function fullProgress() {
  for (const [index, id] of ['end-tinghe', 'end-xumi', 'end-friends', 'end-letter'].entries()) {
    const route = [...decisions.slice(0, -1), { sceneId: 'c5-choice', choiceId: `c5-choice-${index + 1}` }];
    const state = replay(route, id, sceneMap.get(id)!.lines.length - 1);
    rememberProgress(state, true); writeSave(slots[index], state);
  }
}
beforeEach(() => {
  data = new Map();
  storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: key => { data.delete(key); } };
  vi.stubGlobal('localStorage', storage);
});
afterEach(() => vi.unstubAllGlobals());

describe('complete reading backup', () => {
  it('roundtrips four slots, all five chapter starts, four proven endings and memories compactly', () => {
    fullProgress(); const before = createReadingBackup();
    expect(Object.keys(before.slots)).toHaveLength(4); expect(Object.keys(before.chapters)).toHaveLength(5); expect(Object.keys(before.endings)).toHaveLength(4);
    const raw = JSON.stringify(before); expect(raw.length).toBeLessThan(20_000); expect(raw).not.toContain('history'); expect(raw).not.toContain('stats');
    data.clear(); applyProgressImport(decodeProgressFile(raw));
    for (const slot of slots) expect(readSave(slot)?.state.sceneId).toBe(before.slots[slot]?.state.sceneId);
    for (const chapter of chapters) expect(readChapter(chapter.id)?.state.sceneId).toBe(chapter.start);
    for (const ending of finalEndingIds) expect(readEnding(ending)?.state.line).toBe(0);
    expect(readEndings()).toEqual(before.memories.endings); expect(readGallery()).toEqual(before.memories.gallery);
    expect(readSave('auto')!.state.history.length).toBeGreaterThan(100);
  });
  it('exports current in-memory progress even when its automatic slot could not be written', () => {
    writeSave('auto', newGame());
    const current = replay([], 'arrival', 2);
    const backup = createReadingBackup(current);
    expect(backup.slots.auto?.state.line).toBe(2); expect(readSave('auto')?.state.line).toBe(0);
  });
  it('preserves omitted local slots and checkpoints and merges local memories', () => {
    fullProgress(); const backup = createReadingBackup(); delete backup.slots['2']; delete backup.chapters[2]; delete backup.endings['xumi-final']; backup.memories.endings = backup.memories.endings.filter(id => id !== 'xumi-final');
    const retained = [data.get(`${KEY}:save:2`), data.get(`${KEY}:chapter:2`), data.get(`${KEY}:ending:xumi-final`)];
    backup.memories.gallery = ['bedroom']; applyProgressImport(decodeProgressFile(JSON.stringify(backup)));
    expect([data.get(`${KEY}:save:2`), data.get(`${KEY}:chapter:2`), data.get(`${KEY}:ending:xumi-final`)]).toEqual(retained);
    expect(readGallery()).toHaveLength(8); expect(readEndings()).toHaveLength(4);
  });
  it('keeps a reached event picture proof after starting over, and rejects a forged unread event', () => {
    const state = replay(decisions, 'c5-tinghe', 4);
    rememberProgress(state, false); writeSave('auto', newGame());
    const backup = createReadingBackup();
    expect(backup.pictures?.['tinghe-meeting']?.state.sceneId).toBe('c5-tinghe');
    expect(() => decodeProgressFile(JSON.stringify(backup))).not.toThrow();
    const bad = { ...backup, memories: { ...backup.memories, gallery: [...backup.memories.gallery, 'xumi-envelope'] } };
    expect(() => decodeProgressFile(JSON.stringify(bad))).toThrow(/画面/);
    data.clear(); applyProgressImport(decodeProgressFile(JSON.stringify(backup)));
    expect(createReadingBackup().pictures?.['tinghe-meeting']?.state.sceneId).toBe('c5-tinghe');
  });
  it('keeps legacy single-save JSON compatible without replacing manual slots', () => {
    writeSave('3', newGame()); const retained = data.get(`${KEY}:save:3`);
    const result = decodeProgressFile(JSON.stringify(encodeSave(replay([], 'arrival', 3))));
    expect(result.kind).toBe('single'); applyProgressImport(result);
    expect(readSave('auto')?.state.line).toBe(3); expect(data.get(`${KEY}:save:3`)).toBe(retained);
  });
  it('rejects foreign identities, impossible route proofs and unknown memory IDs before any write', () => {
    fullProgress(); const backup = createReadingBackup(), original = [...data];
    const corrupt = [
      { ...backup, game: 'moist-healing' }, { ...backup, storyVersion: 'netlove-v2' },
      { ...backup, slots: { ...backup.slots, auto: { ...backup.slots.auto, state: { ...backup.slots.auto!.state, decisions: [] } } } },
      { ...backup, chapters: { ...backup.chapters, 2: backup.chapters[1] } },
      { ...backup, endings: { ...backup.endings, 'tinghe-final': backup.endings['xumi-final'] } },
      { ...backup, memories: { ...backup.memories, gallery: ['absent'] } },
      { ...backup, endings: {} },
    ];
    for (const value of corrupt) expect(() => decodeProgressFile(JSON.stringify(value))).toThrow();
    expect([...data]).toEqual(original);
  });
  it('reconstructs every checkpoint and disregards forged stats and history', () => {
    fullProgress(); const backup = createReadingBackup();
    Object.assign(backup.slots.auto!.state, { stats: { honesty: 999 }, history: [{ text: 'forged' }] });
    const result = decodeProgressFile(JSON.stringify(backup));
    expect(result.kind).toBe('backup'); if (result.kind !== 'backup') return;
    expect(result.slots.auto!.state.stats.honesty).toBeLessThan(999);
    expect(result.slots.auto!.state.history.some(entry => entry.text === 'forged')).toBe(false);
  });
  it('rolls back a midway quota failure, including keys absent before the import', () => {
    fullProgress(); const imported = decodeProgressFile(JSON.stringify(createReadingBackup()));
    data.clear(); writeSave('auto', newGame()); writeSave('2', newGame()); data.set(`${KEY}:gallery`, '["bedroom"]'); data.set('another-game:save', 'untouched');
    const before = Object.fromEntries(data); let count = 0;
    storage.setItem = (key, value) => { if (++count === 8) throw new DOMException('full', 'QuotaExceededError'); data.set(key, value); };
    expect(() => applyProgressImport(imported)).toThrow(/原有进度已保留/);
    expect(Object.fromEntries(data)).toEqual(before);
  });
});
