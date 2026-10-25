export type SceneCue = 'bell' | 'staple' | 'shutter' | 'phone' | 'disconnect' | 'bicycle';
export type CueBinding = { scene: string; line: number; anchor: string; cue: SceneCue };

/** Short project-owned sounds; sources disconnect after their tails. */
export function playSceneCue(context: AudioContext, bus: GainNode, kind: SceneCue) {
  const now = context.currentTime;
  const tone = (frequency: number, offset: number, duration: number, strength: number) => {
    const source = context.createOscillator(), level = context.createGain(), at = now + offset;
    source.frequency.value = frequency;
    level.gain.setValueAtTime(0, at); level.gain.linearRampToValueAtTime(strength, at + .008);
    level.gain.exponentialRampToValueAtTime(.0001, at + duration);
    source.connect(level).connect(bus);
    source.onended = () => { source.disconnect(); level.disconnect(); };
    source.start(at); source.stop(at + duration + .02);
  };
  const noise = (offset: number, duration: number, cutoff: number) => {
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const data = buffer.getChannelData(0); let seed = 197;
    for (let i = 0; i < data.length; i++) { seed = (1664525 * seed + 1013904223) >>> 0; data[i] = (seed / 4294967296 * 2 - 1) * .18; }
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), level = context.createGain(), at = now + offset;
    source.buffer = buffer; filter.type = 'bandpass'; filter.frequency.value = cutoff; filter.Q.value = .6;
    level.gain.setValueAtTime(0, at); level.gain.linearRampToValueAtTime(.22, at + .006); level.gain.exponentialRampToValueAtTime(.0001, at + duration);
    source.connect(filter).connect(level).connect(bus);
    source.onended = () => { source.disconnect(); filter.disconnect(); level.disconnect(); };
    source.start(at); source.stop(at + duration + .02);
  };
  if (kind === 'bell') for (const offset of [0, .35]) { tone(880, offset, .65, .035); tone(1320, offset, .45, .012); }
  else if (kind === 'bicycle') { tone(1568, 0, .7, .035); tone(3136, 0, .35, .009); tone(1568, .23, .55, .022); }
  else if (kind === 'phone') { tone(100, 0, .11, .06); tone(100, .19, .13, .06); }
  else if (kind === 'disconnect') { tone(440, 0, .1, .025); tone(480, .15, .1, .025); }
  else if (kind === 'staple') { noise(0, .11, 1600); tone(180, .015, .07, .025); noise(.12, .06, 2400); }
  else { noise(0, .045, 2600); tone(220, .05, .045, .025); noise(.11, .04, 1900); }
}
export const sceneCueAt = (scene: string, line: number): SceneCue | undefined =>
  sceneCues.find(binding => binding.scene === scene && binding.line === line)?.cue;

export const sceneCues: readonly CueBinding[] = [
  {
    "scene": "arrival",
    "line": 9,
    "anchor": "手机震动",
    "cue": "phone"
  },
  {
    "scene": "c2-voice",
    "line": 9,
    "anchor": "通话挂断",
    "cue": "disconnect"
  },
  {
    "scene": "c5-open",
    "line": 1,
    "anchor": "车铃响",
    "cue": "bicycle"
  },
  {
    "scene": "c5-friends",
    "line": 14,
    "anchor": "车铃响了两声",
    "cue": "bicycle"
  }
];
