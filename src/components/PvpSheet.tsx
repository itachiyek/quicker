"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/hooks/useSession";
import CreateLobbySheet from "./CreateLobbySheet";
import RulesSheet from "./RulesSheet";
import HistorySheet from "./HistorySheet";
import LobbySheet from "./LobbySheet";
import SortSheet, { SortIcon, type SortValue } from "./SortSheet";

type Lobby = {
  id: string;
  creator_wallet: string;
  token_symbol: "WLD" | "USDC";
  amount_per_player: number;
  created_at: string;
};

type ListResp = {
  lobbies: Lobby[];
  total: number;
  hasMore: boolean;
  pageSize: number;
};

type PvpStats = {
  played: number;
  won: number;
  lost: number;
  tied: number;
  open: number;
};

type TokenFilter = "all" | "WLD" | "USDC";

const SORT_LABEL: Record<SortValue, string> = {
  newest: "Newest",
  stake_desc: "Highest stake",
  stake_asc: "Lowest stake",
};

export default function PvpSheet() {
  const { wallet } = useSession();
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenFilter, setTokenFilter] = useState<TokenFilter>("all");
  const [sort, setSort] = useState<SortValue>("newest");
  const [stats, setStats] = useState<PvpStats | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [openLobbyId, setOpenLobbyId] = useState<string | null>(null);

  const requestId = useRef(0);

  const fetchLobbies = useCallback(
    async (offset: number, reset: boolean) => {
      const id = ++requestId.current;
      setLoading(true);
      const params = new URLSearchParams();
      params.set("offset", String(offset));
      if (tokenFilter !== "all") params.set("token", tokenFilter);
      params.set("sort", sort);
      try {
        const r = await fetch(`/api/lobby/list?${params}`, {
          cache: "no-store",
        });
        if (id !== requestId.current) return; // stale
        const d = (await r.json()) as ListResp;
        setLobbies((prev) => (reset ? d.lobbies : [...prev, ...d.lobbies]));
        setTotal(d.total ?? 0);
        setHasMore(!!d.hasMore);
      } catch {
        if (id === requestId.current) {
          setHasMore(false);
        }
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [tokenFilter, sort],
  );

  // Initial + filter/sort change resets the list and refetches.
  useEffect(() => {
    fetchLobbies(0, true);
  }, [fetchLobbies]);

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
          <span className="text-xs text-stone-500 tabular-nums">
            {lobbies.length}
            {total > lobbies.length ? ` of ${total}` : ""}
          </span>
        </div>

        {/* Filter + sort */}
        <div className="flex items-center gap-2 mb-2">
          <FilterChip
            active={tokenFilter === "all"}
            onClick={() => setTokenFilter("all")}
          >
            All
          </FilterChip>
          <FilterChip
            active={tokenFilter === "WLD"}
            onClick={() => setTokenFilter("WLD")}
          >
            WLD
          </FilterChip>
          <FilterChip
            active={tokenFilter === "USDC"}
            onClick={() => setTokenFilter("USDC")}
          >
            USDC
          </FilterChip>
          <button
            onClick={() => setShowSort(true)}
            className="ml-auto chip !text-xs inline-flex items-center gap-1.5"
            aria-label="Sort options"
          >
            <SortIcon size={12} />
            {SORT_LABEL[sort]}
          </button>
        </div>

        {lobbies.length === 0 ? (
          <div className="panel text-sm text-stone-500 text-center p-5">
            {loading ? "Loading…" : "No open lobbies. Be the first."}
          </div>
        ) : (
          <>
            <ol className="panel divide-y divide-stone-200 overflow-hidden">
              {lobbies.map((l) => {
                const short = `${l.creator_wallet.slice(0, 6)}…${l.creator_wallet.slice(-4)}`;
                const me =
                  l.creator_wallet.toLowerCase() === wallet?.toLowerCase();
                return (
                  <li key={l.id}>
                    <button
                      onClick={() => setOpenLobbyId(l.id)}
                      className="w-full flex items-center gap-3 px-3 py-3 hover:bg-stone-50 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-sm text-stone-800 truncate">
                          {me ? "you" : short}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {me
                            ? "Your lobby — waiting"
                            : "Beat the creator's score"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="display font-black italic tabular-nums text-lg">
                          {l.amount_per_player} {l.token_symbol}
                        </div>
                        <div className="text-[10px] text-stone-500">
                          per player
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
            {hasMore && (
              <button
                onClick={() => fetchLobbies(lobbies.length, false)}
                disabled={loading}
                className="mt-3 w-full rounded-xl border border-stone-300 bg-white py-3 px-4 font-semibold text-stone-900 hover:bg-stone-50 disabled:opacity-50"
              >
                {loading ? "Loading…" : "See more"}
              </button>
            )}
          </>
        )}
      </section>

      <RulesSheet open={showRules} onClose={() => setShowRules(false)} />
      <HistorySheet open={showHistory} onClose={() => setShowHistory(false)} />
      <LobbySheet
        open={openLobbyId !== null}
        lobbyId={openLobbyId}
        onClose={() => {
          setOpenLobbyId(null);
          // refresh the list when coming back so any newly-resolved lobby
          // disappears from "open"
          fetchLobbies(0, true);
        }}
      />
      <SortSheet
        open={showSort}
        value={sort}
        onPick={setSort}
        onClose={() => setShowSort(false)}
      />
      {showCreate && (
        <CreateLobbySheet onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
        active
          ? "bg-stone-900 text-white"
          : "bg-white text-stone-600 border border-stone-300 hover:bg-stone-50"
      }`}
    >
      {children}
    </button>
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
