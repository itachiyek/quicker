import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const revalidate = 300;

// Same response for every visitor — let the browser hold onto it for 5 min.
const CACHE = "public, max-age=300, s-maxage=300, stale-while-revalidate=600";

const FALLBACK_PAYOUTS = [60, 40, 25, 18, 14, 12, 10, 8, 7, 6];
const FALLBACK_POOL = 200;

type ContestRow = {
  id: number;
  name: string;
  starts_at: string;
  ends_at: string;
  prize_pool_wld: number;
  payouts_wld: number[];
};

type ScoreRow = {
  wallet: string;
  score: number;
  played_at: string;
};

export async function GET() {
  const sb = getSupabaseAdmin();
  if (!sb) {
    return NextResponse.json(
      {
        configured: false,
        contest: null,
        entries: [],
        payouts_wld: FALLBACK_PAYOUTS,
        pool_wld: FALLBACK_POOL,
      },
      { headers: { "Cache-Control": CACHE } },
    );
  }

  // Latest contest by creation time, regardless of whether it's still active.
  const { data: contestRow, error: contestErr } = await sb
    .from("quicker_contests")
    .select("id, name, starts_at, ends_at, prize_pool_wld, payouts_wld")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (contestErr) {
    return NextResponse.json({ error: contestErr.message }, { status: 500 });
  }
  if (!contestRow) {
    return NextResponse.json(
      {
        configured: true,
        contest: null,
        entries: [],
        payouts_wld: FALLBACK_PAYOUTS,
        pool_wld: FALLBACK_POOL,
      },
      { headers: { "Cache-Control": CACHE } },
    );
  }

  const c = contestRow as ContestRow;
  const payouts = Array.isArray(c.payouts_wld) ? c.payouts_wld : FALLBACK_PAYOUTS;
  const pool = Number(c.prize_pool_wld ?? FALLBACK_POOL);
  const ended = new Date(c.ends_at).getTime() <= Date.now();

  // Aggregate scores submitted strictly within the contest window.
  const { data: scoreRows, error: scoreErr } = await sb
    .from("quicker_scores")
    .select("wallet, score, played_at")
    .gte("played_at", c.starts_at)
    .lt("played_at", c.ends_at)
    .order("score", { ascending: false })
    .limit(1000);

  if (scoreErr) {
    return NextResponse.json({ error: scoreErr.message }, { status: 500 });
  }

  // Total score = sum of every Solo game's score within the contest window.
  // The PvP game lives in a separate table (quicker_lobby_answers) and never
  // writes to quicker_scores, so this naturally excludes PvP.
  type Agg = {
    wallet: string;
    total_score: number;
    games_played: number;
    first_play: string;
  };
  const byWallet = new Map<string, Agg>();
  for (const r of (scoreRows ?? []) as ScoreRow[]) {
    const w = r.wallet;
    const prev = byWallet.get(w);
    if (!prev) {
      byWallet.set(w, {
        wallet: w,
        total_score: r.score,
        games_played: 1,
        first_play: r.played_at,
      });
    } else {
      prev.total_score += r.score;
      prev.games_played++;
      if (r.played_at < prev.first_play) prev.first_play = r.played_at;
    }
  }

  // Sort: highest total wins; whoever started playing first this week wins
  // ties (rewards early commitment).
  const sorted = Array.from(byWallet.values()).sort((a, b) => {
    if (b.total_score !== a.total_score) return b.total_score - a.total_score;
    return (
      new Date(a.first_play).getTime() - new Date(b.first_play).getTime()
    );
  });

  const entries = sorted.slice(0, 10).map((agg, i) => ({
    wallet: agg.wallet,
    score: agg.total_score,
    games_played: agg.games_played,
    prize_wld: payouts[i] ?? 0,
  }));

  return NextResponse.json(
    {
      configured: true,
      contest: {
        id: c.id,
        name: c.name,
        starts_at: c.starts_at,
        ends_at: c.ends_at,
        ended,
      },
      pool_wld: pool,
      payouts_wld: payouts,
      entries,
    },
    { headers: { "Cache-Control": CACHE } },
  );
}
