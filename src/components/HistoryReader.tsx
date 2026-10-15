import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { RecordSearch } from './RecordSearch';
import { CharacterSprite } from './CharacterSprite';
import { historyFrame, readableHistory } from '../game/history-preview';
import type { GameState } from '../game/types';
import '../history-preview.css';

const art = (name: string) => `${import.meta.env.BASE_URL}art/${name}.webp`;

export function HistoryReader({ game, complete, onClose }: { game: GameState; complete: boolean; onClose: () => void }) {
  const entries = useMemo(() => readableHistory(game, complete), [game, complete]);
  const [index, setIndex] = useState<number | null>(null);
  const frame = useMemo(() => index === null ? null : historyFrame(game, complete, index), [game, complete, index]);
  const reader = useRef<HTMLElement | null>(null);
  const recordButton = useRef<HTMLButtonElement | null>(null);
  const recordScroll = useRef(0);
  useLayoutEffect(() => {
    const body = reader.current?.closest('.dialog-body');
    if (body) body.scrollTop = index === null ? recordScroll.current : 0;
    if (index === null) recordButton.current?.focus({ preventScroll: true });
  }, [index]);
  function returnToRecords() {
    setIndex(null);
  }
  return <section ref={reader} className="history-reader">
    <div hidden={index !== null}>
      <p className="history-review-note">选择已读文字，回看当时的画面。</p>
      <RecordSearch entries={entries} renderEntry={(entry, originalIndex) => <article>
        <span>{entry.speaker}</span><p>{entry.text}</p>
        <button type="button" className="history-open-frame" onClick={event => {
          recordButton.current = event.currentTarget;
          recordScroll.current = event.currentTarget.closest('.dialog-body')?.scrollTop ?? 0;
          setIndex(originalIndex);
        }}>回看这一段</button>
      </article>} />
    </div>
    {frame && index !== null && <section className="history-preview" aria-label="已读画面" data-scene={frame.sceneId} data-line={frame.line}>
      <div className="history-preview-toolbar">
        <button type="button" onClick={returnToRecords} autoFocus>返回记录</button>
        <span role="status" aria-live="polite">第 {index + 1} / {entries.length} 条已读文字</span>
        <button type="button" onClick={onClose}>回到当前阅读</button>
      </div>
      <div className="history-preview-frame" role="group" aria-label={`${frame.title} · ${frame.location}`}>
        <img className="history-preview-background" src={art(frame.cg ? `cg-${frame.cg}` : frame.background)} alt={frame.location} />
        {!frame.cg && frame.presentation.character && <CharacterSprite character={frame.presentation.character}
          expression={frame.presentation.expression} className="history-preview-character" />}
        <div className="history-preview-caption"><strong>{frame.title}</strong><span>{frame.location} · {frame.time}</span></div>
      </div>
      <article className="history-preview-text"><span>{frame.speaker}</span><p>{frame.text}</p></article>
      <nav className="history-preview-navigation" aria-label="回看已读段落">
        <button type="button" disabled={index === 0} onClick={() => setIndex(index - 1)}>上一段</button>
        <button type="button" disabled={index === entries.length - 1} onClick={() => setIndex(index + 1)}>下一段</button>
      </nav>
    </section>}
  </section>;
}
