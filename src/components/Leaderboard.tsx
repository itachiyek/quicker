"use client";

import { useEffect, useState } from "react";

type Entry = {
  wallet: string;
  display_name: string | null;
  best_score: number;
  games_played: number;
};

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
      <div className="text-sm text-stone-500 text-center p-4">
        Leaderboard wird gerade eingerichtet…
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-sm text-stone-500 text-center p-4">Lade…</div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-sm text-stone-500 text-center p-4">
        Noch keine Scores. Sei der Erste!
      </div>
    );
  }

  return (
    <ol className="divide-y divide-stone-200 bg-white rounded-md border border-stone-300 overflow-hidden">
      {entries.map((e, i) => {
        const me =
          highlightWallet &&
          e.wallet.toLowerCase() === highlightWallet.toLowerCase();
        const short = `${e.wallet.slice(0, 6)}…${e.wallet.slice(-4)}`;
        return (
          <li
            key={e.wallet}
            className={`flex items-center gap-3 px-3 py-2 ${
              me ? "bg-amber-50" : ""
            }`}
          >
            <span className="w-6 text-right tabular-nums text-stone-500">
              {i + 1}
            </span>
            <span className="flex-1 truncate font-mono text-sm">
              {e.display_name ?? short}
            </span>
            <span className="tabular-nums font-bold text-lg">
              {e.best_score}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
