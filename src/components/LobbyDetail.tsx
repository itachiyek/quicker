"use client";

import { useCallback, useEffect, useState } from "react";
import { parseUnits } from "viem";
import BattleGameScreen, {
  type BattleAnswer,
} from "@/components/BattleGameScreen";
import {
  sendErc20Transfer,
  claimFromEscrow,
  isInWorldApp,
} from "@/lib/worldDeposit";
import { useSession } from "@/hooks/useSession";

export type Lobby = {
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

export default function LobbyDetail({ id }: { id: string }) {
  const { wallet } = useSession();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [escrow, setEscrow] = useState<string | null>(null);
  const [phase, setPhase] = useState<"setup" | "playing">("setup");

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

  useEffect(() => {
    fetch("/api/lobby/escrow", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { escrow?: string } | null) => setEscrow(d?.escrow ?? null))
      .catch(() => {});
  }, []);

  if (!lobby) {
    return (
      <div className="flex flex-col gap-4">
        <div className="card-glass w-full p-5 text-center">
          <div className="h-3 w-20 mx-auto rounded-full bg-stone-200 animate-pulse" />
          <div className="h-10 w-40 mx-auto rounded-md bg-stone-200 animate-pulse mt-3" />
          <div className="h-3 w-48 mx-auto rounded-full bg-stone-200 animate-pulse mt-3" />
        </div>
        <div className="card-glass w-full p-5">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl bg-stone-100 h-24 animate-pulse" />
            <div className="rounded-xl bg-stone-100 h-24 animate-pulse" />
          </div>
          <div className="h-12 w-full rounded-xl bg-stone-200 animate-pulse" />
        </div>
        <p className="text-[11px] text-stone-400 text-center">
          Loading lobby…
        </p>
      </div>
    );
  }

  const me = (wallet ?? "").toLowerCase();
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

  if (phase === "playing") {
    return (
      <BattleGameScreen
        equations={lobby.equations_json}
        onFinish={onFinish}
      />
    );
  }

  const myScore = isCreator ? lobby.creator_score : lobby.challenger_score;
  const shouldPlay =
    (isCreator && lobby.status === "creator_playing" && myScore === null) ||
    (isChallenger &&
      lobby.status === "challenger_playing" &&
      myScore === null);
  if (shouldPlay && phase === "setup") {
    setTimeout(() => setPhase("playing"), 0);
  }

  // Hide the creator's score from the challenger until the challenger has
  // played (server already scrubs creator_score in that case, but we add a
  // belt-and-braces check on the client too).
  const challengerFinished = lobby.challenger_score !== null;
  const isResolved = lobby.status === "resolved";
  const showCreatorScore =
    isCreator || challengerFinished || isResolved;
  const visibleCreatorScore = showCreatorScore ? lobby.creator_score : null;

  return (
    <div className="flex flex-col gap-4">
      <section className="card-glass w-full p-5 text-center">
        <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
          Pool
        </div>
        <div className="display text-4xl font-black italic tabular-nums my-1">
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
            score={visibleCreatorScore}
            hidden={!showCreatorScore}
            highlight={
              lobby.winner_wallet?.toLowerCase() ===
              lobby.creator_wallet.toLowerCase()
            }
          />
          <Side
            label="Challenger"
            wallet={lobby.challenger_wallet}
            score={lobby.challenger_score}
            hidden={false}
            highlight={
              lobby.winner_wallet !== null &&
              lobby.winner_wallet?.toLowerCase() ===
                lobby.challenger_wallet?.toLowerCase()
            }
          />
        </div>

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
            Your score:{" "}
            <span className="font-bold">{lobby.creator_score}</span>. Waiting
            for a challenger…
          </p>
        )}

        {lobby.status === "resolving" && (
          <p className="text-center text-sm text-stone-600">
            Resolving on chain…
          </p>
        )}

        {lobby.status === "resolved" && (
          <ResolvedView
            lobby={lobby}
            me={me}
            escrow={escrow}
            winnerShare={winnerShare}
          />
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
    </div>
  );
}

function ResolvedView({
  lobby,
  me,
  escrow,
  winnerShare,
}: {
  lobby: Lobby;
  me: string;
  escrow: string | null;
  winnerShare: number;
}) {
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const isWinner = lobby.winner_wallet?.toLowerCase() === me;
  const isTie = lobby.is_tie;
  const myShare = isTie ? winnerShare / 2 : isWinner ? winnerShare : 0;
  const canClaim = (isWinner || isTie) && myShare > 0;

  const onClaim = async () => {
    setClaimError(null);
    if (!escrow) {
      setClaimError("Escrow not configured");
      return;
    }
    setClaiming(true);
    const r = await claimFromEscrow({
      escrow: escrow as `0x${string}`,
      token: lobby.token_address as `0x${string}`,
    });
    if (!r.ok) setClaimError(r.reason);
    else setClaimed(true);
    setClaiming(false);
  };

  return (
    <div className="text-center">
      {isTie ? (
        <div className="text-amber-700 font-semibold">
          Tie — pool split, you get {myShare.toFixed(2)} {lobby.token_symbol}
        </div>
      ) : isWinner ? (
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

      {canClaim && (
        <>
          <button
            onClick={onClaim}
            disabled={claiming || claimed}
            className="btn-primary w-full mt-4"
          >
            {claimed
              ? "Claimed ✓"
              : claiming
                ? "Confirm in World App…"
                : `Claim ${myShare.toFixed(2)} ${lobby.token_symbol}`}
          </button>
          {!claimed && (
            <p className="mt-2 text-[11px] text-stone-500">
              Sweeps your full {lobby.token_symbol} balance on the escrow.
            </p>
          )}
          {claimError && (
            <p className="mt-2 text-xs text-rose-700 break-words">
              {claimError}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Side({
  label,
  wallet,
  score,
  hidden,
  highlight,
}: {
  label: string;
  wallet: string | null;
  score: number | null;
  hidden: boolean;
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
      <div className="display text-3xl font-black italic tabular-nums mt-1">
        {hidden ? (
          <span className="text-stone-400">?</span>
        ) : (
          (score ?? "—")
        )}
      </div>
      {hidden && (
        <div className="text-[10px] text-stone-500 mt-0.5">
          revealed after you play
        </div>
      )}
    </div>
  );
}
