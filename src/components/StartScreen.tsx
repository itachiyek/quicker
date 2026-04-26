"use client";

import { useEffect, useState } from "react";
import { loadModel } from "@/lib/recognizer";
import { playStart, unlockAudio } from "@/lib/sounds";
import WalletBar from "./WalletBar";
import Leaderboard from "./Leaderboard";
import BuyPanel from "./BuyRoundButton";
import ContestCard from "./ContestCard";
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
    fetch("/api/leaderboard", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { entries?: Entry[] }) => {
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
      .catch(() => !cancelled && setStats(null));
    return () => {
      cancelled = true;
    };
  }, [wallet]);
  return stats;
}

export default function StartScreen({ onStart }: { onStart: () => void }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [startError, setStartError] = useState<string | null>(null);
  const { wallet } = useSession();
  const stats = useStats(wallet);
  const { status, refresh: refreshStatus } = usePlayStatus(!!wallet);

  useEffect(() => {
    loadModel((_m, p) => typeof p === "number" && setProgress(p)).catch(() => {});
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
    <div className="flex-1 flex flex-col items-center max-w-md w-full mx-auto px-4 pt-5 pb-10 gap-4">
      <header className="w-full flex items-center justify-between">
        <div className="text-xl font-serif italic font-extrabold tracking-tight">
          Quicker
        </div>
        <WalletBar compact />
      </header>

      {wallet && stats && (
        <section className="card-glass w-full p-4 grid grid-cols-3 divide-x divide-stone-200/80 text-center">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone-500">
              Best
            </div>
            <div className="text-2xl font-serif font-bold tabular-nums">
              {stats.best_score}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone-500">
              Games
            </div>
            <div className="text-2xl font-serif font-bold tabular-nums">
              {stats.games_played}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone-500">
              Rank
            </div>
            <div className="text-2xl font-serif font-bold tabular-nums">
              {stats.rank ? `#${stats.rank}` : "—"}
            </div>
          </div>
        </section>
      )}

      <ContestCard />

      {/* Play card */}
      <section className="card-glass w-full p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="chip">60s drill</span>
          {status && (
            <div className="flex items-center gap-2 text-xs tabular-nums">
              <span className="chip">
                {status.freeRemaining}/{status.freeCap} free
              </span>
              <span
                className={`chip ${
                  status.paidCredits > 0
                    ? "!text-amber-700 !border-amber-300 !bg-amber-50"
                    : ""
                }`}
              >
                {status.paidCredits} credits
              </span>
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
          <p className="text-xs text-rose-700 text-center -mt-2">{startError}</p>
        )}
        {progress > 0 && progress < 1 && (
          <div className="h-1 bg-stone-200 rounded-full overflow-hidden -mt-2">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}

        {status && (
          <div className="pt-3 border-t border-stone-200/70">
            <BuyPanel status={status} onPurchased={refreshStatus} />
          </div>
        )}
      </section>

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
