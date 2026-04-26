"use client";

import { useEffect, useMemo, useState } from "react";
import { loadModel } from "@/lib/recognizer";
import { playStart, unlockAudio } from "@/lib/sounds";
import WalletBar from "./WalletBar";
import Leaderboard from "./Leaderboard";
import Logo from "./Logo";
import BuyRoundButton from "./BuyRoundButton";
import { useSession } from "@/hooks/useSession";
import { usePlayStatus } from "@/hooks/usePlayStatus";

type PersonalStats = {
  best_score: number;
  games_played: number;
  rank: number | null;
};

type Entry = {
  wallet: string;
  best_score: number;
  games_played: number;
};

function useStats(wallet: string | null): PersonalStats | null {
  const [stats, setStats] = useState<PersonalStats | null>(null);
  useEffect(() => {
    if (!wallet) {
      setStats(null);
      return;
    }
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
  const [msg, setMsg] = useState("");
  const [startError, setStartError] = useState<string | null>(null);
  const { wallet } = useSession();
  const stats = useStats(wallet);
  const { status, refresh: refreshStatus } = usePlayStatus(!!wallet);

  useEffect(() => {
    loadModel((m, p) => {
      setMsg(m);
      if (typeof p === "number") setProgress(p);
    }).catch(() => {});
  }, []);

  const handleStart = async () => {
    if (!wallet) return;
    setStartError(null);
    unlockAudio();
    setLoading(true);
    try {
      // Server-side gate: consume one play (free or paid). Refuses if neither.
      const res = await fetch("/api/play/start", { method: "POST" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setStartError(data.error ?? "Unable to start a round");
        await refreshStatus();
        return;
      }
      await loadModel((m, p) => {
        setMsg(m);
        if (typeof p === "number") setProgress(p);
      });
      playStart();
      onStart();
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "Unable to start");
    } finally {
      setLoading(false);
    }
  };

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 5) return "Late night session";
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const remainingLabel = (() => {
    if (!status) return null;
    if (status.paidCredits > 0) {
      return `${status.paidCredits} purchased ${
        status.paidCredits === 1 ? "round" : "rounds"
      } + ${status.freeRemaining}/${status.freeCap} free`;
    }
    return `${status.freeRemaining} of ${status.freeCap} free rounds left`;
  })();

  const cooldownLabel = (() => {
    if (!status?.nextFreeAt) return null;
    const ms = new Date(status.nextFreeAt).getTime() - Date.now();
    if (ms <= 0) return null;
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `Next free round in ${h}h ${m}m`;
  })();

  return (
    <div className="flex-1 flex flex-col items-center max-w-md w-full mx-auto px-4 pt-6 pb-12 gap-5">
      {/* Top bar */}
      <header className="w-full flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Logo size={36} />
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
              Brain
            </div>
            <div className="text-base font-serif font-bold tracking-tight">
              Trainer
            </div>
          </div>
        </div>
        <WalletBar compact />
      </header>

      {/* Hero greeting */}
      <section className="w-full">
        <div className="text-xs text-stone-500 mb-1">{greeting}</div>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold leading-tight tracking-tight gradient-text">
          Sharpen your mind in 60 seconds.
        </h1>
      </section>

      {/* Stats card */}
      {wallet && stats && (
        <section className="card-glass w-full p-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone-500">
              Best
            </div>
            <div className="text-2xl font-serif font-bold tabular-nums">
              {stats.best_score}
            </div>
          </div>
          <div className="border-x border-stone-200/80">
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

      {/* Play card */}
      <section className="card-glass w-full p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="chip">Daily Drill</span>
            <span className="chip">+ − ×</span>
          </div>
          <span className="text-xs text-stone-500 tabular-nums">60s</span>
        </div>
        <p className="text-stone-700 text-sm leading-relaxed mb-4">
          Solve as many problems as you can in one minute. Draw your answer
          below — single or two-digit, the classifier reads it as you write.
        </p>

        {remainingLabel && (
          <div className="flex items-center justify-between gap-2 mb-4 text-xs">
            <span className="chip">{remainingLabel}</span>
            {cooldownLabel && (
              <span className="text-stone-500">{cooldownLabel}</span>
            )}
          </div>
        )}

        {status?.canPlay !== false ? (
          <button
            onClick={handleStart}
            disabled={loading || !wallet}
            className="btn-primary w-full text-base"
          >
            {loading ? "Loading…" : "Start Game"}
            {!loading && (
              <span aria-hidden className="-mr-1 opacity-80">
                →
              </span>
            )}
          </button>
        ) : status ? (
          <BuyRoundButton
            status={status}
            onPurchased={() => {
              refreshStatus();
            }}
          />
        ) : (
          <div className="text-sm text-stone-500 text-center py-2">
            Loading…
          </div>
        )}

        {startError && (
          <p className="mt-3 text-xs text-rose-700 text-center">
            {startError}
          </p>
        )}

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

      {/* Leaderboard */}
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
