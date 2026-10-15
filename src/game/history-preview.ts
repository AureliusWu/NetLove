import { getScene, recordLine, replay } from './engine';
import { presentationAt } from './presentation';
import type { Background, CgId, GameState, HistoryEntry } from './types';

export function readableHistory(state: GameState, complete: boolean): HistoryEntry[] {
  return complete ? recordLine(state).history : state.history;
}

export type HistoryFrame = {
  sceneId: string; line: number; title: string; location: string; time: string;
  background: Background; cg?: CgId; speaker: string; text: string;
  presentation: ReturnType<typeof presentationAt>;
};

/** Reconstruct an already-read position without touching the live game or storage. */
export function historyFrame(state: GameState, complete: boolean, index: number): HistoryFrame | null {
  const records = readableHistory(state, complete);
  if (!Number.isInteger(index) || index < 0 || index >= records.length) return null;
  const entry = records[index];
  // A later decision changes scores. Only the exact preceding prefix may be used
  // when native replay restores a historical text variant and its presentation.
  for (let count = 0; count <= state.decisions.length; count++) {
    try {
      const restored = replay(state.decisions.slice(0, count), entry.sceneId, entry.line);
      const scene = getScene(restored);
      const line = scene.lines[restored.line];
      if (line.id !== entry.id || line.text !== entry.text) return null;
      return {
        sceneId: scene.id, line: restored.line, title: scene.title, location: scene.location, time: scene.time,
        background: scene.background, cg: scene.cg, speaker: line.speaker, text: line.text,
        presentation: presentationAt(scene, restored.line),
      };
    } catch { /* The target needs a different preceding choice prefix. */ }
  }
  return null;
}
