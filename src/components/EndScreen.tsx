"use client";

import { useEffect, useState } from "react";
import { playEnd } from "@/lib/sounds";
import Leaderboard from "./Leaderboard";
import WalletBar from "./WalletBar";
import { useSession } from "@/hooks/useSession";

export default function EndScreen({
  score,
  total,
  durationSeconds,
  onRestart,
}: {
  score: number;
  total: number;
  durationSeconds: number;
  onRestart: () => void;
}) {
  const { wallet } = useSession();
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    playEnd();
  }, []);

  useEffect(() => {
    if (!wallet || submitted) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score, total, durationSeconds }),
        });
        if (!r.ok) {
          const t = await r.text();
          if (!cancelled) setSubmitError(t.slice(0, 100));
          return;
        }
        if (!cancelled) setSubmitted(true);
      } catch (e) {
        if (!cancelled) setSubmitError(String(e).slice(0, 100));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wallet, score, total, durationSeconds, submitted]);

  let title = "Nice work!";
  let subtitle = "Run it back?";
  if (score >= 25) {
    title = "Brain Athlete";
    subtitle = "Elite reflexes.";
  } else if (score >= 15) {
    title = "Solid Drill";
    subtitle = "Consistency pays.";
  } else if (score < 5) {
    title = "Warming Up";
    subtitle = "Practice makes perfect.";
  }

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

      <section className="paper p-6 w-full text-center">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">
          {title}
        </div>
        <div className="font-serif text-7xl font-bold tabular-nums leading-none my-1">
          {score}
        </div>
        <div className="text-stone-600 text-sm mt-2">
          {score} of {total} solved · {durationSeconds}s
        </div>
        <div className="text-stone-500 text-xs mt-1 italic">{subtitle}</div>

        <div className="mt-4 text-xs">
          {!wallet && (
            <span className="text-amber-700">
              Connect a wallet to save your score.
            </span>
          )}
          {wallet && submitted && (
            <span className="text-emerald-700 font-medium">
              Score saved ✓
            </span>
          )}
          {wallet && !submitted && !submitError && (
            <span className="text-stone-500">Saving…</span>
          )}
          {submitError && (
            <span className="text-rose-700">{submitError}</span>
          )}
        </div>

        <button onClick={onRestart} className="btn-primary w-full mt-6">
          Play again
        </button>
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
    </div>
  );
}
