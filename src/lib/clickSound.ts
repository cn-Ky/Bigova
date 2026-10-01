export const CLICK_SOUND_ENABLED_KEY = "bigova-click-sound-enabled";
export const CLICK_SOUND_STYLE_KEY = "bigova-click-sound-style";

export const CLICK_SOUNDS = [
  { id: "soft", label: "Yumuşak", hint: "İnce ve kısa" },
  { id: "pop", label: "Pop", hint: "Tok ve sıcak" },
  { id: "chime", label: "Çan", hint: "Parlak ve hafif" },
] as const;

export type ClickSoundStyle = (typeof CLICK_SOUNDS)[number]["id"];

export function playClickSound(style: string) {
  if (typeof window === "undefined" || !window.AudioContext) return;

  try {
    const context = new window.AudioContext();
    const now = context.currentTime;
    const tones =
      style === "pop"
        ? [
            {
              from: 520,
              to: 260,
              start: 0,
              duration: 0.055,
              volume: 0.025,
              type: "triangle" as OscillatorType,
            },
          ]
        : style === "chime"
          ? [
              {
                from: 1046,
                to: 1175,
                start: 0,
                duration: 0.045,
                volume: 0.018,
                type: "sine" as OscillatorType,
              },
              {
                from: 1568,
                to: 1760,
                start: 0.025,
                duration: 0.055,
                volume: 0.012,
                type: "sine" as OscillatorType,
              },
            ]
          : [
              {
                from: 880,
                to: 660,
                start: 0,
                duration: 0.045,
                volume: 0.018,
                type: "sine" as OscillatorType,
              },
            ];

    for (const tone of tones) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + tone.start;
      oscillator.type = tone.type;
      oscillator.frequency.setValueAtTime(tone.from, start);
      oscillator.frequency.exponentialRampToValueAtTime(
        tone.to,
        start + tone.duration,
      );
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(tone.volume, start + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + tone.duration + 0.005);
    }

    window.setTimeout(() => void context.close(), 150);
  } catch {
    // Ses oynatma desteklenmiyorsa arayüz çalışmaya devam eder.
  }
}
