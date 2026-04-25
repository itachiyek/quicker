"use client";

import { useEffect, useState } from "react";

type Entry = {
  wallet: string;
  display_name: string | null;
  best_score: number;
  games_played: number;
};

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export default function Leaderboard({
  highlightWallet,
}: {
  highlightWallet?: string | null;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/leaderboard", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { entries?: Entry[]; configured?: boolean }) => {
        if (cancelled) return;
        setEntries(d.entries ?? []);
        setConfigured(d.configured !== false);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!configured) {
    return (
      <div className="panel text-sm text-stone-500 text-center p-5">
        Leaderboard is being set up…
      </div>
    );
  }

  if (loading) {
    return (
      <div className="panel text-sm text-stone-400 text-center p-5">
        Loading…
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="panel text-sm text-stone-500 text-center p-5">
        No scores yet. Be the first.
      </div>
    );
  }

  return (
    <ol className="panel divide-y divide-stone-200 overflow-hidden">
      {entries.map((e, i) => {
        const rank = i + 1;
        const me =
          highlightWallet &&
          e.wallet.toLowerCase() === highlightWallet.toLowerCase();
        const short = `${e.wallet.slice(0, 6)}…${e.wallet.slice(-4)}`;
        return (
          <li
            key={e.wallet}
            className={`flex items-center gap-3 px-3 py-2.5 ${
              me ? "bg-amber-50" : ""
            }`}
          >
            <span className="w-7 text-center tabular-nums text-stone-500 font-medium">
              {MEDAL[rank] ?? rank}
            </span>
            <span className="flex-1 truncate font-mono text-sm text-stone-800">
              {e.display_name ?? short}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-stone-400 mr-1">
              {e.games_played}g
            </span>
            <span className="tabular-nums font-bold text-lg text-stone-900">
              {e.best_score}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
