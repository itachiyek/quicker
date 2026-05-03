"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import CreateLobbySheet from "@/components/CreateLobbySheet";

type Lobby = {
  id: string;
  creator_wallet: string;
  token_symbol: "WLD" | "USDC";
  amount_per_player: number;
  creator_score: number | null;
  fee_percent: number;
  created_at: string;
};

export default function BattlesPage() {
  const router = useRouter();
  const { wallet, loading } = useSession();
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!loading && !wallet) router.replace("/login");
  }, [wallet, loading, router]);

  useEffect(() => {
    if (!wallet) return;
    // Honour the route's 30s public cache so navigating in/out doesn't
    // refetch every time.
    fetch("/api/lobby/list")
      .then((r) => r.json())
      .then((d: { lobbies?: Lobby[] }) => setLobbies(d.lobbies ?? []))
      .catch(() => {});
  }, [wallet]);

  return (
    <main className="flex-1 flex flex-col items-center max-w-md w-full mx-auto px-4 pt-5 pb-10 gap-4">
      <header className="w-full flex items-center justify-between">
        <Link href="/" className="text-sm text-stone-600 hover:text-stone-900">
          ← Back
        </Link>
        <span className="text-sm font-serif italic font-extrabold tracking-tight">
          Quicker
        </span>
        <Link href="/history" className="text-sm text-stone-600 hover:text-stone-900">
          History
        </Link>
      </header>

      <section className="card-glass w-full p-5 text-center">
        <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
          PvP Battle
        </div>
        <h1 className="font-serif text-3xl font-extrabold italic tracking-tight mt-1">
          Stake. Solve. Win.
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary w-full mt-4"
        >
          Create lobby
        </button>
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
                      <div className="text-[10px] text-stone-500">
                        per player
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {showCreate && <CreateLobbySheet onClose={() => setShowCreate(false)} />}
    </main>
  );
}
