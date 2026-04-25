"use client";

import { useEffect, useState } from "react";
import { loadModel } from "@/lib/recognizer";
import { playStart, unlockAudio } from "@/lib/sounds";
import WalletBar from "./WalletBar";
import Leaderboard from "./Leaderboard";
import { useSession } from "@/hooks/useSession";

export default function StartScreen({ onStart }: { onStart: () => void }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState("");
  const { wallet } = useSession();

  useEffect(() => {
    loadModel((m, p) => {
      setMsg(m);
      if (typeof p === "number") setProgress(p);
    }).catch(() => {});
  }, []);

  const handleStart = async () => {
    unlockAudio();
    setLoading(true);
    try {
      await loadModel((m, p) => {
        setMsg(m);
        if (typeof p === "number") setProgress(p);
      });
      playStart();
      onStart();
    } catch {
      setMsg("Failed to load model. Reload.");
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center p-4 gap-6 max-w-md w-full mx-auto pt-5 pb-10">
      <header className="w-full flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-stone-500">
            Brain
          </div>
          <h1 className="text-3xl font-serif font-bold tracking-tight leading-none">
            Trainer
          </h1>
        </div>
        <WalletBar />
      </header>

      <section className="paper p-6 w-full">
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-xs uppercase tracking-wider text-stone-500">
            Daily Drill
          </span>
          <span className="text-xs text-stone-500 tabular-nums">60s</span>
        </div>
        <h2 className="font-serif text-2xl font-semibold leading-snug mb-3">
          Solve as many problems as you can in one minute.
        </h2>
        <p className="text-stone-600 text-sm leading-relaxed mb-5">
          Draw your answer in the panel below. The classifier reads each digit
          as you write — no keyboard, no buttons.
        </p>

        <button
          onClick={handleStart}
          disabled={loading || !wallet}
          className="btn-primary w-full text-base"
        >
          {loading ? "Loading…" : "Start Game"}
        </button>

        {(loading || (progress > 0 && progress < 1)) && (
          <div className="mt-4">
            <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-stone-500 text-center">{msg}</p>
          </div>
        )}
      </section>

      <section className="w-full">
        <div className="flex items-baseline justify-between px-1 mb-2">
          <h3 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">
            Leaderboard
          </h3>
          <span className="text-xs text-stone-500">Top 100</span>
        </div>
        <Leaderboard highlightWallet={wallet} />
      </section>

      <footer className="text-[10px] text-stone-400 text-center px-2">
        Inspired by Dr. Kawashima&apos;s Brain Training. Handwriting model
        trained on MNIST.
      </footer>
    </div>
  );
}
