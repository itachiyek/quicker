"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { makeEquations, type Equation } from "@/lib/equations";
import { playCorrect, playWrong, playStart, unlockAudio } from "@/lib/sounds";

const ROUND_DURATION = 60; // seconds
const POINTS_PER_CORRECT = 10;
const POOL_SIZE = 200;
const ADVANCE_DELAY_CORRECT = 250;
const ADVANCE_DELAY_WRONG = 600;

type Pick = {
  index: number;
  correct: boolean;
};

export default function GameScreen({
  onFinish,
}: {
  onFinish: (score: number, total: number, durationSeconds: number) => void;
}) {
  const [equations] = useState<Equation[]>(() => makeEquations(POOL_SIZE));
  const [index, setIndex] = useState(0);
  const [points, setPoints] = useState(0);
  const [solved, setSolved] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const [pick, setPick] = useState<Pick | null>(null);

  const finishedRef = useRef(false);
  const indexRef = useRef(0);
  const pointsRef = useRef(0);
  const solvedRef = useRef(0);
  const lockRef = useRef(false);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);
  useEffect(() => {
    solvedRef.current = solved;
  }, [solved]);

  // Timer
  useEffect(() => {
    playStart();
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          window.clearInterval(id);
          if (!finishedRef.current) {
            finishedRef.current = true;
            onFinish(pointsRef.current, solvedRef.current, ROUND_DURATION);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [onFinish]);

  const eq = equations[index];

  const advance = useCallback(() => {
    setPick(null);
    setIndex((i) => Math.min(i + 1, equations.length - 1));
    lockRef.current = false;
  }, [equations.length]);

  const onChoose = useCallback(
    (choiceIdx: number) => {
      if (lockRef.current || finishedRef.current) return;
      lockRef.current = true;
      unlockAudio();
      const correct = eq.choices[choiceIdx] === eq.answer;
      setPick({ index: choiceIdx, correct });
      if (correct) {
        playCorrect();
        setPoints((p) => p + POINTS_PER_CORRECT);
        setSolved((s) => s + 1);
        setStreak((s) => s + 1);
        window.setTimeout(advance, ADVANCE_DELAY_CORRECT);
      } else {
        playWrong();
        setStreak(0);
        window.setTimeout(advance, ADVANCE_DELAY_WRONG);
      }
    },
    [eq, advance],
  );

  const timePct = useMemo(
    () => Math.max(0, Math.min(100, (timeLeft / ROUND_DURATION) * 100)),
    [timeLeft],
  );

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");

  return (
    <div className="flex-1 flex flex-col p-4 max-w-md w-full mx-auto gap-4">
      {/* HUD */}
      <header className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Time" value={`${mm}:${ss}`} />
        <Stat label="Score" value={String(points)} />
        <Stat
          label="Streak"
          value={
            <>
              {streak}
              {streak >= 3 && <span className="ml-0.5">🔥</span>}
            </>
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
      <section className="card-glass flex-1 flex items-center justify-center px-4 py-8">
        <div className="font-serif font-bold text-5xl sm:text-6xl tracking-tight tabular-nums text-center">
          {eq.text}
        </div>
      </section>

      {/* Answers */}
      <section className="grid grid-cols-2 gap-3">
        {eq.choices.map((c, i) => {
          const picked = pick?.index === i;
          const showCorrect = pick && c === eq.answer;
          let stateClass = "";
          if (picked && pick.correct) {
            stateClass = "bg-emerald-500 text-white border-emerald-600";
          } else if (picked && !pick.correct) {
            stateClass = "bg-rose-500 text-white border-rose-600 animate-pulse";
          } else if (showCorrect && pick && !pick.correct) {
            // also reveal correct answer when user got it wrong
            stateClass = "bg-emerald-50 text-emerald-800 border-emerald-300";
          } else {
            stateClass =
              "bg-white text-stone-900 border-stone-300 active:scale-[0.98]";
          }
          return (
            <button
              key={i}
              onClick={() => onChoose(i)}
              disabled={!!pick}
              className={`h-20 sm:h-24 rounded-2xl border text-3xl font-serif font-bold tabular-nums shadow-sm transition-all ${stateClass}`}
            >
              {c}
            </button>
          );
        })}
      </section>
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
