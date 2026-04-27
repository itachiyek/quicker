"use client";

import { useCallback, useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseUnits } from "viem";
import BattleGameScreen, {
  type BattleAnswer,
} from "@/components/BattleGameScreen";
import { sendErc20Transfer, isInWorldApp } from "@/lib/worldDeposit";
import { useSession } from "@/hooks/useSession";

type Lobby = {
  id: string;
  on_chain_lobby_id: string;
  creator_wallet: string;
  challenger_wallet: string | null;
  token_symbol: "WLD" | "USDC";
  token_address: string;
  amount_per_player: number;
  fee_percent: number;
  status:
    | "awaiting_creator_deposit"
    | "creator_playing"
    | "open"
    | "challenger_playing"
    | "resolving"
    | "resolved"
    | "cancelled";
  creator_score: number | null;
  challenger_score: number | null;
  winner_wallet: string | null;
  is_tie: boolean;
  equations_json: Array<{ id: number; text: string; answer: number }>;
};

function decimalsFor(sym: "WLD" | "USDC") {
  return sym === "WLD" ? 18 : 6;
}

export default function LobbyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { wallet, loading } = useSession();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [escrow, setEscrow] = useState<string | null>(null);
  const [phase, setPhase] = useState<"setup" | "playing">("setup");

  useEffect(() => {
    if (!loading && !wallet) router.replace("/login");
  }, [wallet, loading, router]);

  const refresh = useCallback(async () => {
    const r = await fetch(`/api/lobby/${id}`, { cache: "no-store" });
    if (r.ok) {
      const d = (await r.json()) as { lobby: Lobby };
      setLobby(d.lobby);
    }
  }, [id]);

  useEffect(() => {
    if (!wallet) return;
    refresh();
  }, [wallet, refresh]);

  // Pull escrow address from create response surrogate (we re-call create's
  // shape via the lobby record + an env-derived helper isn't exposed). Instead
  // call /api/lobby/create-info (TODO) — for now read from create response on
  // page load via a separate call: just re-use ESCROW from a status helper.
  // We expose it through a small helper endpoint:
  useEffect(() => {
    fetch("/api/lobby/escrow", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { escrow?: string } | null) => setEscrow(d?.escrow ?? null))
      .catch(() => {});
  }, []);

  if (loading || !wallet) return <main className="flex-1" />;

  if (!lobby) {
    return (
      <main className="flex-1 flex items-center justify-center text-sm text-stone-500">
        Loading lobby…
      </main>
    );
  }

  const me = wallet.toLowerCase();
  const isCreator = lobby.creator_wallet.toLowerCase() === me;
  const isChallenger =
    !isCreator &&
    (lobby.challenger_wallet?.toLowerCase() === me ||
      lobby.status === "open");
  const totalPool = lobby.amount_per_player * 2;
  const winnerShare = totalPool * (1 - lobby.fee_percent / 100);

  const deposit = async () => {
    setError(null);
    if (!escrow) {
      setError("Escrow not configured yet");
      return;
    }
    setBusy("deposit");
    const amountUnits = parseUnits(
      String(lobby.amount_per_player),
      decimalsFor(lobby.token_symbol),
    );
    const res = await sendErc20Transfer({
      token: lobby.token_address as `0x${string}`,
      to: escrow as `0x${string}`,
      amountUnits,
    });
    if (!res.ok) {
      setError(res.reason);
      setBusy(null);
      return;
    }
    setBusy("confirm");
    try {
      const r = await fetch(`/api/lobby/${id}/confirm-deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: res.txHash }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      await refresh();
      setPhase("playing");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirm failed");
    } finally {
      setBusy(null);
    }
  };

  const onFinish = async (r: {
    score: number;
    answers: BattleAnswer[];
  }) => {
    setBusy("finishing");
    try {
      const resp = await fetch(`/api/lobby/${id}/finish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: r.score, answers: r.answers }),
      });
      if (!resp.ok) {
        const d = await resp.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${resp.status}`);
      }
      await refresh();
      setPhase("setup");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(null);
    }
  };

  // Active play screen
  if (phase === "playing") {
    return (
      <BattleGameScreen
        equations={lobby.equations_json}
        onFinish={onFinish}
      />
    );
  }

  // Auto-enter playing when status is "creator_playing" or "challenger_playing"
  // and no score yet for me
  const myScore = isCreator ? lobby.creator_score : lobby.challenger_score;
  const shouldPlay =
    (isCreator && lobby.status === "creator_playing" && myScore === null) ||
    (isChallenger &&
      lobby.status === "challenger_playing" &&
      myScore === null);
  if (shouldPlay && phase === "setup") {
    setTimeout(() => setPhase("playing"), 0);
  }

  // -- Status views --

  return (
    <main className="flex-1 flex flex-col items-center max-w-md w-full mx-auto px-4 pt-5 pb-10 gap-4">
      <header className="w-full flex items-center justify-between">
        <Link href="/battles" className="text-sm text-stone-600 hover:text-stone-900">
          ← Battles
        </Link>
        <span className="text-sm font-serif italic font-extrabold tracking-tight">
          Quicker
        </span>
        <span className="w-12" />
      </header>

      <section className="card-glass w-full p-5 text-center">
        <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
          Pool
        </div>
        <div className="font-serif text-4xl font-extrabold italic tabular-nums my-1">
          {totalPool} {lobby.token_symbol}
        </div>
        <div className="text-xs text-stone-500">
          Winner takes {winnerShare.toFixed(2)} {lobby.token_symbol} ·{" "}
          {lobby.fee_percent}% fee
        </div>
      </section>

      <section className="card-glass w-full p-5">
        <div className="grid grid-cols-2 gap-3 text-center mb-4">
          <Side
            label="Creator"
            wallet={lobby.creator_wallet}
            score={lobby.creator_score}
            highlight={
              lobby.winner_wallet?.toLowerCase() ===
              lobby.creator_wallet.toLowerCase()
            }
          />
          <Side
            label="Challenger"
            wallet={lobby.challenger_wallet}
            score={lobby.challenger_score}
            highlight={
              lobby.winner_wallet !== null &&
              lobby.winner_wallet?.toLowerCase() ===
                lobby.challenger_wallet?.toLowerCase()
            }
          />
        </div>

        {/* Per-state CTA */}
        {lobby.status === "awaiting_creator_deposit" && isCreator && (
          <button
            onClick={deposit}
            disabled={!!busy || !escrow}
            className="btn-primary w-full"
          >
            {busy === "deposit"
              ? "Confirm in World App…"
              : busy === "confirm"
                ? "Verifying…"
                : `Stake ${lobby.amount_per_player} ${lobby.token_symbol}`}
          </button>
        )}

        {lobby.status === "open" && !isCreator && (
          <button
            onClick={deposit}
            disabled={!!busy || !escrow}
            className="btn-primary w-full"
          >
            {busy === "deposit"
              ? "Confirm in World App…"
              : busy === "confirm"
                ? "Verifying…"
                : `Challenge for ${lobby.amount_per_player} ${lobby.token_symbol}`}
          </button>
        )}

        {lobby.status === "open" && isCreator && (
          <p className="text-center text-sm text-stone-600">
            Your score: <span className="font-bold">{lobby.creator_score}</span>
            . Waiting for a challenger…
          </p>
        )}

        {lobby.status === "resolving" && (
          <p className="text-center text-sm text-stone-600">Resolving on chain…</p>
        )}

        {lobby.status === "resolved" && (
          <div className="text-center">
            {lobby.is_tie ? (
              <div className="text-amber-700 font-semibold">
                Tie — pool split
              </div>
            ) : lobby.winner_wallet?.toLowerCase() === me ? (
              <div className="text-emerald-700 font-bold text-lg">
                You won {winnerShare.toFixed(2)} {lobby.token_symbol}
              </div>
            ) : (
              <div className="text-stone-600">
                {lobby.winner_wallet
                  ? `${lobby.winner_wallet.slice(0, 6)}…${lobby.winner_wallet.slice(-4)} won`
                  : "Resolved"}
              </div>
            )}
            <Link
              href="/history"
              className="block mt-3 text-xs text-stone-500 hover:text-stone-900"
            >
              View match history →
            </Link>
          </div>
        )}

        {!isInWorldApp() &&
          (lobby.status === "awaiting_creator_deposit" ||
            lobby.status === "open") && (
            <p className="mt-3 text-[11px] text-stone-500 text-center">
              Open inside World App to deposit.
            </p>
          )}

        {error && (
          <p className="mt-3 text-xs text-rose-700 text-center break-words">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}

function Side({
  label,
  wallet,
  score,
  highlight,
}: {
  label: string;
  wallet: string | null;
  score: number | null;
  highlight: boolean;
}) {
  const short = wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "—";
  return (
    <div
      className={`rounded-xl p-3 ${
        highlight ? "bg-emerald-50 border border-emerald-200" : "bg-stone-50"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-stone-500">
        {label}
      </div>
      <div className="font-mono text-xs text-stone-700 truncate mt-1">
        {short}
      </div>
      <div className="font-serif text-3xl font-bold tabular-nums mt-1">
        {score ?? "—"}
      </div>
    </div>
  );
}
