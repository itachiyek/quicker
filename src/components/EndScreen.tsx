"use client";

import { useEffect } from "react";
import { playEnd } from "@/lib/sounds";

export default function EndScreen({
  score,
  total,
  onRestart,
}: {
  score: number;
  total: number;
  onRestart: () => void;
}) {
  useEffect(() => {
    playEnd();
  }, []);

  let title = "Gut gemacht!";
  if (score >= 25) title = "Hirn-Athlet!";
  else if (score >= 15) title = "Stark!";
  else if (score < 5) title = "Übung macht den Meister";

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-serif font-bold">{title}</h1>
      </div>
      <div className="bg-white rounded-xl border border-stone-300 shadow-md p-8 max-w-sm w-full text-center">
        <div className="text-stone-500 text-sm uppercase tracking-wide">
          Richtig
        </div>
        <div className="text-7xl font-serif font-bold tabular-nums my-2">
          {score}
        </div>
        <div className="text-stone-500 text-sm">
          von {total} Aufgaben
        </div>
        <button
          onClick={onRestart}
          className="mt-8 w-full py-4 rounded-lg bg-stone-800 text-white text-lg font-semibold shadow active:bg-stone-900"
        >
          Nochmal spielen
        </button>
      </div>
    </div>
  );
}
