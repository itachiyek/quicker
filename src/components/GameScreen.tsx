"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DrawCanvas, { type DrawCanvasHandle } from "./DrawCanvas";
import { makeEquations, type Equation } from "@/lib/equations";
import {
  loadModel,
  recognizeOne,
  recognizeHalves,
  inkPresence,
} from "@/lib/recognizer";
import { playCorrect, playWrong, playStart, unlockAudio } from "@/lib/sounds";
import type * as tf from "@tensorflow/tfjs";

const ROUND_DURATION = 60; // seconds
const POOL_SIZE = 200;

// How long we wait after the last stroke before recognizing.
const RECOGNIZE_DELAY_MS_1 = 300; // 1-digit answers
const RECOGNIZE_DELAY_MS_2 = 600; // 2-digit answers

type Feedback = { kind: "correct" | "wrong"; value: string } | null;

export default function GameScreen({
  onFinish,
}: {
  onFinish: (result: {
    points: number;
    solved: number;
    bestStreak: number;
    durationSeconds: number;
  }) => void;
}) {
  const [equations] = useState<Equation[]>(() => makeEquations(POOL_SIZE));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [streakAnim, setStreakAnim] = useState<{ key: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [model, setModel] = useState<tf.LayersModel | null>(null);

  const canvasRef = useRef<DrawCanvasHandle | null>(null);
  const recognizeTimer = useRef<number | null>(null);
  const feedbackTimer = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const indexRef = useRef(0);
  const scoreRef = useRef(0);
  const bestStreakRef = useRef(0);
  const expectedRef = useRef<number>(equations[0].answer);
  const lockRef = useRef(false);

  useEffect(() => {
    indexRef.current = index;
    expectedRef.current = equations[index].answer;
    setFeedback(null);
    lockRef.current = false;
  }, [index, equations]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    if (streak > bestStreakRef.current) bestStreakRef.current = streak;
  }, [streak]);

  useEffect(() => {
    loadModel().then(setModel).catch(() => {});
  }, []);

  // Round timer
  useEffect(() => {
    playStart();
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          window.clearInterval(id);
          if (!finishedRef.current) {
            finishedRef.current = true;
            onFinish({
              points: scoreRef.current,
              solved: scoreRef.current,
              bestStreak: bestStreakRef.current,
              durationSeconds: ROUND_DURATION,
            });
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [onFinish]);

  const eq = equations[index];
  const expectedStr = String(eq.answer);
  const isTwoDigit = expectedStr.length === 2;

  const advance = useCallback(() => {
    setScore((s) => s + 1);
    setIndex((i) => Math.min(i + 1, equations.length - 1));
    canvasRef.current?.clear();
  }, [equations.length]);

  const tryRecognize = useCallback(async () => {
    if (lockRef.current || finishedRef.current) return;
    if (!model) return;
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;
    if (canvasRef.current?.isEmpty()) return;

    const expected = expectedRef.current;
    const expectedStr = String(expected);

    let drawn: string;
    if (expectedStr.length === 2) {
      // Need both halves filled before judging. If only one side has ink, it
      // means the user is mid-answer — wait for the next stroke.
      const presence = inkPresence(canvas);
      if (!presence.left || !presence.right) return;
      const result = await recognizeHalves(model, canvas);
      if (!result) return;
      drawn = `${result.digits[0]}${result.digits[1]}`;
    } else {
      const result = await recognizeOne(model, canvas);
      if (!result) return;
      drawn = String(result.digit);
    }

    if (drawn === expectedStr) {
      lockRef.current = true;
      unlockAudio();
      playCorrect();
      setFeedback({ kind: "correct", value: drawn });
      setStreak((s) => s + 1);
      window.setTimeout(advance, 220);
      return;
    }

    // Wrong
    unlockAudio();
    playWrong();
    canvasRef.current?.clear();
    setFeedback({ kind: "wrong", value: drawn });
    setStreak((s) => Math.max(0, s - 1));
    setStreakAnim({ key: Date.now() });
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), 600);
  }, [model, advance]);

  const onStrokeEnd = useCallback(() => {
    if (recognizeTimer.current) window.clearTimeout(recognizeTimer.current);
    const delay =
      String(expectedRef.current).length === 2
        ? RECOGNIZE_DELAY_MS_2
        : RECOGNIZE_DELAY_MS_1;
    recognizeTimer.current = window.setTimeout(tryRecognize, delay);
  }, [tryRecognize]);

  const timePct = useMemo(
    () => Math.max(0, Math.min(100, (timeLeft / ROUND_DURATION) * 100)),
    [timeLeft],
  );
  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");

  return (
    <div className="flex-1 flex flex-col p-4 max-w-md w-full mx-auto gap-3">
      {/* HUD */}
      <header className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Time" value={`${mm}:${ss}`} />
        <Stat label="Score" value={String(score)} />
        <Stat
          label="Streak"
          value={
            <span className="relative inline-flex items-center">
              {streak}
              {streak >= 3 && <span className="ml-0.5">🔥</span>}
              {streakAnim && (
                <span
                  key={streakAnim.key}
                  aria-hidden
                  className="streak-pop absolute -top-2 left-1/2 -translate-x-1/2 text-rose-600 font-bold text-base"
                >
                  −1
                </span>
              )}
            </span>
          }
        />
      </header>

      {/* time bar */}
      <div className="h-1 bg-stone-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-linear ${
            timeLeft <= 10 ? "bg-rose-500" : "bg-stone-800"
          }`}
          style={{ width: `${timePct}%` }}
        />
      </div>

      {/* Question */}
      <section className="card-glass flex items-center justify-center px-4 py-6">
        <div className="font-serif font-bold text-5xl sm:text-6xl tracking-tight tabular-nums text-center flex items-baseline gap-2">
          <span>{eq.text}</span>
          <span className="min-w-[1.5ch] text-left">
            {feedback ? (
              <span
                className={
                  feedback.kind === "correct"
                    ? "text-emerald-700"
                    : "text-rose-600 animate-pulse"
                }
              >
                {feedback.value}
              </span>
            ) : (
              <span className="text-stone-300">·</span>
            )}
          </span>
        </div>
      </section>

      {/* Hint */}
      <p className="text-center text-[11px] text-stone-500">
        {isTwoDigit
          ? "Two-digit answer · write tens left, ones right"
          : "Write your answer"}
      </p>

      {/* Canvas */}
      <div className="aspect-square">
        <DrawCanvas
          ref={canvasRef}
          onStrokeEnd={onStrokeEnd}
          divider={isTwoDigit}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
        {label}
      </div>
      <div className="text-lg sm:text-xl font-serif font-bold tabular-nums">
        {value}
      </div>
    </div>
  );
}
