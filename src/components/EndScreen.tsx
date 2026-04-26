"use client";

import { useEffect, useState } from "react";
import { playEnd } from "@/lib/sounds";
import { useSession } from "@/hooks/useSession";

type Props = {
  points: number;
  solved: number;
  bestStreak: number;
  durationSeconds: number;
  onContinue: () => void;
};

type SubmitState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "skipped" }
  | { kind: "error"; reason: string };

export default function EndScreen({
  points,
  solved,
  bestStreak,
  durationSeconds,
  onContinue,
}: Props) {
  const { wallet } = useSession();
  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });

  useEffect(() => {
    playEnd();
  }, []);

  // Submit the final score in the background.
  useEffect(() => {
    if (!wallet) {
      setSubmit({ kind: "skipped" });
      return;
    }
    if (submit.kind !== "idle") return;
    setSubmit({ kind: "saving" });
    let cancelled = false;
    fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        score: points,
        total: solved,
        durationSeconds,
      }),
    })
      .then(async (r) => {
        if (cancelled) return;
        if (r.ok) setSubmit({ kind: "saved" });
        else setSubmit({ kind: "error", reason: (await r.text()).slice(0, 100) });
      })
      .catch((e) =>
        !cancelled &&
        setSubmit({
          kind: "error",
          reason: e instanceof Error ? e.message : "Failed",
        }),
      );
    return () => {
      cancelled = true;
    };
  }, [wallet, points, solved, durationSeconds, submit.kind]);

  let title = "Nice work";
  if (points >= 250) title = "Brain athlete";
  else if (points >= 150) title = "Solid drill";
  else if (points < 50) title = "Warming up";

  return (
    <main className="flex-1 flex flex-col items-center justify-center max-w-md w-full mx-auto px-5 py-8 gap-6">
      <header className="text-center">
        <div className="text-[10px] uppercase tracking-[0.25em] text-stone-500 mb-1">
          Round complete
        </div>
        <h1 className="text-3xl font-serif italic font-extrabold tracking-tight">
          {title}
        </h1>
      </header>

      {/* Big score */}
      <section className="card-glass w-full p-6 text-center">
        <div className="text-[10px] uppercase tracking-wider text-stone-500">
          Score
        </div>
        <div className="font-serif text-7xl font-bold tabular-nums leading-none my-1">
          {points}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-stone-200/80">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone-500">
              Correct
            </div>
            <div className="font-serif text-2xl font-bold tabular-nums">
              {solved}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone-500">
              Best streak
            </div>
            <div className="font-serif text-2xl font-bold tabular-nums">
              {bestStreak}
              {bestStreak >= 5 && <span className="ml-1">🔥</span>}
            </div>
          </div>
        </div>

        <div className="mt-4 text-[11px] h-4">
          {submit.kind === "saving" && (
            <span className="text-stone-500">Saving…</span>
          )}
          {submit.kind === "saved" && (
            <span className="text-emerald-700 font-medium">Score saved ✓</span>
          )}
          {submit.kind === "skipped" && (
            <span className="text-amber-700">
              Sign in to save scores
            </span>
          )}
          {submit.kind === "error" && (
            <span className="text-rose-700">Save failed</span>
          )}
        </div>
      </section>

      <button
        onClick={onContinue}
        className="btn-primary w-full text-base"
      >
        Continue →
      </button>
    </main>
  );
}
