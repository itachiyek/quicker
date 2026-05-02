"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";

type Entry = {
  wallet: string;
  score: number;
  games_played: number;
  prize_wld: number;
};

type Contest = {
  id: number;
  name: string;
  starts_at: string;
  ends_at: string;
  ended: boolean;
};

type Resp = {
  configured: boolean;
  contest: Contest | null;
  pool_wld: number;
  payouts_wld: number[];
  entries: Entry[];
};

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function useCountdown(target: string | undefined): string {
  const [text, setText] = useState("…");
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const ms = new Date(target).getTime() - Date.now();
      if (ms <= 0) {
        setText("Ended");
        return;
      }
      const d = Math.floor(ms / 86_400_000);
      const h = Math.floor((ms % 86_400_000) / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      setText(`${d}d ${h}h ${m}m`);
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [target]);
  return text;
}

export default function ContestPage() {
  const router = useRouter();
  const { wallet, loading } = useSession();
  const [data, setData] = useState<Resp | null>(null);

  useEffect(() => {
    if (!loading && !wallet) router.replace("/login");
  }, [wallet, loading, router]);

  useEffect(() => {
    if (!wallet) return;
    fetch("/api/contest/weekly", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [wallet]);

  const remaining = useCountdown(
    data?.contest && !data.contest.ended ? data.contest.ends_at : undefined,
  );

  const slots: (Entry | null)[] = Array.from({ length: 10 }, (_, i) =>
    data?.entries[i] ?? null,
  );

  const ended = data?.contest?.ended === true;
  const endedAt = data?.contest?.ends_at
    ? new Date(data.contest.ends_at)
    : null;

  return (
    <main className="flex-1 flex flex-col items-center max-w-md w-full mx-auto px-4 pt-5 pb-10 gap-4">
      <header className="w-full flex items-center justify-between">
        <Link href="/" className="text-sm text-stone-600 hover:text-stone-900">
          ← Back
        </Link>
        <span className="text-sm font-serif italic font-extrabold tracking-tight">
          Quicker
        </span>
        <span className="w-12" />
      </header>

      <section className="card-glass w-full p-5 text-center">
        <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
          {data?.contest?.name ?? "Weekly Contest"} · pool
        </div>
        <div className="font-serif text-5xl font-extrabold italic tabular-nums my-1 gradient-text">
          {data?.pool_wld ?? 200} WLD
        </div>
        <div className="text-xs text-stone-500">Top 10 split it</div>
        <div className="mt-3">
          {ended ? (
            <span className="inline-flex items-center gap-1.5 chip">
              <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
              Ended {endedAt ? endedAt.toLocaleDateString() : ""}
            </span>
          ) : data?.contest ? (
            <span className="inline-flex items-center gap-1.5 chip">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              {remaining} remaining
            </span>
          ) : null}
        </div>
      </section>

      <section className="w-full">
        <div className="flex items-baseline justify-between px-1 mb-1">
          <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
            {ended ? "Final standings" : "Standings"}
          </h3>
          {!ended && data?.contest && (
            <span className="text-xs text-stone-500">Live</span>
          )}
        </div>
        <p className="px-1 mb-2 text-[11px] text-stone-500">
          Each Solo round adds to your weekly total.
        </p>
        <ol className="panel divide-y divide-stone-200 overflow-hidden">
          {slots.map((e, i) => {
            const rank = i + 1;
            const me =
              e && wallet && e.wallet.toLowerCase() === wallet.toLowerCase();
            const prize = data?.payouts_wld[i] ?? 0;
            return (
              <li
                key={i}
                className={`flex items-center gap-3 px-3 py-2.5 ${
                  me ? "bg-amber-50" : ""
                } ${!e ? "opacity-50" : ""}`}
              >
                <span className="w-7 text-center tabular-nums text-stone-500 font-medium">
                  {MEDAL[rank] ?? rank}
                </span>
                <span className="flex-1 truncate font-mono text-sm text-stone-800">
                  {e ? `${e.wallet.slice(0, 6)}…${e.wallet.slice(-4)}` : "—"}
                </span>
                <span className="tabular-nums text-stone-700 font-semibold w-10 text-right">
                  {e ? e.score : "·"}
                </span>
                <span className="tabular-nums text-amber-700 font-bold w-16 text-right">
                  {prize} WLD
                </span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 text-[11px] text-stone-500 text-center">
          Ties go to whoever started playing first.
        </p>
      </section>
    </main>
  );
}
