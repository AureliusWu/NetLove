import manifest from './full-voice-manifest.json';
import type { Line } from './types';
import type { VoiceClip } from './voice';
export const voiceClips = manifest.clips as VoiceClip[];
// Written human messages and resolved conditional text use their exact stable identity.
// Playback does not make the sender physically present in the scene.
export function voiceFor(line: Line): VoiceClip | undefined {
  return voiceClips.find(clip => clip.lineId === line.id && clip.speaker === line.speaker && clip.text === line.text);
}
