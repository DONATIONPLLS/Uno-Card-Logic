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

function tone(
  freq: number,
  durMs: number,
  type: OscillatorType = "sine",
  volume = 0.06,
  slideTo?: number,
  delayMs = 0,
) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  const startAt = c.currentTime + delayMs / 1000;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, startAt);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, startAt + durMs / 1000);
  g.gain.setValueAtTime(0.0001, startAt);
  g.gain.exponentialRampToValueAtTime(volume, startAt + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, startAt + durMs / 1000);
  o.connect(g).connect(c.destination);
  o.start(startAt);
  o.stop(startAt + durMs / 1000 + 0.02);
}

function noise(durMs: number, volume = 0.05, filterFreq = 2000, delayMs = 0) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  const startAt = c.currentTime + delayMs / 1000;
  const sampleCount = Math.floor((c.sampleRate * durMs) / 1000);
  const buffer = c.createBuffer(1, sampleCount, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < sampleCount; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filt = c.createBiquadFilter();
  filt.type = "bandpass";
  filt.frequency.value = filterFreq;
  filt.Q.value = 0.7;
  const g = c.createGain();
  g.gain.value = volume;
  src.connect(filt).connect(g).connect(c.destination);
  src.start(startAt);
  src.stop(startAt + durMs / 1000 + 0.02);
}

export const sfx = {
  click: () => tone(620, 60, "square", 0.04),
  swish: () => {
    tone(880, 120, "sine", 0.06, 380);
    noise(90, 0.025, 4000);
  },
  draw: () => tone(330, 90, "triangle", 0.06, 220),
  ding: () => {
    tone(880, 140, "sine", 0.07);
    setTimeout(() => tone(1320, 180, "sine", 0.06), 90);
  },
  shuffle: () => {
    // Layered short noise bursts to simulate cards riffling
    for (let i = 0; i < 6; i++) {
      noise(70, 0.04, 1800 + Math.random() * 1500, i * 55);
    }
  },
  impact: () => {
    // Heavy thud for skip/+2/+4 — sub-bass + clack
    tone(110, 180, "sawtooth", 0.09, 60);
    noise(120, 0.06, 800);
    tone(60, 250, "sine", 0.06, 35, 30);
  },
  yourTurn: () => {
    // Friendly two-note alert when it's the human player's turn
    tone(660, 120, "sine", 0.06);
    setTimeout(() => tone(990, 180, "sine", 0.07), 110);
  },
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => tone(f, 220, "triangle", 0.08), i * 110),
    );
  },
};
