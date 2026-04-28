"use client";

import { useEffect, useState } from "react";
import SideSheet from "./SideSheet";
import { useSession } from "@/hooks/useSession";

type Lobby = {
  id: string;
  creator_wallet: string;
  challenger_wallet: string | null;
  token_symbol: "WLD" | "USDC";
  amount_per_player: number;
  creator_score: number | null;
  challenger_score: number | null;
  winner_wallet: string | null;
  is_tie: boolean;
  status: string;
  fee_percent: number;
  created_at: string;
  updated_at: string;
};

type Detail = {
  lobby: Lobby;
  answers: Array<{
    wallet: string;
    question_index: number;
    question_text: string;
    expected_answer: number;
    drawn_answer: number | null;
    is_correct: boolean;
  }>;
  me: string | null;
};

export default function HistorySheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { wallet } = useSession();
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);

  useEffect(() => {
    if (!open || !wallet) return;
    fetch("/api/lobby/history", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { lobbies?: Lobby[] }) => setLobbies(d.lobbies ?? []))
      .catch(() => {});
  }, [open, wallet]);

  useEffect(() => {
    if (!openId) {
      setDetail(null);
      return;
    }
    fetch(`/api/lobby/${openId}/detail`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setDetail)
      .catch(() => {});
  }, [openId]);

  return (
    <SideSheet open={open} onClose={onClose} title="History">
      <div className="flex flex-col gap-3 pb-4">
        <h2 className="display text-3xl font-black italic tracking-tight px-1">
          Match history
        </h2>

        {lobbies.length === 0 ? (
          <div className="panel text-sm text-stone-500 text-center p-5">
            No matches yet.
          </div>
        ) : (
          <ol className="space-y-2">
            {lobbies.map((l) => {
              const me = wallet?.toLowerCase() ?? "";
              const won = l.winner_wallet?.toLowerCase() === me;
              const lost =
                l.winner_wallet !== null &&
                !won &&
                !l.is_tie &&
                l.status === "resolved";
              const myScore =
                l.creator_wallet.toLowerCase() === me
                  ? l.creator_score
                  : l.challenger_score;
              const oppScore =
                l.creator_wallet.toLowerCase() === me
                  ? l.challenger_score
                  : l.creator_score;
              const oppWallet =
                l.creator_wallet.toLowerCase() === me
                  ? l.challenger_wallet
                  : l.creator_wallet;
              const oppShort = oppWallet
                ? `${oppWallet.slice(0, 6)}…${oppWallet.slice(-4)}`
                : "—";

              let badge = "Open";
              let badgeClass = "bg-stone-100 text-stone-600";
              if (l.status === "resolved") {
                if (l.is_tie) {
                  badge = "Tie";
                  badgeClass = "bg-amber-100 text-amber-800";
                } else if (won) {
                  badge = "Won";
                  badgeClass = "bg-emerald-100 text-emerald-800";
                } else if (lost) {
                  badge = "Lost";
                  badgeClass = "bg-rose-100 text-rose-800";
                } else {
                  badge = "Resolved";
                }
              } else if (l.status === "open") {
                badge = "Live";
                badgeClass = "bg-sky-100 text-sky-800";
              }

              return (
                <li key={l.id}>
                  <button
                    onClick={() => setOpenId(l.id)}
                    className="panel w-full px-3 py-3 flex items-center gap-3 hover:bg-stone-50 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${badgeClass}`}
                        >
                          {badge}
                        </span>
                        <span className="text-xs text-stone-500 tabular-nums">
                          {new Date(l.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="font-mono text-sm text-stone-700 truncate mt-1">
                        vs {oppShort}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="display font-black italic tabular-nums text-base">
                        {myScore ?? "—"}{" "}
                        <span className="text-stone-400 not-italic font-normal">
                          vs
                        </span>{" "}
                        {oppScore ?? "—"}
                      </div>
                      <div className="text-[10px] text-stone-500">
                        {l.amount_per_player} {l.token_symbol}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Match detail bottom sheet */}
      {openId && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setOpenId(null)}
        >
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-white rounded-t-3xl shadow-xl p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1.5 bg-stone-300 rounded-full mx-auto mb-4" />
            {detail ? (
              <DetailContent detail={detail} />
            ) : (
              <div className="text-sm text-stone-500 text-center p-6">
                Loading…
              </div>
            )}
          </div>
        </div>
      )}
    </SideSheet>
  );
}

function DetailContent({ detail }: { detail: Detail }) {
  const lobby = detail.lobby;
  const creatorAnswers = detail.answers.filter(
    (a) => a.wallet.toLowerCase() === lobby.creator_wallet.toLowerCase(),
  );
  const challengerAnswers = detail.answers.filter(
    (a) =>
      lobby.challenger_wallet &&
      a.wallet.toLowerCase() === lobby.challenger_wallet.toLowerCase(),
  );

  const indices = Array.from(
    new Set([
      ...creatorAnswers.map((a) => a.question_index),
      ...challengerAnswers.map((a) => a.question_index),
    ]),
  ).sort((a, b) => a - b);
  const byCreator = new Map(
    creatorAnswers.map((a) => [a.question_index, a]),
  );
  const byChallenger = new Map(
    challengerAnswers.map((a) => [a.question_index, a]),
  );

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 text-center mb-4">
        <ScoreCol
          label="Creator"
          wallet={lobby.creator_wallet}
          score={lobby.creator_score}
          highlight={
            lobby.winner_wallet?.toLowerCase() ===
            lobby.creator_wallet.toLowerCase()
          }
        />
        <ScoreCol
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

      <div className="space-y-1">
        {indices.length === 0 ? (
          <div className="text-sm text-stone-500 text-center p-4">
            No answers recorded yet.
          </div>
        ) : (
          indices.map((idx) => {
            const c = byCreator.get(idx);
            const ch = byChallenger.get(idx);
            const text = (c ?? ch)?.question_text ?? "";
            const expected = (c ?? ch)?.expected_answer ?? "";
            return (
              <div
                key={idx}
                className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-sm py-1"
              >
                <Cell ans={c} />
                <div className="text-center">
                  <div className="font-serif text-stone-800 tabular-nums">
                    {text}
                    <span className="text-stone-400 ml-1">{expected}</span>
                  </div>
                </div>
                <Cell ans={ch} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Cell({
  ans,
}: {
  ans:
    | {
        drawn_answer: number | null;
        is_correct: boolean;
      }
    | undefined;
}) {
  if (!ans)
    return <div className="text-center text-stone-300 tabular-nums">—</div>;
  return (
    <div
      className={`text-center tabular-nums font-bold ${
        ans.is_correct ? "text-emerald-700" : "text-rose-600"
      }`}
    >
      {ans.drawn_answer ?? "?"}
    </div>
  );
}

function ScoreCol({
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
      <div className="display text-3xl font-black italic tabular-nums mt-1">
        {score ?? "—"}
      </div>
    </div>
  );
}
