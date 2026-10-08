import { scenes } from '../story';
import type { Decision, GameState, Scene } from './types';

export const sceneMap = new Map(scenes.map(scene => [scene.id, scene]));
export function getScene(state: GameState): Scene {
  const scene = sceneMap.get(state.sceneId);
  if (!scene) throw new Error('无法识别的剧情位置');
  return { ...scene, lines: scene.lines.map(line => line.variant && state.stats[line.variant.stat] >= line.variant.min ? { ...line, text: line.variant.text } : line) };
}
export function newGame(): GameState {
  return { schema: 1, storyVersion: 'netlove-v1', sceneId: 'arrival', line: 0,
    stats: { honesty: 0, tinghe: 0, xumi: 0 }, decisions: [], history: [] };
}
export function recordLine(state: GameState): GameState {
  const scene = getScene(state);
  const current = scene.lines[state.line];
  if (!current) return state;
  const last = state.history.at(-1);
  if (last?.sceneId === scene.id && last.line === state.line) return state;
  return { ...state, history: [...state.history, { ...current, sceneId: scene.id, line: state.line }].slice(-1500) };
}
export function advance(state: GameState): GameState {
  const scene = getScene(state);
  const recorded = recordLine(state);
  if (state.line < scene.lines.length - 1) return { ...recorded, line: state.line + 1 };
  if (scene.choices || scene.ending || scene.chapterEnd) return recorded;
  const target = scene.next;
  return target ? { ...recorded, sceneId: target, line: 0 } : recorded;
}
export function choose(state: GameState, choiceId: string): GameState {
  const scene = getScene(state);
  if (state.line !== scene.lines.length - 1) throw new Error('选择尚未出现');
  const choice = scene.choices?.find(c => c.id === choiceId);
  if (!choice) throw new Error('无效的选项');
  const stats = { ...state.stats };
  for (const key of ['honesty', 'tinghe', 'xumi'] as const) stats[key] += choice.effect?.[key] ?? 0;
  return { ...recordLine(state), sceneId: choice.next, line: 0, stats,
    decisions: [...state.decisions, { sceneId: scene.id, choiceId }] };
}
export function continueStory(state: GameState): GameState {
  const scene = getScene(state);
  if (!scene.continuation || state.line !== scene.lines.length - 1 || (!scene.ending && !scene.chapterEnd)) throw new Error('请先读完当前章节');
  return { ...recordLine(state), storyVersion: 'netlove-v1', sceneId: scene.continuation, line: 0 };
}
// Rebuild from choices instead of trusting imported stats/history. A save can only
// point to a position that is actually reachable along the declared route.
export function replay(decisions: Decision[], sceneId: string, line: number): GameState {
  let state = newGame();
  let decisionIndex = 0;
  for (let steps = 0; steps < 10000; steps++) {
    const scene = getScene(state);
    if (state.sceneId === sceneId && state.line === line && decisionIndex === decisions.length) return state;
    if (state.line === scene.lines.length - 1 && scene.choices) {
      const decision = decisions[decisionIndex++];
      if (!decision || decision.sceneId !== scene.id) throw new Error('存档路线不完整');
      state = choose(state, decision.choiceId);
    } else {
      const next = scene.continuation && state.line === scene.lines.length - 1 ? continueStory(state) : advance(state);
      if (next.sceneId === state.sceneId && next.line === state.line) break;
      state = next;
    }
  }
  throw new Error('存档位置无法到达');
}
