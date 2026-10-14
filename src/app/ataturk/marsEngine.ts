// Arka plan marşı: Web Audio ile tarayıcıda üretilen ÖZGÜN bir kompozisyon.
// Hiçbir kayıt ya da mevcut eser kullanılmaz; bu yüzden telif sorunu yoktur.
// Ses dosyası istenirse /public/audio/mars.mp3 konur, sayfa onu öncelikli kullanır.

export const BPM = 104;
export const STEP = 60 / BPM / 4; // 16'lık nota süresi (sn)
const D4 = 293.66;

// Hicaz renginde (re mi♭ fa♯ sol la si♭ do) 16 ölçülük (2/4) ezgi.
// [D4'ten yarım ses uzaklığı | null = es, 16'lık nota sayısı]
type Note = [number | null, number];
const BARS: Note[][] = [
  [[7, 3], [7, 1], [8, 2], [7, 2]],
  [[5, 3], [5, 1], [4, 2], [5, 2]],
  [[7, 3], [7, 1], [12, 2], [10, 2]],
  [[8, 4], [7, 4]],
  [[7, 3], [7, 1], [8, 2], [7, 2]],
  [[5, 3], [5, 1], [4, 2], [5, 2]],
  [[4, 3], [1, 1], [0, 2], [1, 2]],
  [[0, 6], [null, 2]],
  [[12, 3], [12, 1], [10, 2], [8, 2]],
  [[7, 3], [7, 1], [8, 2], [10, 2]],
  [[12, 3], [12, 1], [13, 2], [12, 2]],
  [[10, 4], [8, 4]],
  [[7, 3], [8, 1], [10, 2], [8, 2]],
  [[7, 3], [5, 1], [4, 2], [5, 2]],
  [[4, 3], [1, 1], [0, 2], [1, 2]],
  [[0, 6], [null, 2]],
];
export const LOOP_STEPS = BARS.length * 8;

const MELODY = new Map<number, { semi: number; len: number }>();
{
  let pos = 0;
  for (const bar of BARS) {
    for (const [semi, len] of bar) {
      if (semi !== null) MELODY.set(pos, { semi, len });
      pos += len;
    }
  }
}

export function makeNoise(ctx: BaseAudioContext) {
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function noiseHit(
  ctx: BaseAudioContext,
  out: AudioNode,
  noise: AudioBuffer,
  t: number,
  type: BiquadFilterType,
  freq: number,
  level: number,
  decay: number,
) {
  const src = ctx.createBufferSource();
  src.buffer = noise;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(level, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + decay);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 0.5, decay + 0.05);
}

function tone(
  ctx: BaseAudioContext,
  out: AudioNode,
  t: number,
  type: OscillatorType,
  freq: number,
  level: number,
  decay: number,
  sweepTo?: number,
) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (sweepTo) o.frequency.exponentialRampToValueAtTime(sweepTo, t + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(level, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0008, t + decay);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + decay + 0.05);
}

function lead(ctx: BaseAudioContext, out: AudioNode, t: number, semi: number, len: number) {
  const f = D4 * 2 ** (semi / 12);
  const dur = len * STEP * 0.9; // hafif ayrık, yürüyüş hissi
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.13, t + 0.03);
  g.gain.setTargetAtTime(0.085, t + 0.05, 0.1);
  g.gain.setTargetAtTime(0.0001, t + dur, 0.05);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 2400;
  lp.Q.value = 0.8;
  lp.connect(g).connect(out);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.5;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 8;
  lfo.connect(lfoGain);
  for (const detune of [-7, 7]) {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = f;
    o.detune.value = detune;
    lfoGain.connect(o.detune);
    o.connect(lp);
    o.start(t);
    o.stop(t + dur + 0.4);
  }
  lfo.start(t);
  lfo.stop(t + dur + 0.4);
}

/** n. 16'lık adımı t anına planlar (gerçek zamanlı ve çevrimdışı bağlamda aynı çalışır). */
export function scheduleStep(
  ctx: BaseAudioContext,
  out: AudioNode,
  noise: AudioBuffer,
  n: number,
  t: number,
) {
  const s = n % 8;
  const bar = Math.floor(n / 8) % 16;

  if (s === 0 || s === 4) {
    tone(ctx, out, t, "sine", 130, s === 0 ? 0.55 : 0.45, 0.3, 48); // davul
    tone(ctx, out, t, "triangle", s === 0 ? 73.42 : 110, 0.2, 0.34); // bas: re – la
  }
  if (s === 2 || s === 3 || s === 6 || s === 7) {
    noiseHit(ctx, out, noise, t, "bandpass", 2200, s === 7 ? 0.16 : 0.1, 0.09); // trampet
  }
  if (s === 0 && bar % 2 === 0) {
    noiseHit(ctx, out, noise, t, "highpass", 7000, 0.05, 0.4); // zil
  }

  const note = MELODY.get(n % LOOP_STEPS);
  if (note) lead(ctx, out, t, note.semi, note.len);
}
