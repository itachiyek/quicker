"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SideSheet from "./SideSheet";
import DrawCanvas, { type DrawCanvasHandle } from "./DrawCanvas";
import {
  canvasToTrainingSample,
  fineTunePersonal,
  clearPersonalModel,
  hasPersonalModel,
  loadModel,
} from "@/lib/recognizer";
import { playStroke } from "@/lib/sounds";

const SAMPLES_PER_DIGIT = 3;
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

type Phase = "collect" | "training" | "done";

export default function TrainSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // samples[d] = array of Float32Array(784) collected for digit d
  const [samples, setSamples] = useState<Record<number, Float32Array[]>>({});
  const [activeDigit, setActiveDigit] = useState<number>(0);
  const [phase, setPhase] = useState<Phase>("collect");
  const [trainingProgress, setTrainingProgress] = useState({
    epoch: 0,
    total: 0,
    loss: NaN,
  });
  const [error, setError] = useState<string | null>(null);
  const [hasPersonal, setHasPersonal] = useState(false);

  const canvasRef = useRef<DrawCanvasHandle | null>(null);
  const submitTimer = useRef<number | null>(null);

  // Reset state on each fresh open.
  useEffect(() => {
    if (!open) return;
    setSamples({});
    setActiveDigit(0);
    setPhase("collect");
    setError(null);
    setTrainingProgress({ epoch: 0, total: 0, loss: NaN });
    hasPersonalModel().then(setHasPersonal);
    // Make sure the global model is in memory so fine-tune starts fast.
    loadModel().catch(() => {});
  }, [open]);

  const collectedForActive = samples[activeDigit]?.length ?? 0;
  const totalCollected = Object.values(samples).reduce(
    (n, arr) => n + arr.length,
    0,
  );
  const totalTarget = DIGITS.length * SAMPLES_PER_DIGIT;

  // Auto-submit a sample 800ms after the user lifts their pen.
  const onStrokeEnd = useCallback(() => {
    if (submitTimer.current) window.clearTimeout(submitTimer.current);
    submitTimer.current = window.setTimeout(() => {
      const canvas = canvasRef.current?.getCanvas();
      if (!canvas) return;
      if (canvasRef.current?.isEmpty()) return;
      const sample = canvasToTrainingSample(canvas);
      if (!sample) return;
      setSamples((prev) => {
        const next = { ...prev };
        const current = next[activeDigit] ?? [];
        if (current.length >= SAMPLES_PER_DIGIT) return prev;
        next[activeDigit] = [...current, sample];
        return next;
      });
      canvasRef.current?.clear();
      // playStroke is hooked up inside DrawCanvas; no extra cue needed here
      void playStroke;
    }, 800);
  }, [activeDigit]);

  // Auto-advance digit once we have enough samples for it.
  useEffect(() => {
    if (collectedForActive < SAMPLES_PER_DIGIT) return;
    // Find next digit with fewer than SAMPLES_PER_DIGIT samples.
    const next = DIGITS.find(
      (d) => (samples[d]?.length ?? 0) < SAMPLES_PER_DIGIT,
    );
    if (next !== undefined && next !== activeDigit) {
      // Tiny delay so user sees the thumbnail land first.
      const t = window.setTimeout(() => setActiveDigit(next), 350);
      return () => window.clearTimeout(t);
    }
  }, [samples, collectedForActive, activeDigit]);

  const removeSample = (digit: number, idx: number) => {
    setSamples((prev) => {
      const next = { ...prev };
      const arr = (next[digit] ?? []).slice();
      arr.splice(idx, 1);
      next[digit] = arr;
      return next;
    });
  };

  const train = async () => {
    setPhase("training");
    setError(null);
    // Flatten samples into one Float32Array + labels.
    const flat = new Float32Array(totalCollected * 784);
    const labels = new Uint8Array(totalCollected);
    let i = 0;
    for (const d of DIGITS) {
      for (const s of samples[d] ?? []) {
        flat.set(s, i * 784);
        labels[i] = d;
        i++;
      }
    }

    try {
      await fineTunePersonal({
        samples: flat,
        labels,
        epochs: 18,
        onProgress: (epoch, total, loss) =>
          setTrainingProgress({ epoch, total, loss }),
      });
      setPhase("done");
      setHasPersonal(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Training failed");
      setPhase("collect");
    }
  };

  const reset = async () => {
    await clearPersonalModel();
    setHasPersonal(false);
  };

  const allDone = totalCollected >= totalTarget;

  return (
    <SideSheet open={open} onClose={onClose} title="Train AI">
      <div className="flex flex-col gap-4 pb-4">
        {phase === "collect" && (
          <>
            <section className="card-glass w-full p-5">
              <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
                Train your AI
              </div>
              <h2 className="display text-3xl font-black italic tracking-tight mt-1">
                Draw each digit 3 times.
              </h2>
              <p className="text-sm text-stone-600 mt-2 leading-snug">
                The classifier will learn your handwriting style. Stays on
                this device — never sent to a server.
              </p>
              <div className="mt-3 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-[width] duration-300"
                  style={{
                    width: `${Math.round(
                      (totalCollected / totalTarget) * 100,
                    )}%`,
                  }}
                />
              </div>
              <div className="mt-1 text-[11px] text-stone-500 text-right tabular-nums">
                {totalCollected} / {totalTarget}
              </div>
            </section>

            <section className="card-glass w-full p-4">
              <div className="text-center mb-2">
                <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
                  Sample {collectedForActive + 1} of {SAMPLES_PER_DIGIT}
                </div>
                <div className="display text-5xl font-black italic mt-1">
                  Write {activeDigit}
                </div>
              </div>
              <div className="aspect-square">
                <DrawCanvas ref={canvasRef} onStrokeEnd={onStrokeEnd} />
              </div>
            </section>

            <section className="w-full">
              <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2 px-1">
                Your samples
              </div>
              <div className="grid grid-cols-5 gap-2">
                {DIGITS.map((d) => {
                  const list = samples[d] ?? [];
                  const isActive = d === activeDigit;
                  return (
                    <button
                      key={d}
                      onClick={() => setActiveDigit(d)}
                      className={`paper relative aspect-square flex flex-col items-center justify-center transition ${
                        isActive
                          ? "ring-2 ring-stone-900"
                          : "hover:bg-stone-50"
                      }`}
                    >
                      <span className="display text-2xl font-black italic">
                        {d}
                      </span>
                      <div className="absolute bottom-1 left-0 right-0 flex items-center justify-center gap-0.5">
                        {Array.from({ length: SAMPLES_PER_DIGIT }).map(
                          (_, i) => (
                            <span
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${
                                i < list.length
                                  ? "bg-emerald-500"
                                  : "bg-stone-300"
                              }`}
                            />
                          ),
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {collectedForActive > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(samples[activeDigit] ?? []).map((s, i) => (
                    <SampleThumb
                      key={i}
                      sample={s}
                      onRemove={() => removeSample(activeDigit, i)}
                    />
                  ))}
                </div>
              )}
            </section>

            <button
              onClick={train}
              disabled={!allDone}
              className="btn-primary w-full disabled:opacity-40"
            >
              {allDone
                ? "Train my AI →"
                : `Need ${totalTarget - totalCollected} more samples`}
            </button>

            {hasPersonal && (
              <button
                onClick={reset}
                className="btn-ghost w-full text-sm text-stone-600"
              >
                Reset to default model
              </button>
            )}
            {error && (
              <p className="text-xs text-rose-700 text-center">{error}</p>
            )}
          </>
        )}

        {phase === "training" && (
          <section className="card-glass w-full p-6 text-center">
            <h2 className="display text-3xl font-black italic tracking-tight">
              Training…
            </h2>
            <p className="text-sm text-stone-600 mt-2">
              Updating the model with your handwriting. Hang on.
            </p>
            <div className="mt-5 h-2 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-stone-900 transition-[width] duration-200"
                style={{
                  width: `${
                    trainingProgress.total > 0
                      ? Math.round(
                          (trainingProgress.epoch / trainingProgress.total) *
                            100,
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
            <p className="mt-3 text-xs text-stone-500 tabular-nums">
              Epoch {trainingProgress.epoch}/{trainingProgress.total}
              {Number.isFinite(trainingProgress.loss) &&
                ` · loss ${trainingProgress.loss.toFixed(3)}`}
            </p>
          </section>
        )}

        {phase === "done" && (
          <section className="card-glass w-full p-6 text-center">
            <span className="inline-flex w-12 h-12 rounded-full bg-emerald-600 text-white items-center justify-center text-2xl mb-3">
              ✓
            </span>
            <h2 className="display text-3xl font-black italic tracking-tight">
              All set.
            </h2>
            <p className="text-sm text-stone-600 mt-2">
              The classifier now knows your handwriting. Try a Solo round to
              feel the difference.
            </p>
            <button
              onClick={onClose}
              className="btn-primary w-full mt-5"
            >
              Done
            </button>
            <button
              onClick={() => {
                setSamples({});
                setActiveDigit(0);
                setPhase("collect");
              }}
              className="mt-3 text-xs text-stone-500 hover:text-stone-900"
            >
              Train again
            </button>
          </section>
        )}
      </div>
    </SideSheet>
  );
}

/** Tiny 28×28 visualisation of a stored sample so the user can verify what
 *  was captured (and remove anything weird). */
function SampleThumb({
  sample,
  onRemove,
}: {
  sample: Float32Array;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(28, 28);
    for (let i = 0; i < 784; i++) {
      const v = Math.max(0, Math.min(1, sample[i]));
      const c = Math.round(255 - v * 255);
      img.data[i * 4 + 0] = c;
      img.data[i * 4 + 1] = c;
      img.data[i * 4 + 2] = c;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }, [sample]);
  return (
    <button
      onClick={onRemove}
      className="relative w-12 h-12 rounded-md overflow-hidden border border-stone-300 hover:border-rose-500 group"
      title="Remove sample"
    >
      <canvas ref={ref} width={28} height={28} className="w-full h-full" />
      <span className="absolute inset-0 bg-rose-500/0 group-hover:bg-rose-500/30 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 text-xs">
        ✕
      </span>
    </button>
  );
}
