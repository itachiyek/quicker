"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DrawCanvas, { type DrawCanvasHandle } from "./DrawCanvas";
import MathPanel from "./MathPanel";
import { makeEquations, type Equation } from "@/lib/equations";
import { loadModel, recognize } from "@/lib/recognizer";
import { playCorrect, playWrong } from "@/lib/sounds";
import type * as tf from "@tensorflow/tfjs";

const ROUND_DURATION = 60; // seconds
const VISIBLE_ROWS = 3;
const POOL_SIZE = 60;
const RECOGNIZE_DELAY_MS = 300;

type Feedback = { kind: "correct" | "wrong"; digit: number } | null;

export default function GameScreen({
  onFinish,
}: {
  onFinish: (score: number, total: number, durationSeconds: number) => void;
}) {
  const [equations] = useState<Equation[]>(() => makeEquations(POOL_SIZE));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [model, setModel] = useState<tf.LayersModel | null>(null);

  const canvasRef = useRef<DrawCanvasHandle | null>(null);
  const recognizeTimer = useRef<number | null>(null);
  const feedbackTimer = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const indexRef = useRef(0);
  const scoreRef = useRef(0);
  const expectedAnswerRef = useRef<number>(equations[0].answer);

  useEffect(() => {
    indexRef.current = index;
    expectedAnswerRef.current = equations[index].answer;
    setFeedback(null);
  }, [index, equations]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    loadModel().then(setModel).catch(() => {});
  }, []);

  // Timer
  useEffect(() => {
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          window.clearInterval(id);
          if (!finishedRef.current) {
            finishedRef.current = true;
            onFinish(scoreRef.current, indexRef.current, ROUND_DURATION);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [onFinish]);

  const visibleRows = useMemo(() => {
    const rows: { eq: Equation; status: "pending" | "current" | "correct" }[] = [];
    for (let i = 0; i < VISIBLE_ROWS; i++) {
      const idx = index + i;
      if (idx >= equations.length) break;
      rows.push({
        eq: equations[idx],
        status: i === 0 ? "current" : "pending",
      });
    }
    return rows;
  }, [index, equations]);

  const advance = useCallback(() => {
    setScore((s) => s + 1);
    setIndex((i) => Math.min(i + 1, equations.length - 1));
    canvasRef.current?.clear();
  }, [equations.length]);

  const tryRecognize = useCallback(async () => {
    if (!model) return;
    const canvas = canvasRef.current?.getCanvas();
    if (!canvas) return;
    if (canvasRef.current?.isEmpty()) return;
    const result = await recognize(model, canvas);
    if (!result) return;

    const expected = expectedAnswerRef.current;
    if (result.digit === expected) {
      setFeedback({ kind: "correct", digit: result.digit });
      playCorrect();
      window.setTimeout(advance, 180);
      return;
    }

    // Wrong: clear the canvas immediately so any new stroke isn't lost to a
    // delayed clear, and show what we read briefly in the math panel.
    canvasRef.current?.clear();
    setFeedback({ kind: "wrong", digit: result.digit });
    playWrong();
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), 500);
  }, [model, advance]);

  const onStrokeEnd = useCallback(() => {
    if (recognizeTimer.current) window.clearTimeout(recognizeTimer.current);
    recognizeTimer.current = window.setTimeout(() => {
      tryRecognize();
    }, RECOGNIZE_DELAY_MS);
  }, [tryRecognize]);

  const timePct = Math.max(
    0,
    Math.min(100, (timeLeft / ROUND_DURATION) * 100),
  );

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-4 gap-3 max-w-md w-full mx-auto">
      {/* HUD */}
      <div className="flex items-center gap-3">
        <div className="panel px-3 py-1.5 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-stone-500">
            Score
          </span>
          <span className="tabular-nums font-bold text-lg">{score}</span>
        </div>
        <div className="flex-1 panel px-3 py-1.5 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-700 ease-linear ${
                timeLeft <= 10 ? "bg-rose-500" : "bg-stone-700"
              }`}
              style={{ width: `${timePct}%` }}
            />
          </div>
          <span
            className={`tabular-nums font-bold text-sm ${
              timeLeft <= 10 ? "text-rose-600" : "text-stone-700"
            }`}
          >
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Top screen: equations */}
      <div className="flex-1 min-h-0">
        <MathPanel rows={visibleRows} feedback={feedback} />
      </div>

      {/* Bottom screen: drawing */}
      <div className="aspect-square">
        <DrawCanvas ref={canvasRef} onStrokeEnd={onStrokeEnd} />
      </div>
    </div>
  );
}
