"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Resp = {
  contest: {
    name: string;
    starts_at: string;
    ends_at: string;
    ended: boolean;
  } | null;
  pool_wld: number;
};

function fmtRemaining(target: string): string {
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function ContestCard() {
  const [data, setData] = useState<Resp | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetch("/api/contest/weekly", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);
  // re-render every minute so countdown updates without re-fetching
  void tick;

  const pool = data?.pool_wld ?? 200;
  const ended = data?.contest?.ended === true;
  const remaining = data?.contest && !ended
    ? fmtRemaining(data.contest.ends_at)
    : null;

  return (
    <Link
      href="/contest"
      className="card-glass w-full p-4 flex items-center gap-3 hover:bg-white/80 transition-colors"
    >
      <span className="w-11 h-11 rounded-xl bg-stone-900 text-amber-200 flex items-center justify-center text-xl shrink-0">
        🏆
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] uppercase tracking-wider text-stone-500">
            {data?.contest?.name ?? "Weekly Contest"}
          </span>
          {remaining && (
            <span className="text-[10px] text-stone-500 tabular-nums">
              · {remaining} left
            </span>
          )}
          {ended && (
            <span className="text-[10px] text-stone-500">· ended</span>
          )}
        </div>
        <div className="text-sm font-semibold leading-snug">
          Top 10 split{" "}
          <span className="font-serif italic font-extrabold tabular-nums">
            {pool} WLD
          </span>
        </div>
      </div>
      <span className="text-stone-400 text-lg shrink-0" aria-hidden>
        →
      </span>
    </Link>
  );
}
