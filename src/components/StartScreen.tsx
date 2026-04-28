"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import WalletBar from "./WalletBar";
import SideSheet from "./SideSheet";
import SoloSheet from "./SoloSheet";
import PvpSheet from "./PvpSheet";
import { useSession } from "@/hooks/useSession";

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

type ContestResp = {
  contest: {
    name: string;
    ends_at: string;
    ended: boolean;
  } | null;
  pool_wld: number;
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

function useContest() {
  const [data, setData] = useState<ContestResp | null>(null);
  useEffect(() => {
    fetch("/api/contest/weekly", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);
  return data;
}

type Mode = null | "solo" | "pvp";

export default function StartScreen({ onStart }: { onStart: () => void }) {
  const [mode, setMode] = useState<Mode>(null);
  const { wallet } = useSession();
  const stats = useStats(wallet);
  const contest = useContest();

  // Pop the side sheet open via push-state so the back gesture closes it.
  const open = (m: "solo" | "pvp") => setMode(m);
  const close = () => setMode(null);

  const contestEnded = contest?.contest?.ended === true;
  const contestRemaining = (() => {
    if (!contest?.contest || contestEnded) return null;
    const ms = new Date(contest.contest.ends_at).getTime() - Date.now();
    if (ms <= 0) return null;
    const d = Math.floor(ms / 86_400_000);
    const h = Math.floor((ms % 86_400_000) / 3_600_000);
    if (d > 0) return `${d}d ${h}h`;
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  })();

  return (
    <>
      <div className="flex-1 flex flex-col items-center max-w-md w-full mx-auto px-4 pt-5 pb-10 gap-5">
        <header className="w-full flex items-center justify-between">
          <div className="text-xl font-serif italic font-extrabold tracking-tight">
            Quicker
          </div>
          <WalletBar compact />
        </header>

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

        <h1 className="w-full text-center font-serif text-2xl font-bold tracking-tight mt-2">
          What today?
        </h1>

        {/* Big mode picker */}
        <div className="grid grid-cols-1 gap-3 w-full">
          <ModeCard
            icon="🎯"
            title="Solo"
            tagline="Daily drill · Leaderboard"
            onClick={() => open("solo")}
          />
          <ModeCard
            icon="⚔"
            title="PvP"
            tagline="Stake WLD or USDC · winner takes the pool"
            onClick={() => open("pvp")}
          />
        </div>

        {/* Weekly contest hint */}
        <Link
          href="/contest"
          className="card-glass w-full p-3 flex items-center gap-3 hover:bg-white/80 transition-colors"
        >
          <span className="w-9 h-9 rounded-xl bg-stone-900 text-amber-200 flex items-center justify-center text-base shrink-0">
            🏆
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-stone-500">
              {contest?.contest?.name ?? "Weekly Contest"}
            </div>
            <div className="text-xs text-stone-700 leading-snug">
              Top 10 split{" "}
              <span className="font-serif italic font-extrabold tabular-nums">
                {contest?.pool_wld ?? 200} WLD
              </span>
              {contestRemaining && (
                <span className="text-stone-500"> · {contestRemaining} left</span>
              )}
              {contestEnded && (
                <span className="text-stone-500"> · ended</span>
              )}
            </div>
          </div>
          <span className="text-stone-400 text-lg shrink-0" aria-hidden>
            →
          </span>
        </Link>
      </div>

      <SideSheet open={mode === "solo"} onClose={close} title="Solo">
        <SoloSheet onStart={onStart} />
      </SideSheet>
      <SideSheet open={mode === "pvp"} onClose={close} title="PvP">
        <PvpSheet />
      </SideSheet>
    </>
  );
}

function Mini({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-stone-500">
        {label}
      </div>
      <div className="text-xl font-serif font-bold tabular-nums leading-none mt-0.5">
        {value}
      </div>
    </div>
  );
}

function ModeCard({
  icon,
  title,
  tagline,
  onClick,
}: {
  icon: string;
  title: string;
  tagline: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="card-glass w-full p-5 flex items-center gap-4 hover:bg-white/80 active:scale-[0.99] transition-all text-left"
    >
      <span className="w-14 h-14 rounded-2xl bg-stone-900 text-amber-200 flex items-center justify-center text-2xl shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-serif text-2xl font-extrabold italic tracking-tight">
          {title}
        </div>
        <div className="text-xs text-stone-600 mt-0.5">{tagline}</div>
      </div>
      <span className="text-stone-400 text-2xl shrink-0" aria-hidden>
        →
      </span>
    </button>
  );
}
