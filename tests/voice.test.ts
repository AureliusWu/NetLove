import { expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { RecordedVoice, voiceBlocksAuto, type VoiceClip } from '../src/game/voice';
import { voiceClips, voiceFor } from '../src/game/voice-catalog';
import { scenes } from '../src/story';
import { readSettings, KEY } from '../src/game/storage';
const clip:VoiceClip={id:'test-voice',lineId:'fixture',speaker:'谢听禾',text:'测试',src:'voice/test.ogg'};
function mock(){
 const audios:Array<{play:()=>Promise<void>;pause:()=>void;paused:boolean;volume:number;preload:string;onended:((e:Event)=>void)|null;onerror:((e:Event)=>void)|null}>=[];
 const voice=new RecordedVoice(()=>{const a={paused:true,volume:0,preload:'',onended:null,onerror:null,play:async()=>{a.paused=false;},pause:()=>{a.paused=true;}};audios.push(a);return a as unknown as HTMLAudioElement;});
 voice.configure(true,0.6,true,true,false);return{voice,audios};
}
const settle=async()=>{await Promise.resolve();await Promise.resolve();};
it('starts a clip once per actual visit, waits through playback, and releases auto on end',async()=>{
 const {voice,audios}=mock();voice.enter(clip,'read-1');expect(voiceBlocksAuto(voice.getState())).toBe(true);await settle();
 expect(voice.getState().status).toBe('playing');expect(audios[0].volume).toBe(0.6);voice.enter(clip,'read-1');expect(audios).toHaveLength(1);
 audios[0].onended?.(new Event('ended'));expect(voice.getState().status).toBe('ended');expect(voiceBlocksAuto(voice.getState())).toBe(false);
});
it('pauses while hidden or in panels and preserves a manual pause across visibility changes',async()=>{
 const{voice,audios}=mock();voice.enter(clip,'1');await settle();voice.configure(true,0.3,false,true,false);expect(audios[0].paused).toBe(true);
 voice.configure(true,0.3,true,true,false);await settle();expect(voice.getState().status).toBe('playing');
 voice.pause();voice.configure(true,0.3,true,false,false);voice.configure(true,0.3,true,true,false);await settle();expect(voice.getState().status).toBe('paused');expect(voice.getState().userPaused).toBe(true);
 voice.resume();await settle();expect(voice.getState().status).toBe('playing');
});
it('isolates a late play promise from a newer line',async()=>{
 const{voice,audios}=mock();let resolve!:()=>void;voice.enter(clip,'1');await settle();
 audios[0].play=()=>new Promise<void>(done=>{resolve=done;});voice.pause();voice.resume();voice.enter({...clip,id:'next'},'2');await settle();resolve();await settle();
 expect(audios[0].paused).toBe(true);expect(voice.getState().clip?.id).toBe('next');expect(voice.getState().status).toBe('playing');
});
it('recovers a browser gesture block and allows reading past a missing recording',async()=>{
 const{voice,audios}=mock();voice.enter(clip,'1');await settle();audios[0].play=async()=>{throw new DOMException('gesture','NotAllowedError');};voice.pause();voice.resume();await settle();
 expect(voice.getState().status).toBe('blocked');audios[0].play=async()=>{};voice.unlock();await settle();expect(voice.getState().status).toBe('playing');
 audios[0].onerror?.(new Event('error'));expect(voice.getState().status).toBe('failed');expect(voiceBlocksAuto(voice.getState())).toBe(false);
});
it('permits deliberate history replay only while its panel is visible and stops on close',async()=>{
 const{voice,audios}=mock();voice.configure(true,1,false,true,true);voice.replay(clip,true);await settle();expect(voice.getState().status).toBe('playing');
 voice.configure(true,1,false,false,true);expect(audios[0].paused).toBe(true);voice.configure(true,1,false,true,true);await settle();expect(voice.getState().status).toBe('playing');
 voice.configure(true,1,true,true,false);expect(audios[0].paused).toBe(true);expect(voice.getState().status).toBe('idle');
});
it('does not play a newly loaded line while hidden, supports explicit same-line reload and disable',async()=>{
 const{voice,audios}=mock();voice.configure(true,1,true,false,false);voice.enter(clip,'1');await settle();expect(voice.getState().status).toBe('paused');expect(audios[0].paused).toBe(true);
 voice.configure(true,1,true,true,false);await settle();voice.enter(clip,'same-line-new-session');await settle();expect(audios).toHaveLength(2);expect(audios[0].paused).toBe(true);
 voice.configure(false,1,true,true,false);expect(voice.getState().status).toBe('idle');expect(voiceBlocksAuto(voice.getState())).toBe(false);
});
it('keeps planned line bindings exact without publishing placeholder recordings or chat voices',()=>{
 const plan=JSON.parse(readFileSync('docs/production/VOICE-BINDINGS-v0.3.0.json','utf8'));
 expect(plan.clips).toHaveLength(10);expect(plan.publishedClips).toBe(voiceClips.length);expect(voiceClips).toHaveLength(8);
 for(const planned of plan.clips){const scene=scenes.find(scene=>scene.id===planned.sceneId)!;const line=scene.lines.find(line=>line.id===planned.lineId)!;expect(line.text).toBe(planned.text);expect(line.speaker).toBe(planned.speaker);expect(line.medium).not.toBe('chat');expect(createHash('sha256').update(line.text).digest('hex')).toBe(planned.textSha256);const recorded=voiceClips.find(clip=>clip.lineId===line.id);if(recorded){expect(voiceFor(line)).toEqual(recorded);expect(planned.status).toBe('recorded-pending-human-listening');const bytes=readFileSync(`public/${recorded.src}`);expect(bytes.subarray(0,4).toString()).toBe('OggS');}else{expect(voiceFor(line)).toBeUndefined();expect(planned.status).toBe('planned-not-recorded');}}
});
it('defaults independent voice preferences for older settings',()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>key===`${KEY}:settings`?'{"volume":0.1,"voiceVolume":3}':null}});
 try{expect(readSettings().voiceEnabled).toBe(true);expect(readSettings().voiceVolume).toBe(1);expect(readSettings().volume).toBe(0.1);}finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else Reflect.deleteProperty(globalThis,'localStorage');}
});
