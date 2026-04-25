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

  // Submit score if signed in.
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

  let title = "Gut gemacht!";
  if (score >= 25) title = "Hirn-Athlet!";
  else if (score >= 15) title = "Stark!";
  else if (score < 5) title = "Übung macht den Meister";

  return (
    <div className="flex-1 flex flex-col items-center p-4 gap-5 max-w-md w-full mx-auto pt-6">
      <div className="w-full flex justify-end">
        <WalletBar />
      </div>

      <div className="text-center">
        <h1 className="text-3xl font-serif font-bold">{title}</h1>
      </div>

      <div className="bg-white rounded-xl border border-stone-300 shadow-md p-6 w-full text-center">
        <div className="text-stone-500 text-xs uppercase tracking-wide">
          Richtig
        </div>
        <div className="text-6xl font-serif font-bold tabular-nums my-1">
          {score}
        </div>
        <div className="text-stone-500 text-sm">
          von {total} Aufgaben in {durationSeconds}s
        </div>

        <div className="mt-3 text-xs">
          {!wallet && (
            <span className="text-amber-700">
              Wallet verbinden, um deinen Score zu speichern.
            </span>
          )}
          {wallet && submitted && (
            <span className="text-emerald-700">Score gespeichert ✓</span>
          )}
          {wallet && !submitted && !submitError && (
            <span className="text-stone-500">Speichere…</span>
          )}
          {submitError && (
            <span className="text-rose-700">Fehler: {submitError}</span>
          )}
        </div>

        <button
          onClick={onRestart}
          className="mt-6 w-full py-3 rounded-lg bg-stone-800 text-white font-semibold shadow active:bg-stone-900"
        >
          Nochmal spielen
        </button>
      </div>

      <div className="w-full">
        <h2 className="text-sm font-semibold text-stone-700 mb-2 px-1">
          Leaderboard
        </h2>
        <Leaderboard highlightWallet={wallet} />
      </div>
    </div>
  );
}
