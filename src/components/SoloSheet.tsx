"use client";

import { useEffect, useState } from "react";
import { loadModel } from "@/lib/recognizer";
import { playStart, unlockAudio } from "@/lib/sounds";
import Leaderboard from "./Leaderboard";
import BuyPanel from "./BuyRoundButton";
import ContestCard from "./ContestCard";
import InviteCard from "./InviteCard";
import { useSession } from "@/hooks/useSession";
import { usePlayStatus } from "@/hooks/usePlayStatus";

type Stats = {
  best_score: number;
  games_played: number;
  rank: number | null;
};

type Entry = {
  wallet: string;
  best_score: number;
  games_played: number;
};

function useStats(wallet: string | null): Stats | null {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    if (!wallet) return;
    let cancelled = false;
    import("@/lib/cache").then(({ fetchCached }) =>
      fetchCached<{ entries?: Entry[] }>("/api/leaderboard", 60_000)
        .then((d) => {
          if (cancelled) return;
          const entries = d.entries ?? [];
          const idx = entries.findIndex(
            (e) => e.wallet.toLowerCase() === wallet.toLowerCase(),
          );
          if (idx === -1) {
            setStats({ best_score: 0, games_played: 0, rank: null });
          } else {
            const me = entries[idx];
            setStats({
              best_score: me.best_score,
              games_played: me.games_played,
              rank: idx + 1,
            });
          }
        })
        .catch(() => !cancelled && setStats(null)),
    );
    return () => {
      cancelled = true;
    };
  }, [wallet]);
  return stats;
}

export default function SoloSheet({ onStart }: { onStart: () => void }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [startError, setStartError] = useState<string | null>(null);
  const { wallet } = useSession();
  const stats = useStats(wallet);
  const { status, refresh: refreshStatus } = usePlayStatus(!!wallet);

  useEffect(() => {
    loadModel((_m, p) => typeof p === "number" && setProgress(p)).catch(
      () => {},
    );
  }, []);

  const handleStart = async () => {
    if (!wallet) return;
    setStartError(null);
    unlockAudio();
    setLoading(true);
    try {
      const res = await fetch("/api/play/start", { method: "POST" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setStartError(data.error ?? "Unable to start");
        await refreshStatus();
        return;
      }
      await loadModel((_m, p) => typeof p === "number" && setProgress(p));
      playStart();
      onStart();
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "Unable to start");
    } finally {
      setLoading(false);
    }
  };

  const cooldown = (() => {
    if (!status?.nextFreeAt) return null;
    const ms = new Date(status.nextFreeAt).getTime() - Date.now();
    if (ms <= 0) return null;
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  })();

  return (
    <div className="flex flex-col gap-4 pb-4">
      {wallet && stats && (
        <section className="card-glass w-full p-3 grid grid-cols-3 divide-x divide-stone-200/80 text-center">
          <Mini label="Best" value={stats.best_score} />
          <Mini label="Games" value={stats.games_played} />
          <Mini
            label="Rank"
            value={stats.rank ? `#${stats.rank}` : "—"}
          />
        </section>
      )}

      <section className="card-glass w-full p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="chip">60s drill</span>
          {status && (
            <div className="flex items-center gap-2 text-xs tabular-nums">
              <span className="chip">
                {status.freeRemaining}/{status.freeCap} free
              </span>
              {status.paidCredits > 0 && (
                <span className="chip !text-amber-700 !border-amber-300 !bg-amber-50">
                  {status.paidCredits} credits
                </span>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleStart}
          disabled={loading || !wallet || status?.canPlay === false}
          className="btn-primary w-full text-base"
        >
          {loading ? "Loading…" : "Start"}
          {!loading && <span aria-hidden className="opacity-70">→</span>}
        </button>

        {cooldown && status?.canPlay === false && (
          <p className="text-[11px] text-stone-500 text-center -mt-2">
            Next free in {cooldown}
          </p>
        )}
        {startError && (
          <p className="text-xs text-rose-700 text-center -mt-2">
            {startError}
          </p>
        )}
        {progress > 0 && progress < 1 && (
          <div className="h-1 bg-stone-200 rounded-full overflow-hidden -mt-2">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}
      </section>

      {/* Top-up only appears when both the free quota and paid credits are
       *  exhausted. Promoted to its own card so it's actually visible. */}
      {status && status.canPlay === false && (
        <section className="card-glass w-full p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-9 h-9 rounded-xl bg-stone-900 text-amber-200 flex items-center justify-center text-base shrink-0">
              ⚡
            </span>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-stone-500">
                Out of free rounds
              </div>
              <div className="text-sm font-semibold">Top up to keep playing</div>
            </div>
          </div>
          <BuyPanel status={status} onPurchased={refreshStatus} />
        </section>
      )}

      {wallet && <InviteCard wallet={wallet} />}

      <ContestCard />

      <section className="w-full">
        <div className="flex items-baseline justify-between px-1 mb-2">
          <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
            All-time leaderboard
          </h3>
          <span className="text-xs text-stone-500">Top 10</span>
        </div>
        <Leaderboard highlightWallet={wallet} />
        <p className="mt-3 text-[11px] text-stone-500 text-center">
          Best single-game score · all time
        </p>
      </section>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-stone-500">
        {label}
      </div>
      <div className="display text-xl font-black italic tabular-nums leading-none mt-0.5">
        {value}
      </div>
    </div>
  );
}
