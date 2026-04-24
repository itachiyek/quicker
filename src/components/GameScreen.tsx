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
const RECOGNIZE_DELAY_MS = 700;

type Feedback = { kind: "correct" | "wrong"; digit: number } | null;

export default function GameScreen({
  onFinish,
}: {
  onFinish: (score: number, total: number) => void;
}) {
  const [equations] = useState<Equation[]>(() => makeEquations(POOL_SIZE));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const [busy, setBusy] = useState(false);

  const canvasRef = useRef<DrawCanvasHandle | null>(null);
  const recognizeTimer = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const indexRef = useRef(0);
  const scoreRef = useRef(0);
  const wrongDigitsRef = useRef<Set<number>>(new Set());
  const expectedAnswerRef = useRef<number>(equations[0].answer);

  useEffect(() => {
    indexRef.current = index;
    expectedAnswerRef.current = equations[index].answer;
    wrongDigitsRef.current = new Set();
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
            onFinish(scoreRef.current, indexRef.current);
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
    setBusy(true);
    const result = await recognize(model, canvas);
    setBusy(false);
    if (!result) return;

    const expected = expectedAnswerRef.current;
    if (result.digit === expected) {
      setFeedback({ kind: "correct", digit: result.digit });
      playCorrect();
      window.setTimeout(advance, 350);
    } else if (!wrongDigitsRef.current.has(result.digit)) {
      wrongDigitsRef.current.add(result.digit);
      setFeedback({ kind: "wrong", digit: result.digit });
      playWrong();
      window.setTimeout(() => {
        canvasRef.current?.clear();
        setFeedback(null);
      }, 600);
    }
  }, [model, advance]);

  const onStrokeEnd = useCallback(() => {
    if (recognizeTimer.current) window.clearTimeout(recognizeTimer.current);
    recognizeTimer.current = window.setTimeout(() => {
      tryRecognize();
    }, RECOGNIZE_DELAY_MS);
  }, [tryRecognize]);

  return (
    <div className="flex-1 flex flex-col p-3 sm:p-4 gap-3 max-w-md w-full mx-auto">
      {/* HUD */}
      <div className="flex items-center justify-between text-stone-700 font-medium">
        <div className="bg-white rounded-md border border-stone-300 px-3 py-1 shadow-sm">
          <span className="text-stone-500 text-xs mr-1">Richtig</span>
          <span className="tabular-nums font-bold">{score}</span>
        </div>
        <div
          className={`bg-white rounded-md border border-stone-300 px-3 py-1 shadow-sm tabular-nums font-bold ${
            timeLeft <= 10 ? "text-rose-600" : ""
          }`}
        >
          {timeLeft}s
        </div>
      </div>

      {/* Top screen: equations */}
      <div className="flex-1 min-h-0">
        <MathPanel rows={visibleRows} feedback={feedback} />
      </div>

      {/* Bottom screen: drawing */}
      <div className="aspect-square">
        <DrawCanvas ref={canvasRef} onStrokeEnd={onStrokeEnd} disabled={busy} />
      </div>
    </div>
  );
}
