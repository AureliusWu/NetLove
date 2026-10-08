import { describe, it, expect } from 'vitest';
import { scenes, chapters, finalEndingIds } from '../src/story';
import { advance, choose, continueStory, getScene, newGame, replay, sceneMap } from '../src/game/engine';
import { decodeSave, encodeSave } from '../src/game/storage';
import { presentationAt } from '../src/game/presentation';
import type { GameState, Scene } from '../src/game/types';
import story from '../src/story/story.json';
import { validateGraph } from '../scripts/vn-contract.mjs';
const cloneStory = (): {entry:string; scenes:Scene[]} => ({entry:story.entry,scenes:structuredClone(scenes)});
const terminals: GameState[] = [], visited=new Set<string>();
function explore(initial: GameState) {
  let state=initial;
  for(let steps=0;steps<1200;steps++) {
    const scene=getScene(state);visited.add(scene.id);
    if(state.line<scene.lines.length-1){state=advance(state);continue;}
    if(scene.choices){for(const choice of scene.choices)explore(choose(state,choice.id));return;}
    if(scene.continuation){state=continueStory(state);continue;}
    if(scene.ending){terminals.push(state);return;}
    const next=advance(state);if(next.sceneId===state.sceneId)throw new Error('Route stalled: '+scene.id);state=next;
  }
  throw new Error('Route did not terminate');
}
explore(newGame());
describe('authored story and native replay',()=>{
  it('validates unique stable IDs, successors and all scene reachability',()=>expect(validateGraph(story)).toEqual({contract:'1.0.0',scenes:43,lines:507,choices:6,endings:4}));
  it('plays all 288 choice combinations to a final ending',()=>{expect(terminals).toHaveLength(288);expect(new Set(terminals.map(s=>getScene(s).ending))).toEqual(new Set(finalEndingIds));});
  it('actually visits all 43 scenes',()=>expect(visited.size).toBe(scenes.length));
  it('roundtrips every full route, reconstructing stats and history',()=>{for(const s of terminals){const decoded=decodeSave(JSON.stringify(encodeSave(s))).state;expect(decoded.decisions).toEqual(s.decisions);expect(decoded.stats).toEqual(s.stats);expect(decoded.sceneId).toBe(s.sceneId);expect(decoded.line).toBe(s.line);expect(decoded.history.at(-1)?.text).toBe(s.history.at(-1)?.text);}});
  it('rejects saves for either other project',()=>{for(const game of ['moist-healing','before-the-rain-stops']){expect(()=>decodeSave(JSON.stringify({...encodeSave(newGame()),game}))).toThrow();}});
  it('rejects future story IDs and impossible positions',()=>{for(const patch of [{storyVersion:'netlove-v2'},{sceneId:'missing'},{line:-1},{line:999},{line:1.5}])expect(()=>decodeSave(JSON.stringify({...encodeSave(newGame()),state:{...newGame(),...patch}}))).toThrow();});
  it('cannot jump to an ending with no declared choices',()=>expect(()=>replay([], 'end-xumi',0)).toThrow());
  it('ignores forged imported stats and history',()=>{const s=terminals[0],raw=encodeSave(s);raw.state={...s,stats:{honesty:999,tinghe:999,xumi:999},history:[]};const decoded=decodeSave(JSON.stringify(raw)).state;expect(decoded.stats).toEqual(s.stats);expect(decoded.history.length).toBeGreaterThan(100);});
  it('rejects swapped and extra decision sequences',()=>{const s=terminals[0];const swapped=[...s.decisions].reverse();expect(()=>replay(swapped,s.sceneId,s.line)).toThrow();expect(()=>replay([...s.decisions,s.decisions[0]],s.sceneId,s.line)).toThrow();});
  it('only permits choices at the actual last paragraph',()=>{const first=replay([], 'first-reply',0);expect(()=>choose(first,'first-reply-1')).toThrow();});
  it('holds chapter breaks until explicit continuation',()=>{for(const chapter of chapters.slice(0,-1)){const s=scenes.find(s=>s.chapter===chapter.id&&s.continuation)!;const route=terminals[0];const decisions=route.decisions.filter(d=>sceneMap.get(d.sceneId)!.chapter<=chapter.id);const end=replay(decisions,s.id,s.lines.length-1);expect(advance(end).sceneId).toBe(end.sceneId);expect(continueStory(end).sceneId).toBe(s.continuation);}});
  it('does not add repeated history entries for a stopped chapter',()=>{const route=terminals[0];expect(advance(advance(route)).history.length).toBe(advance(route).history.length);});
  it('reconstructs a representative route at every paragraph',()=>{const decisions=terminals[0].decisions;let s=newGame(),cursor=0;for(let step=0;step<650;step++){const rebuilt=replay(s.decisions,s.sceneId,s.line);expect(rebuilt.stats).toEqual(s.stats);const scene=getScene(s);if(s.line===scene.lines.length-1&&scene.ending)return;if(s.line===scene.lines.length-1&&scene.choices)s=choose(s,decisions[cursor++].choiceId);else if(s.line===scene.lines.length-1&&scene.continuation)s=continueStory(s);else s=advance(s);}throw new Error('Representative replay stalled');});
  it('keeps a video-off character unseen and reveals the video-on sprite',()=>{expect(presentationAt(sceneMap.get('c2-voice')!,3).character).toBeUndefined();expect(presentationAt(sceneMap.get('c2-camera')!,0).character).toBe('tinghe');});
  it('uses authored callbacks only for earned preceding choices',()=>{const scene=sceneMap.get('c4-name')!;const index=scene.lines.findIndex(l=>l.variant);const state={...newGame(),sceneId:scene.id,line:index};expect(getScene(state).lines[index].text).toBe(scene.lines[index].text);expect(getScene({...state,stats:{...state.stats,honesty:3}}).lines[index].text).toBe(scene.lines[index].variant?.text);});
});
describe('shared structural rejection paths',()=>{
  it('rejects duplicate scenes and missing successors',()=>{const duplicate=cloneStory();duplicate.scenes.push(duplicate.scenes[0]);expect(()=>validateGraph(duplicate)).toThrow(/Duplicate/);const missing=cloneStory();missing.scenes[0].next='absent';expect(()=>validateGraph(missing)).toThrow(/Missing successor/);});
  it('rejects duplicate lines and accidental cycles',()=>{const duplicate=cloneStory();duplicate.scenes[0].lines[1].id=duplicate.scenes[0].lines[0].id;expect(()=>validateGraph(duplicate)).toThrow(/line ID/);const loop=cloneStory();loop.scenes[0].next='arrival';expect(()=>validateGraph(loop)).toThrow(/cycle/);});
  it('rejects unreachable and unfinished scenes',()=>{const data=cloneStory();data.scenes.push({...data.scenes[0],id:'unreachable',lines:[{...data.scenes[0].lines[0],id:'extra-line'}]});expect(()=>validateGraph(data)).toThrow(/Unreachable/);const unfinished=cloneStory();delete (unfinished.scenes.at(-1) as {ending?:string}).ending;expect(()=>validateGraph(unfinished)).toThrow(/Unfinished/);});
});
