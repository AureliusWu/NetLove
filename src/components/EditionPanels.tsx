import { useState } from 'react';
import { Icon } from './Icon';
import { chapters, cgInfo, endingInfo, finalEndingIds } from '../story';
import { readChapter, readEnding } from '../game/progress';
import { scoreInfo } from '../game/score';
import type { CgId, MusicId, Save } from '../game/types';
const art = (id: string) => `${import.meta.env.BASE_URL}art/${id}.webp`;
export function ChapterMenu({ begin, load }: { begin: () => void; load: (save: Save) => void }) {
  return <><div className="chapter-list">{chapters.map(chapter => {
    const save = readChapter(chapter.id), available = chapter.id === 1 || !!save;
    return <button className="chapter-card" key={chapter.id} disabled={!available} onClick={() => chapter.id === 1 ? begin() : save && load(save)}>
      <img src={art(chapter.background)} alt="" /><div><span className="eyebrow">CHAPTER 0{chapter.id} · {available ? '可阅读' : '读完前章后开启'}</span><h3>{chapter.title}</h3><p>{chapter.subtitle}</p></div><Icon name="arrow" /></button>;
  })}</div><p className="soft-note">五章完整收录。后续章节从实际到达过的章首重读，保留之前的选择。</p></>;
}
export function MemoryBook({ endings, gallery, scores, load, audition, onAudition }: {
  endings: string[]; gallery: CgId[]; scores: MusicId[]; load: (save: Save) => void;
  audition: MusicId | null; onAudition: (id: MusicId | null) => void;
}) {
  const [picture, setPicture] = useState<CgId | null>(null);
  if (picture) return <div className="cg-view"><button className="secondary" onClick={() => setPicture(null)}>返回消息归档</button><figure><img src={art(picture)} alt={cgInfo[picture].description} /><figcaption><strong>{cgInfo[picture].title}</strong><span>{cgInfo[picture].description}</span></figcaption></figure></div>;
  return <div className="edition-memories"><p className="soft-note">结局 {endings.length} / 4 · 梧城场景 {gallery.length} / 5。只收藏实际读到的内容。</p>
    <h3 className="memory-heading">后来，消息继续</h3><div className="memory-list">{finalEndingIds.map((id,index) => {
      const info=endingInfo[id], unlocked=endings.includes(id), save=unlocked?readEnding(id):null;
      return <article key={id} className={unlocked?'memory unlocked':'memory'}><span>0{index+1}</span><div><small>{unlocked?info.badge:'尚未到达'}</small><h3>{unlocked?info.label:'一段未读的消息'}</h3><p>{unlocked?info.subtitle:'阅读到最后，在见面以前做出自己的决定。'}</p>{save&&<button className="memory-replay" onClick={()=>load(save)}>重读这段结局 <Icon name="arrow" size={14}/></button>}</div><Icon name={unlocked?'check':'book'}/></article>;
    })}</div>
    <h3 className="memory-heading">梧城的五处风景</h3><div className="cg-grid">{(Object.keys(cgInfo) as CgId[]).map(id=><button className="cg-card" key={id} disabled={!gallery.includes(id)} onClick={()=>setPicture(id)}>{gallery.includes(id)?<img src={art(id)} alt={cgInfo[id].description}/>:<span className="cg-placeholder"><Icon name="book" size={32}/></span>}<strong>{gallery.includes(id)?cgInfo[id].title:'尚未抵达'}</strong></button>)}</div>
    <h3 className="memory-heading">同一座城的声音</h3><p className="soft-note">沿用 Project1 的离线程序配乐，按实际到达的场景解锁。试听结束后恢复阅读设置。</p><div className="score-list">{(Object.entries(scoreInfo) as [MusicId,(typeof scoreInfo)[MusicId]][]).map(([id,score])=><button className={audition===id?'score-card active':'score-card'} key={id} disabled={!scores.includes(id)} aria-pressed={audition===id} onClick={()=>onAudition(audition===id?null:id)}><Icon name={audition===id?'pause':'play'} size={19}/><span><strong>{scores.includes(id)?score.title:'尚未听见'}</strong><small>{scores.includes(id)?score.description:'继续阅读后开启。'}</small></span></button>)}</div>
  </div>;
}
export function Credits() {
  return <div className="credits-copy"><span className="eyebrow">NETLOVE · WUCHENG, 2020</span><h2>谢谢你接住这条消息。</h2><p>从一个匿名账号，到一个可以当面喊出的名字。梧城仍然有各自的生活，也留下了一段共同的时间。</p><dl>
    <div><dt>创作与制作</dt><dd>AureliusWu 与 AI 协作</dd></div>
    <div><dt>剧本</dt><dd>五章原创故事 · 四种结局</dd></div>
    <div><dt>美术</dt><dd>内置图像生成工具 · 两位角色与五处梧城场景</dd></div>
    <div><dt>框架与音乐</dt><dd>Project1 双端基础与六首程序配乐 · MIT</dd></div>
    <div><dt>制作方法</dt><dd>Test 剧情校验、素材溯源与实际包验收</dd></div>
    <div><dt>字体</dt><dd>Story Serif / Noto Serif SC · SIL OFL</dd></div>
  </dl><p className="soft-note">“网”恋 v{__APP_VERSION__} · 2020 架空梧城<br/>全部剧情与资源随客户端提供。</p></div>;
}
