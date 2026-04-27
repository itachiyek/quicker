"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";

type Lobby = {
  id: string;
  creator_wallet: string;
  token_symbol: "WLD" | "USDC";
  amount_per_player: number;
  creator_score: number | null;
  fee_percent: number;
  created_at: string;
};

const SYMBOL_OPTIONS: ("WLD" | "USDC")[] = ["WLD", "USDC"];
const QUICK_AMOUNTS = [0.5, 1, 2, 5];

export default function BattlesPage() {
  const router = useRouter();
  const { wallet, loading } = useSession();
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [token, setToken] = useState<"WLD" | "USDC">("WLD");
  const [amount, setAmount] = useState<string>("1");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !wallet) router.replace("/login");
  }, [wallet, loading, router]);

  useEffect(() => {
    if (!wallet) return;
    fetch("/api/lobby/list", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { lobbies?: Lobby[] }) => setLobbies(d.lobbies ?? []))
      .catch(() => {});
  }, [wallet]);

  const onCreate = async () => {
    setCreateError(null);
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setCreateError("Enter a positive amount");
      return;
    }
    setCreating(true);
    try {
      const r = await fetch("/api/lobby/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenSymbol: token, amount: amt }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      const d = (await r.json()) as { id: string };
      router.push(`/battles/${d.id}`);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setCreating(false);
    }
  };

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
        <p className="text-stone-600 text-sm mt-2">
          Create a lobby, play your 60s round, then wait for someone to
          challenge your score. Winner takes the pool.
        </p>
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="btn-primary w-full mt-4"
        >
          {showCreate ? "Cancel" : "Create lobby"}
        </button>

        {showCreate && (
          <div className="mt-4 text-left">
            <div className="grid grid-cols-2 gap-2 mb-3">
              {SYMBOL_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setToken(s)}
                  className={`rounded-xl border py-2 font-semibold ${
                    token === s
                      ? "bg-stone-900 text-white border-stone-900"
                      : "bg-white text-stone-700 border-stone-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <label className="text-[10px] uppercase tracking-wider text-stone-500">
              Stake per player
            </label>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value.replace(/[^0-9.]/g, ""))
              }
              className="w-full mt-1 px-4 py-3 rounded-xl border border-stone-300 bg-white text-2xl font-serif tabular-nums"
            />
            <div className="grid grid-cols-4 gap-2 mt-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAmount(String(a))}
                  className="chip !text-sm"
                >
                  {a}
                </button>
              ))}
            </div>
            <button
              onClick={onCreate}
              disabled={creating}
              className="btn-primary w-full mt-4"
            >
              {creating ? "Creating…" : `Create ${amount} ${token} lobby`}
            </button>
            {createError && (
              <p className="mt-2 text-xs text-rose-700 text-center">
                {createError}
              </p>
            )}
          </div>
        )}
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
    </main>
  );
}
