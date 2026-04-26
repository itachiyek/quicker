// 1ms of silent WAV; playing this through an HTMLAudioElement during a user
// gesture flips iOS Safari into the "playback" audio session category so
// subsequent Web Audio output is no longer muted by the silent switch.
const SILENT_WAV =
  "data:audio/wav;base64,UklGRkAAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRwAAACAgICAgICAgICAgICAgICAgICAgICAgIA=";

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let unlocked = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    masterGain = ctx.createGain();
    masterGain.gain.value = 1.0;
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

function dest(): AudioNode | null {
  return masterGain ?? getCtx()?.destination ?? null;
}

export function unlockAudio() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") {
    c.resume().catch(() => {});
  }
  if (unlocked) return;

  // 1) HTMLAudio gesture-unlock for iOS silent switch.
  try {
    const a = new Audio(SILENT_WAV);
    a.muted = false;
    a.volume = 0.01;
    void a.play().catch(() => {});
  } catch {
    /* ignore */
  }

  // 2) Web Audio gesture-unlock — play an empty buffer.
  try {
    const buf = c.createBuffer(1, 1, 22050);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.start(0);
    unlocked = true;
  } catch {
    /* ignore */
  }
}

export function installUnlockListeners() {
  if (typeof window === "undefined") return;
  const handler = () => unlockAudio();
  const opts = { once: true, passive: true } as AddEventListenerOptions;
  window.addEventListener("pointerdown", handler, opts);
  window.addEventListener("touchstart", handler, opts);
  window.addEventListener("keydown", handler, opts);
  window.addEventListener("click", handler, opts);
}

// ---- Tone helper ------------------------------------------------------

type ToneOpts = {
  freq: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  endFreq?: number;
};

function tone({
  freq,
  duration,
  type = "sine",
  gain = 0.4,
  delay = 0,
  endFreq,
}: ToneOpts) {
  const c = getCtx();
  const out = dest();
  if (!c || !out) return;
  const start = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
  }
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g).connect(out);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

// ---- Public cues ------------------------------------------------------

let lastStrokeAt = 0;

/** Short bright tick on every pointer move; rate-limited internally. */
export function playStroke() {
  unlockAudio();
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  if (now - lastStrokeAt < 0.04) return;
  lastStrokeAt = now;
  tone({
    freq: 1100 + Math.random() * 200,
    duration: 0.05,
    type: "square",
    gain: 0.18,
  });
}

export function playCorrect() {
  unlockAudio();
  tone({ freq: 660, duration: 0.1, type: "triangle", gain: 0.45 });
  tone({ freq: 880, duration: 0.16, type: "triangle", gain: 0.45, delay: 0.08 });
  tone({ freq: 1320, duration: 0.1, type: "sine", gain: 0.25, delay: 0.16 });
}

export function playWrong() {
  unlockAudio();
  tone({
    freq: 220,
    endFreq: 130,
    duration: 0.2,
    type: "sawtooth",
    gain: 0.4,
  });
  tone({
    freq: 180,
    endFreq: 100,
    duration: 0.22,
    type: "sawtooth",
    gain: 0.35,
    delay: 0.1,
  });
}

export function playStart() {
  unlockAudio();
  tone({ freq: 523, duration: 0.1, type: "triangle", gain: 0.4 });
  tone({ freq: 659, duration: 0.1, type: "triangle", gain: 0.4, delay: 0.1 });
  tone({ freq: 784, duration: 0.18, type: "triangle", gain: 0.4, delay: 0.2 });
}

export function playEnd() {
  unlockAudio();
  tone({ freq: 784, duration: 0.14, type: "triangle", gain: 0.4 });
  tone({ freq: 659, duration: 0.14, type: "triangle", gain: 0.4, delay: 0.14 });
  tone({ freq: 523, duration: 0.14, type: "triangle", gain: 0.4, delay: 0.28 });
  tone({ freq: 1046, duration: 0.3, type: "triangle", gain: 0.45, delay: 0.44 });
}
