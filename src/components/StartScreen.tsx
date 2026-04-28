"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import WalletBar from "./WalletBar";
import SideSheet from "./SideSheet";
import SoloSheet from "./SoloSheet";
import PvpSheet from "./PvpSheet";

type ContestResp = {
  contest: {
    name: string;
    ends_at: string;
    ended: boolean;
  } | null;
  pool_wld: number;
};

function useContest() {
  const [data, setData] = useState<ContestResp | null>(null);
  useEffect(() => {
    fetch("/api/contest/weekly", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);
  return data;
}

type Mode = null | "solo" | "pvp";

export default function StartScreen({ onStart }: { onStart: () => void }) {
  const [mode, setMode] = useState<Mode>(null);
  const contest = useContest();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Allow other pages to deep-link back into a specific sheet via ?mode=pvp
  // (e.g. the lobby detail page's "Back to PvP" button).
  useEffect(() => {
    const m = searchParams.get("mode");
    if (m === "pvp" || m === "solo") {
      setMode(m);
      // Drop the query param so refresh doesn't re-open it.
      router.replace("/", { scroll: false });
    }
  }, [searchParams, router]);

  const open = (m: "solo" | "pvp") => setMode(m);
  const close = () => setMode(null);

  const contestEnded = contest?.contest?.ended === true;
  const contestRemaining = (() => {
    if (!contest?.contest || contestEnded) return null;
    const ms = new Date(contest.contest.ends_at).getTime() - Date.now();
    if (ms <= 0) return null;
    const d = Math.floor(ms / 86_400_000);
    const h = Math.floor((ms % 86_400_000) / 3_600_000);
    if (d > 0) return `${d}d ${h}h`;
    const m = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  })();

  return (
    <>
      <div className="flex-1 flex flex-col items-center max-w-md w-full mx-auto px-5 pt-6 pb-10">
        <header className="w-full flex items-center justify-between mb-10">
          <div className="display text-2xl font-extrabold italic">Quicker</div>
          <WalletBar compact />
        </header>

        {/* Hero */}
        <div className="w-full text-center mb-7">
          <p className="text-[11px] uppercase tracking-[0.25em] text-stone-500">
            Mental math · 60s
          </p>
          <h1 className="display text-5xl sm:text-6xl font-black italic mt-2 leading-[0.95]">
            Pick your<br/>poison.
          </h1>
        </div>

        {/* Big mode picker */}
        <div className="grid grid-cols-1 gap-4 w-full">
          <ModeCard
            icon="🎯"
            title="Solo"
            tagline="Drill · Leaderboard"
            tint="from-amber-100/70 to-amber-50/40"
            onClick={() => open("solo")}
          />
          <ModeCard
            icon="⚔"
            title="PvP"
            tagline="Stake · Winner takes all"
            tint="from-rose-100/70 to-rose-50/40"
            onClick={() => open("pvp")}
          />
        </div>

        {/* Weekly contest hint */}
        <Link
          href="/contest"
          className="card-glass w-full p-3 mt-4 flex items-center gap-3 hover:bg-white/85 transition-colors"
        >
          <span className="w-9 h-9 rounded-xl bg-stone-900 text-amber-200 flex items-center justify-center text-base shrink-0">
            🏆
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-stone-500">
              {contest?.contest?.name ?? "Weekly Contest"}
            </div>
            <div className="text-xs text-stone-700 leading-snug">
              Top 10 split{" "}
              <span className="display font-extrabold italic tabular-nums">
                {contest?.pool_wld ?? 200} WLD
              </span>
              {contestRemaining && (
                <span className="text-stone-500"> · {contestRemaining} left</span>
              )}
              {contestEnded && (
                <span className="text-stone-500"> · ended</span>
              )}
            </div>
          </div>
          <span className="text-stone-400 text-lg shrink-0" aria-hidden>
            →
          </span>
        </Link>
      </div>

      <SideSheet open={mode === "solo"} onClose={close} title="Solo">
        <SoloSheet onStart={onStart} />
      </SideSheet>
      <SideSheet open={mode === "pvp"} onClose={close} title="PvP">
        <PvpSheet />
      </SideSheet>
    </>
  );
}

function ModeCard({
  icon,
  title,
  tagline,
  tint,
  onClick,
}: {
  icon: string;
  title: string;
  tagline: string;
  tint: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative card-glass w-full p-5 flex items-center gap-4 hover:bg-white/85 active:scale-[0.99] transition-all text-left overflow-hidden`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${tint} pointer-events-none`}
        aria-hidden
      />
      <span className="relative w-14 h-14 rounded-2xl bg-stone-900 text-amber-200 flex items-center justify-center text-2xl shrink-0 shadow-md">
        {icon}
      </span>
      <div className="relative flex-1 min-w-0">
        <div className="display text-3xl font-black italic tracking-tight leading-none">
          {title}
        </div>
        <div className="text-xs text-stone-600 mt-1.5">{tagline}</div>
      </div>
      <span
        className="relative text-stone-400 text-2xl shrink-0"
        aria-hidden
      >
        →
      </span>
    </button>
  );
}
