let ctx: AudioContext | null = null;
let enabled = true;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      ctx = new AC();
    } catch {
      ctx = null;
    }
  }
  return ctx;
}

export function setSoundEnabled(v: boolean) {
  enabled = v;
}

function tone(freq: number, durMs: number, type: OscillatorType = "sine", volume = 0.06, slideTo?: number) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + durMs / 1000);
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(volume, c.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + durMs / 1000);
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + durMs / 1000 + 0.02);
}

export const sfx = {
  click: () => tone(620, 60, "square", 0.04),
  swish: () => tone(880, 120, "sine", 0.07, 380),
  draw: () => tone(330, 90, "triangle", 0.06, 220),
  ding: () => {
    tone(880, 140, "sine", 0.07);
    setTimeout(() => tone(1320, 180, "sine", 0.06), 90);
  },
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 220, "triangle", 0.08), i * 110));
  },
};
