import { describe, expect, test } from 'vitest';
import { advance, choose, continueStory, getScene, newGame, replay } from '../src/game/engine';
import { historyFrame, historyState, readableHistory } from '../src/game/history-preview';
import type { GameState } from '../src/game/types';

const decisions = [
  { sceneId: 'first-reply', choiceId: 'first-reply-1' },
  { sceneId: 'c2-open', choiceId: 'c2-open-1' },
  { sceneId: 'c2-call', choiceId: 'c2-call-1' },
];

function finishRoute(state: GameState): GameState {
  for (let count = 0; count < 650; count++) {
    const scene = getScene(state);
    if (state.line === scene.lines.length - 1) {
      if (scene.ending) return state;
      if (scene.choices) { state = choose(state, scene.choices[0].id); continue; }
      if (scene.continuation) { state = continueStory(state); continue; }
    }
    state = advance(state);
  }
  throw new Error('Route did not terminate');
}

describe('temporary review of native already-read positions', () => {
  test('excludes the currently typing line and refuses unread or invalid indices', () => {
    const state = advance(newGame());
    expect(readableHistory(state, false)).toHaveLength(1);
    expect(historyFrame(state, false, 0)?.line).toBe(0);
    for (const index of [-1, 1, 999, 0.5, NaN]) expect(historyFrame(state, false, index)).toBeNull();
    expect(historyFrame(newGame(), false, 0)).toBeNull();
    expect(historyFrame(state, true, 1)?.line).toBe(state.line);
  });

  test('uses the historical choice prefix for earlier scores and authored text variants', () => {
    const current = finishRoute(newGame());
    const snapshot = JSON.stringify(current);
    const entries = readableHistory(current, true);
    const target = entries.findIndex(entry => entry.sceneId === 'c4-name' && !!entry.variant);
    const frame = historyFrame(current, true, target)!;
    const preceding = current.decisions.filter(decision => decision.sceneId !== 'c5-choice');
    const original = replay(preceding, frame.sceneId, frame.line);
    expect(frame.text).toBe(getScene(original).lines[frame.line].text);
    expect(frame.text).toBe(entries[target].text);
    expect(historyFrame(current, true, 0)?.sceneId).toBe('arrival');
    expect(JSON.stringify(current)).toBe(snapshot);
  });

  test('recovers narration-inherited expressions and keeps a voice-only character hidden', () => {
    const state = replay(decisions, 'c2-camera', 7);
    const entries = readableHistory(state, true);
    const target = entries.findIndex(entry => entry.sceneId === 'c2-camera' && entry.line === 6);
    expect(historyFrame(state, true, target)?.presentation).toEqual({ character: 'tinghe', expression: 'surprised' });
    const voice = replay([...decisions.slice(0, 2), { sceneId: 'c2-call', choiceId: 'c2-call-2' }], 'c2-voice', 3);
    expect(historyFrame(voice, true, readableHistory(voice, true).length - 1)?.presentation.character).toBeUndefined();
    expect(entries.every(entry => entry.sceneId !== 'c2-voice')).toBe(true);
  });

  test('rereads before a choice with its original scores and removes all later choices and history', () => {
    const current = finishRoute(newGame());
    const original = structuredClone(current);
    const source = getScene(replay([], 'first-reply', 0));
    const index = readableHistory(current, true).findIndex(entry => entry.sceneId === source.id && entry.line === source.lines.length - 1);
    const restored = historyState(current, true, index)!;
    expect(restored.decisions).toEqual([]);
    expect(restored.stats).toEqual(newGame().stats);
    expect(restored).toEqual(replay([], source.id, source.lines.length - 1));
    const alternative = choose(restored, source.choices![1].id);
    expect(alternative.decisions).toEqual([{ sceneId: source.id, choiceId: source.choices![1].id }]);
    expect(alternative.sceneId).toBe(source.choices![1].next);
    expect(current).toEqual(original);
  });

  test('restores a later choice with only its preceding route and safely rejects changed history text', () => {
    const current = finishRoute(newGame());
    const entries = readableHistory(current, true);
    const target = entries.findIndex(entry => entry.sceneId === 'c5-choice' && entry.line === getScene(replay(current.decisions.slice(0, -1), 'c5-choice', 0)).lines.length - 1);
    const restored = historyState(current, true, target)!;
    expect(restored.decisions).toEqual(current.decisions.slice(0, -1));
    expect(restored.history.every(entry => !entry.sceneId.startsWith('end-'))).toBe(true);
    expect(finishRoute(choose(restored, 'c5-choice-2')).sceneId).toBe('end-xumi');
    const damaged = { ...current, history: current.history.map((entry, index) => index === target ? { ...entry, text: '已改变的记录' } : entry) };
    expect(historyState(damaged, true, target)).toBeNull();
  });
});
