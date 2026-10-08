import { characterInfo } from '../story';
import { CharacterSprite } from './CharacterSprite';
import type { Character } from '../game/types';
export function CharacterGallery() {
  return <><div className="character-cards netlove-characters">{(Object.keys(characterInfo) as Character[]).map(id => <article key={id} className="character-card">
    <div className="character-portrait"><CharacterSprite character={id} className="gallery-sprite" /></div>
    <span className="eyebrow">{characterInfo[id].role}</span><h3>{characterInfo[id].name}</h3><p>{characterInfo[id].subtitle}</p><blockquote>{characterInfo[id].quote}</blockquote>
  </article>)}</div><p className="soft-note">周既明 / 23 岁，网页制作实习生，玩家视角。陆衡 / 24 岁，药店店员，互助群管理员。人物拥有各自的工作与计划，关系由你在故事中的实际选择推进。</p></>;
}
