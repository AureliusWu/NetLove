import { describe, expect, test } from 'vitest';
import { advance, choose, continueStory, getScene, newGame, replay } from '../src/game/engine';
import { historyFrame, readableHistory } from '../src/game/history-preview';
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
});
