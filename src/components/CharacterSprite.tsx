import type { Character, Expression } from '../game/types';
import { characterInfo } from '../story';
export function CharacterSprite({ character, className = '' }: { character: Character; expression?: Expression; className?: string }) {
  return <span className={`character-sprite ${className}`} role="img" aria-label={characterInfo[character].name} data-character={character}>
    <img className="netlove-sprite" src={`${import.meta.env.BASE_URL}art/${character}.webp`} alt="" aria-hidden="true" draggable="false" />
  </span>;
}
