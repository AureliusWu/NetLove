import manifest from './voice-manifest.json';
import type { Line } from './types';
import type { VoiceClip } from './voice';
export const voiceClips = manifest.clips as VoiceClip[];
export function voiceFor(line:Line):VoiceClip|undefined {
  if(line.medium==='chat')return undefined;
  return voiceClips.find(clip=>clip.lineId===line.id&&clip.speaker===line.speaker&&clip.text===line.text);
}
