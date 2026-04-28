"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/hooks/useSession";
import CreateLobbySheet from "./CreateLobbySheet";
import RulesSheet from "./RulesSheet";
import HistorySheet from "./HistorySheet";

type Lobby = {
  id: string;
  creator_wallet: string;
  token_symbol: "WLD" | "USDC";
  amount_per_player: number;
  creator_score: number | null;
  created_at: string;
};

type PvpStats = {
  played: number;
  won: number;
  lost: number;
  tied: number;
  open: number;
};

export default function PvpSheet() {
  const { wallet } = useSession();
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [stats, setStats] = useState<PvpStats | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetch("/api/lobby/list", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { lobbies?: Lobby[] }) => setLobbies(d.lobbies ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!wallet) return;
    fetch("/api/me/pvp-stats", { cache: "no-store" })
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, [wallet]);

  return (
    <div className="flex flex-col gap-4 pb-4">
      {wallet && stats && (
        <section className="card-glass w-full p-3 grid grid-cols-4 divide-x divide-stone-200/80 text-center">
          <Mini label="Played" value={stats.played} />
          <Mini label="Won" value={stats.won} accent="emerald" />
          <Mini label="Lost" value={stats.lost} accent="rose" />
          <Mini label="Tied" value={stats.tied} accent="amber" />
        </section>
      )}

      <section className="card-glass w-full p-6 text-center">
        <div className="text-[10px] uppercase tracking-[0.25em] text-stone-500">
          PvP Battle
        </div>
        <h2 className="display text-4xl font-black italic tracking-tight mt-2 leading-[0.95]">
          Stake.
          <br />
          Solve. Win.
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary w-full mt-5"
        >
          Create lobby
        </button>
        <div className="mt-3 flex items-center justify-center gap-3 text-xs text-stone-500">
          <button
            onClick={() => setShowRules(true)}
            className="hover:text-stone-900 underline-offset-2 hover:underline"
          >
            Rules
          </button>
          <span className="text-stone-300">·</span>
          <button
            onClick={() => setShowHistory(true)}
            className="hover:text-stone-900 underline-offset-2 hover:underline"
          >
            Match history
          </button>
        </div>
      </section>

      <section className="w-full">
        <div className="flex items-baseline justify-between px-1 mb-2">
          <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
            Open lobbies
          </h3>
          <span className="text-xs text-stone-500">{lobbies.length}</span>
        </div>
        {lobbies.length === 0 ? (
          <div className="panel text-sm text-stone-500 text-center p-5">
            No open lobbies. Be the first.
          </div>
        ) : (
          <ol className="panel divide-y divide-stone-200 overflow-hidden">
            {lobbies.map((l) => {
              const short = `${l.creator_wallet.slice(0, 6)}…${l.creator_wallet.slice(-4)}`;
              const me = l.creator_wallet.toLowerCase() === wallet?.toLowerCase();
              return (
                <li key={l.id}>
                  <Link
                    href={`/battles/${l.id}`}
                    className="flex items-center gap-3 px-3 py-3 hover:bg-stone-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm text-stone-800 truncate">
                        {me ? "you" : short}
                      </div>
                      <div className="text-[11px] text-stone-500">
                        Score to beat:{" "}
                        <span className="font-bold tabular-nums">
                          {l.creator_score ?? "?"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="display font-black italic tabular-nums text-lg">
                        {l.amount_per_player} {l.token_symbol}
                      </div>
                      <div className="text-[10px] text-stone-500">per player</div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <RulesSheet open={showRules} onClose={() => setShowRules(false)} />
      <HistorySheet open={showHistory} onClose={() => setShowHistory(false)} />
      {showCreate && (
        <CreateLobbySheet onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

function Mini({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: "emerald" | "rose" | "amber";
}) {
  const cls =
    accent === "emerald"
      ? "text-emerald-700"
      : accent === "rose"
        ? "text-rose-700"
        : accent === "amber"
          ? "text-amber-700"
          : "";
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-stone-500">
        {label}
      </div>
      <div
        className={`display text-xl font-black italic tabular-nums leading-none mt-0.5 ${cls}`}
      >
        {value}
      </div>
    </div>
  );
}
