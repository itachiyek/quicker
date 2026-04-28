"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/hooks/useSession";
import CreateLobbySheet from "./CreateLobbySheet";

type Lobby = {
  id: string;
  creator_wallet: string;
  token_symbol: "WLD" | "USDC";
  amount_per_player: number;
  creator_score: number | null;
  created_at: string;
};

export default function PvpSheet() {
  const { wallet } = useSession();
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetch("/api/lobby/list", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { lobbies?: Lobby[] }) => setLobbies(d.lobbies ?? []))
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <section className="card-glass w-full p-5 text-center">
        <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
          PvP Battle
        </div>
        <h2 className="font-serif text-3xl font-extrabold italic tracking-tight mt-1">
          Stake. Solve. Win.
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary w-full mt-4"
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
          <Link
            href="/history"
            className="hover:text-stone-900 underline-offset-2 hover:underline"
          >
            Match history
          </Link>
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
                      <div className="font-serif font-bold tabular-nums text-lg">
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

      {showRules && <RulesSheet onClose={() => setShowRules(false)} />}
      {showCreate && (
        <CreateLobbySheet onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

function RulesSheet({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl shadow-xl p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 bg-stone-300 rounded-full mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-extrabold italic tracking-tight">
          PvP Rules
        </h2>
        <ol className="mt-4 space-y-3 text-sm text-stone-700">
          <RuleItem
            n={1}
            title="Create a lobby"
            body="Pick WLD or USDC and your stake (min 0.05). Stake is taken from your wallet on confirm."
          />
          <RuleItem
            n={2}
            title="Play your round"
            body="60 seconds, score as many correct answers as possible. Your score is locked in."
          />
          <RuleItem
            n={3}
            title="Wait for a challenger"
            body="Anyone can pick up your lobby and try to beat you. They stake the same amount in the same token."
          />
          <RuleItem
            n={4}
            title="Higher score wins"
            body="Once the challenger finishes, the winner is decided automatically. Tied scores split the pool."
          />
          <RuleItem
            n={5}
            title="Claim your winnings"
            body="Winner takes the full pool minus the platform fee. Claim from the lobby or match history page."
          />
        </ol>
        <div className="mt-5 pt-4 border-t border-stone-200 text-xs text-stone-500 leading-relaxed">
          <p>
            <span className="font-semibold text-stone-700">Fee:</span> 10% of
            each deposit goes to the platform immediately. The rest stays in
            escrow until the lobby resolves.
          </p>
          <p className="mt-2">
            <span className="font-semibold text-stone-700">Both players</span>{" "}
            face the exact same equations in the same order.
          </p>
        </div>
        <button onClick={onClose} className="btn-primary w-full mt-5">
          Got it
        </button>
      </div>
    </div>
  );
}

function RuleItem({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-7 h-7 rounded-full bg-stone-900 text-white text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <div>
        <div className="font-semibold text-stone-900">{title}</div>
        <div className="text-stone-600 text-[13px] leading-snug">{body}</div>
      </div>
    </li>
  );
}
