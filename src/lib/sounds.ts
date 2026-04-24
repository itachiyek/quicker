let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume();
}

type ToneOpts = {
  freq: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
};

function tone({ freq, duration, type = "sine", gain = 0.18, delay = 0 }: ToneOpts) {
  const c = getCtx();
  if (!c) return;
  const start = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export function playCorrect() {
  unlockAudio();
  tone({ freq: 880, duration: 0.12, type: "triangle", gain: 0.22 });
  tone({ freq: 1320, duration: 0.18, type: "triangle", gain: 0.22, delay: 0.1 });
}

export function playWrong() {
  unlockAudio();
  tone({ freq: 220, duration: 0.18, type: "square", gain: 0.16 });
  tone({ freq: 160, duration: 0.22, type: "square", gain: 0.16, delay: 0.12 });
}

export function playStroke() {
  unlockAudio();
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(380 + Math.random() * 120, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.06, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.1);
}

export function playStart() {
  unlockAudio();
  tone({ freq: 523, duration: 0.12, type: "triangle" });
  tone({ freq: 659, duration: 0.12, type: "triangle", delay: 0.12 });
  tone({ freq: 784, duration: 0.18, type: "triangle", delay: 0.24 });
}

export function playEnd() {
  unlockAudio();
  tone({ freq: 784, duration: 0.16, type: "triangle" });
  tone({ freq: 659, duration: 0.16, type: "triangle", delay: 0.16 });
  tone({ freq: 523, duration: 0.16, type: "triangle", delay: 0.32 });
  tone({ freq: 1046, duration: 0.3, type: "triangle", delay: 0.48 });
}
