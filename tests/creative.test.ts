import {describe,expect,it} from 'vitest';
import baseline from '../docs/production/CREATIVE-BASELINE-v1.json';
import story from '../src/story/story.json';
import frames from '../src/game/character-frames.json';
import {auditRevision,validateFrames} from '../scripts/vn-creative.mjs';
import {presentationAt,expressionIds} from '../src/game/presentation';
import {replay,getScene} from '../src/game/engine';
import {decodeSave,encodeSave} from '../src/game/storage';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
describe('creative revision and existing saves',()=>{
  it('preserves all positions and choices against the reviewed baseline',()=>{expect(auditRevision(baseline,story).revisedParagraphs).toBe(42);expect(validateFrames(frames)).toBe(2);});
  it('restores emotion after narration and old-style load without revealing chat-only characters',()=>{
    const state=replay([{sceneId:'first-reply',choiceId:'first-reply-1'},{sceneId:'c2-open',choiceId:'c2-open-1'},{sceneId:'c2-call',choiceId:'c2-call-1'}],'c2-camera',6);
    expect(presentationAt(getScene(state),6)).toEqual({character:'tinghe',expression:'surprised'});
    const save=encodeSave(state);save.state.history=save.state.history.map(({expression:_expression,...line})=>line);
    const loaded=decodeSave(JSON.stringify(save)).state;
    expect(presentationAt(getScene(loaded),loaded.line)).toEqual({character:'tinghe',expression:'surprised'});
    expect(presentationAt({...getScene(state),noSprite:true},6).character).toBeUndefined();
  });
  it('authors all six expressions at visible beats',()=>{const used=story.scenes.filter(s=>!s.noSprite).flatMap(s=>s.lines.map(l=>'expression'in l?l.expression:undefined)).filter(Boolean);expect(new Set(used)).toEqual(new Set(expressionIds));});
  it('preserves both recovered event originals and the exact runtime images',()=>{
    const manifest=JSON.parse(readFileSync('docs/production/CG-v0.3.0.json','utf8'));
    expect(manifest.assets).toHaveLength(2);
    for(const asset of manifest.assets){
      expect(createHash('sha256').update(readFileSync(asset.source)).digest('hex')).toBe(asset.sourceSha256);
      expect(createHash('sha256').update(readFileSync(asset.output)).digest('hex')).toBe(asset.sha256);
      expect(story.scenes.filter(scene=>'cg'in scene&&`cg-${scene.cg}`===asset.id)).toHaveLength(1);
    }
  });
});
