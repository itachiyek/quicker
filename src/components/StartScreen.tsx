"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadModel } from "@/lib/recognizer";
import { playStart, unlockAudio } from "@/lib/sounds";
import WalletBar from "./WalletBar";
import Leaderboard from "./Leaderboard";
import BuyPanel from "./BuyRoundButton";
import ContestCard from "./ContestCard";
import { useSession } from "@/hooks/useSession";
import { usePlayStatus } from "@/hooks/usePlayStatus";

type Stats = {
  best_score: number;
  games_played: number;
  rank: number | null;
};

type Entry = {
  wallet: string;
  best_score: number;
  games_played: number;
};

type Lobby = {
  id: string;
  creator_wallet: string;
  token_symbol: "WLD" | "USDC";
  amount_per_player: number;
  creator_score: number | null;
  created_at: string;
};

function useStats(wallet: string | null): Stats | null {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    if (!wallet) return;
    let cancelled = false;
    fetch("/api/leaderboard", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { entries?: Entry[] }) => {
        if (cancelled) return;
        const entries = d.entries ?? [];
        const idx = entries.findIndex(
          (e) => e.wallet.toLowerCase() === wallet.toLowerCase(),
        );
        if (idx === -1) {
          setStats({ best_score: 0, games_played: 0, rank: null });
        } else {
          const me = entries[idx];
          setStats({
            best_score: me.best_score,
            games_played: me.games_played,
            rank: idx + 1,
          });
        }
      })
      .catch(() => !cancelled && setStats(null));
    return () => {
      cancelled = true;
    };
  }, [wallet]);
  return stats;
}

function useOpenLobbies(enabled: boolean) {
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  useEffect(() => {
    if (!enabled) return;
    fetch("/api/lobby/list", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { lobbies?: Lobby[] }) => setLobbies(d.lobbies ?? []))
      .catch(() => {});
  }, [enabled]);
  return lobbies;
}

type Mode = "solo" | "pvp";

export default function StartScreen({ onStart }: { onStart: () => void }) {
  const [mode, setMode] = useState<Mode>("solo");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [startError, setStartError] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const { wallet } = useSession();
  const stats = useStats(wallet);
  const { status, refresh: refreshStatus } = usePlayStatus(!!wallet);
  const openLobbies = useOpenLobbies(mode === "pvp");

  useEffect(() => {
    loadModel((_m, p) => typeof p === "number" && setProgress(p)).catch(
      () => {},
    );
  }, []);

  const handleStart = async () => {
    if (!wallet) return;
    setStartError(null);
    unlockAudio();
    setLoading(true);
    try {
      const res = await fetch("/api/play/start", { method: "POST" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setStartError(data.error ?? "Unable to start");
        await refreshStatus();
        return;
      }
      await loadModel((_m, p) => typeof p === "number" && setProgress(p));
      playStart();
      onStart();
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "Unable to start");
    } finally {
      setLoading(false);
    }
  };

  const cooldown = (() => {
    if (!status?.nextFreeAt) return null;
    const ms = new Date(status.nextFreeAt).getTime() - Date.now();
    if (ms <= 0) return null;
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  })();

  return (
    <div className="flex-1 flex flex-col items-center max-w-md w-full mx-auto px-4 pt-5 pb-10 gap-4">
      <header className="w-full flex items-center justify-between">
        <div className="text-xl font-serif italic font-extrabold tracking-tight">
          Quicker
        </div>
        <WalletBar compact />
      </header>

      {wallet && stats && (
        <section className="card-glass w-full p-3 grid grid-cols-3 divide-x divide-stone-200/80 text-center">
          <Mini label="Best" value={stats.best_score} />
          <Mini label="Games" value={stats.games_played} />
          <Mini
            label="Rank"
            value={stats.rank ? `#${stats.rank}` : "—"}
          />
        </section>
      )}

      {/* Mode picker */}
      <div className="card-glass w-full p-1 grid grid-cols-2 gap-1">
        <ModeTab
          active={mode === "solo"}
          onClick={() => setMode("solo")}
          icon="🎯"
          label="Solo"
        />
        <ModeTab
          active={mode === "pvp"}
          onClick={() => setMode("pvp")}
          icon="⚔"
          label="PvP"
        />
      </div>

      {mode === "solo" ? (
        <>
          {/* Play card */}
          <section className="card-glass w-full p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="chip">60s drill</span>
              {status && (
                <div className="flex items-center gap-2 text-xs tabular-nums">
                  <span className="chip">
                    {status.freeRemaining}/{status.freeCap} free
                  </span>
                  <span
                    className={`chip ${
                      status.paidCredits > 0
                        ? "!text-amber-700 !border-amber-300 !bg-amber-50"
                        : ""
                    }`}
                  >
                    {status.paidCredits} credits
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={handleStart}
              disabled={loading || !wallet || status?.canPlay === false}
              className="btn-primary w-full text-base"
            >
              {loading ? "Loading…" : "Start"}
              {!loading && <span aria-hidden className="opacity-70">→</span>}
            </button>

            {cooldown && status?.canPlay === false && (
              <p className="text-[11px] text-stone-500 text-center -mt-2">
                Next free in {cooldown}
              </p>
            )}
            {startError && (
              <p className="text-xs text-rose-700 text-center -mt-2">
                {startError}
              </p>
            )}
            {progress > 0 && progress < 1 && (
              <div className="h-1 bg-stone-200 rounded-full overflow-hidden -mt-2">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
            )}

            {status && (
              <div className="pt-3 border-t border-stone-200/70">
                <BuyPanel status={status} onPurchased={refreshStatus} />
              </div>
            )}
          </section>

          <ContestCard />

          <section className="w-full">
            <div className="flex items-baseline justify-between px-1 mb-2">
              <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                All-time leaderboard
              </h3>
              <span className="text-xs text-stone-500">Top 10</span>
            </div>
            <Leaderboard highlightWallet={wallet} />
            <p className="mt-3 text-[11px] text-stone-500 text-center">
              Best single-game score · all time
            </p>
          </section>
        </>
      ) : (
        <>
          {/* PvP intro card */}
          <section className="card-glass w-full p-5 text-center">
            <div className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
              PvP Battle
            </div>
            <h2 className="font-serif text-2xl font-extrabold italic tracking-tight mt-1">
              Stake. Solve. Win.
            </h2>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <Link href="/battles" className="btn-primary">
                Create lobby
              </Link>
              <Link
                href="/battles"
                className="rounded-xl border border-stone-300 bg-white py-3 px-4 font-semibold text-stone-900 hover:bg-stone-50"
              >
                Browse
              </Link>
            </div>
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

          {/* Open lobbies preview */}
          <section className="w-full">
            <div className="flex items-baseline justify-between px-1 mb-2">
              <h3 className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                Open lobbies
              </h3>
              <span className="text-xs text-stone-500">{openLobbies.length}</span>
            </div>
            {openLobbies.length === 0 ? (
              <div className="panel text-sm text-stone-500 text-center p-5">
                No open lobbies. Be the first.
              </div>
            ) : (
              <ol className="panel divide-y divide-stone-200 overflow-hidden">
                {openLobbies.slice(0, 5).map((l) => {
                  const short = `${l.creator_wallet.slice(0, 6)}…${l.creator_wallet.slice(-4)}`;
                  const me =
                    l.creator_wallet.toLowerCase() === wallet?.toLowerCase();
                  return (
                    <li key={l.id}>
                      <Link
                        href={`/battles/${l.id}`}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-stone-50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm text-stone-800 truncate">
                            {me ? "you" : short}
                          </div>
                          <div className="text-[10px] text-stone-500">
                            beat{" "}
                            <span className="font-bold tabular-nums">
                              {l.creator_score ?? "?"}
                            </span>
                          </div>
                        </div>
                        <div className="font-serif font-bold tabular-nums text-base">
                          {l.amount_per_player} {l.token_symbol}
                        </div>
                      </Link>
                    </li>
                  );
                })}
                {openLobbies.length > 5 && (
                  <li>
                    <Link
                      href="/battles"
                      className="block text-center text-xs text-stone-500 py-2 hover:text-stone-900"
                    >
                      See all {openLobbies.length} →
                    </Link>
                  </li>
                )}
              </ol>
            )}
          </section>
        </>
      )}

      {showRules && <RulesSheet onClose={() => setShowRules(false)} />}
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
        <button
          onClick={onClose}
          className="btn-primary w-full mt-5"
        >
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

function Mini({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-stone-500">
        {label}
      </div>
      <div className="text-xl font-serif font-bold tabular-nums leading-none mt-0.5">
        {value}
      </div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all ${
        active
          ? "bg-stone-900 text-white shadow-sm"
          : "text-stone-600 hover:text-stone-900"
      }`}
    >
      <span className={active ? "text-amber-200" : ""} aria-hidden>
        {icon}
      </span>
      {label}
    </button>
  );
}
