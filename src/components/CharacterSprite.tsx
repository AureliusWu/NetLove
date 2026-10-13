import type { CSSProperties } from 'react';
import type { Character, Expression } from '../game/types';
import { characterInfo } from '../story';
import { expressionIds, expressionLabels } from '../game/presentation';
import frames from '../game/character-frames.json';
export function CharacterSprite({ character, expression = 'neutral', className = '' }: { character: Character; expression?: Expression; className?: string }) {
  const atlas = frames[character];
  const [x, y, width, height] = atlas.frames[expressionIds.indexOf(expression)];
  const style = {
    '--sprite-ratio': width / height,
    '--atlas-width': `${atlas.width / width * 100}%`,
    '--atlas-height': `${atlas.height / height * 100}%`,
    '--atlas-left': `${-x / width * 100}%`,
    '--atlas-top': `${-y / height * 100}%`,
  } as CSSProperties;
  return <span className={`character-sprite ${className}`} style={style} role="img" aria-label={`${characterInfo[character].name} · ${expressionLabels[expression]}`} data-character={character} data-expression={expression}>
    <img className="netlove-sprite expression-atlas" src={`${import.meta.env.BASE_URL}art/${character}-expressions.webp`} alt="" aria-hidden="true" draggable="false" />
  </span>;
}
