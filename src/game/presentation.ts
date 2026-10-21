import type { Character, Expression, Scene } from './types';
const speakers: Record<string, Character | undefined> = { 谢听禾: 'tinghe', 许弥: 'xumi' };
export const characterIds: Character[] = ['tinghe', 'xumi', 'luheng', 'jiming', 'grandma'];
export const expressionIds: Expression[] = ['neutral', 'smile', 'surprised', 'worried', 'hurt', 'shy'];
export const expressionLabels: Record<Expression, string> = {
  neutral: '平静', smile: '微笑', surprised: '惊讶', worried: '担忧', hurt: '委屈', shy: '害羞',
};
export function presentationAt(scene: Scene, lineIndex: number): { character?: Character; expression: Expression } {
  if (scene.noSprite) return { expression: 'neutral' };
  let character = scene.character;
  const expressions: Partial<Record<Character, Expression>> = {};
  for (const line of scene.lines.slice(0, lineIndex + 1)) {
    const speaker = speakers[line.speaker];
    if (speaker) {
      character = speaker;
      if (line.expression) expressions[speaker] = line.expression;
    }
  }
  return { character, expression: character ? expressions[character] ?? 'neutral' : 'neutral' };
}
