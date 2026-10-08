import type { Character, Expression, Scene } from './types';
const speakers: Record<string, Character | undefined> = { 谢听禾: 'tinghe', 许弥: 'xumi' };
export function presentationAt(scene: Scene, lineIndex: number): { character?: Character; expression: Expression } {
  if (scene.noSprite) return { expression: 'neutral' };
  let character = scene.character;
  for (const line of scene.lines.slice(0, lineIndex + 1)) character = speakers[line.speaker] ?? character;
  return { character, expression: 'neutral' };
}
