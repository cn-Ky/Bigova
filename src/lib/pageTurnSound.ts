/** Sayfa çevirme sesi: kısa, filtrelenmiş bir gürültü patlaması (dosya gerekmez). */
export const BOOK_SOUND_KEY = "bigova-book-sound";

let ctx: AudioContext | null = null;

export function playPageTurn() {
  if (typeof window === "undefined" || !window.AudioContext) return;
  try {
    ctx ??= new window.AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const dur = 0.28;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      // Hızlı yükselen, yumuşak sönen zarf: kâğıdın "fışş" sesi
      data[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * Math.pow(t, 0.55)) * (1 - t);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2600, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + dur);
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.value = 0.16;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();
  } catch {
    /* ses desteklenmiyorsa sessizce geç */
  }
}
