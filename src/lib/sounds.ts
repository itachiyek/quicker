let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;

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
    masterGain.gain.value = 0.7;
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

export function unlockAudio() {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume();
}

function dest(): AudioNode | null {
  return masterGain ?? getCtx()?.destination ?? null;
}

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
  gain = 0.22,
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
  g.gain.linearRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g).connect(out);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

// ---- Pencil scratch ---------------------------------------------------

// Cached short noise buffer reused for every stroke tick.
let noiseBuffer: AudioBuffer | null = null;
function getNoise(c: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === c.sampleRate) return noiseBuffer;
  const len = Math.floor(c.sampleRate * 0.08);
  noiseBuffer = c.createBuffer(1, len, c.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return noiseBuffer;
}

let lastStrokeAt = 0;

/** Short pencil-scratch tick. Safe to call on every pointermove — internally
 *  rate-limited so we don't stack hundreds of voices a second. */
export function playStroke() {
  unlockAudio();
  const c = getCtx();
  const out = dest();
  if (!c || !out) return;
  const now = c.currentTime;
  if (now - lastStrokeAt < 0.035) return;
  lastStrokeAt = now;

  const src = c.createBufferSource();
  src.buffer = getNoise(c);
  src.playbackRate.value = 0.85 + Math.random() * 0.5;

  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1800 + Math.random() * 1800;
  filter.Q.value = 0.9;

  const g = c.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.18, now + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0005, now + 0.06);

  src.connect(filter).connect(g).connect(out);
  src.start(now);
  src.stop(now + 0.08);
}

// ---- Outcome cues -----------------------------------------------------

export function playCorrect() {
  unlockAudio();
  // Two-note arpeggio E5 → A5
  tone({ freq: 660, duration: 0.12, type: "triangle", gain: 0.28 });
  tone({
    freq: 880,
    duration: 0.18,
    type: "triangle",
    gain: 0.28,
    delay: 0.09,
  });
  // little sparkle
  tone({
    freq: 1320,
    duration: 0.12,
    type: "sine",
    gain: 0.12,
    delay: 0.18,
  });
}

export function playWrong() {
  unlockAudio();
  // Buzzer: descending square pulses
  tone({
    freq: 220,
    endFreq: 140,
    duration: 0.18,
    type: "sawtooth",
    gain: 0.22,
  });
  tone({
    freq: 180,
    endFreq: 110,
    duration: 0.22,
    type: "sawtooth",
    gain: 0.2,
    delay: 0.1,
  });
}

export function playStart() {
  unlockAudio();
  tone({ freq: 523, duration: 0.12, type: "triangle", gain: 0.25 });
  tone({ freq: 659, duration: 0.12, type: "triangle", gain: 0.25, delay: 0.12 });
  tone({ freq: 784, duration: 0.18, type: "triangle", gain: 0.25, delay: 0.24 });
}

export function playEnd() {
  unlockAudio();
  tone({ freq: 784, duration: 0.16, type: "triangle", gain: 0.25 });
  tone({ freq: 659, duration: 0.16, type: "triangle", gain: 0.25, delay: 0.16 });
  tone({ freq: 523, duration: 0.16, type: "triangle", gain: 0.25, delay: 0.32 });
  tone({ freq: 1046, duration: 0.34, type: "triangle", gain: 0.28, delay: 0.5 });
}
