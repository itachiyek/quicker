import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  WEEKLY_PAYOUTS_WLD,
  WEEKLY_PRIZE_POOL_WLD,
  currentContestWindow,
  type ContestEntry,
} from "@/lib/contest";

export const revalidate = 5;

type ScoreRow = {
  wallet: string;
  score: number;
  played_at: string;
};

export async function GET() {
  const sb = getSupabaseAdmin();
  const { start, end } = currentContestWindow();
  if (!sb) {
    return NextResponse.json({
      configured: false,
      window: { start: start.toISOString(), end: end.toISOString() },
      pool_wld: WEEKLY_PRIZE_POOL_WLD,
      payouts_wld: WEEKLY_PAYOUTS_WLD,
      entries: [],
    });
  }

  // Pull every score for the active week, then aggregate per wallet client-side
  // (small and bounded since it's one week of data; keeps SQL portable).
  const { data, error } = await sb
    .from("quicker_scores")
    .select("wallet, score, played_at")
    .gte("played_at", start.toISOString())
    .lt("played_at", end.toISOString())
    .order("score", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Agg = {
    wallet: string;
    best_score: number;
    games_played: number;
    earliest_best: string; // tie-breaker: who hit the score first
  };
  const byWallet = new Map<string, Agg>();
  for (const row of (data ?? []) as ScoreRow[]) {
    const w = row.wallet;
    const prev = byWallet.get(w);
    if (!prev) {
      byWallet.set(w, {
        wallet: w,
        best_score: row.score,
        games_played: 1,
        earliest_best: row.played_at,
      });
    } else {
      prev.games_played++;
      if (row.score > prev.best_score) {
        prev.best_score = row.score;
        prev.earliest_best = row.played_at;
      } else if (
        row.score === prev.best_score &&
        row.played_at < prev.earliest_best
      ) {
        prev.earliest_best = row.played_at;
      }
    }
  }

  const sorted = Array.from(byWallet.values()).sort((a, b) => {
    if (b.best_score !== a.best_score) return b.best_score - a.best_score;
    return (
      new Date(a.earliest_best).getTime() -
      new Date(b.earliest_best).getTime()
    );
  });

  const entries: ContestEntry[] = sorted.slice(0, 10).map((agg, i) => ({
    wallet: agg.wallet,
    best_score: agg.best_score,
    games_played: agg.games_played,
    prize_wld: WEEKLY_PAYOUTS_WLD[i] ?? 0,
  }));

  return NextResponse.json({
    configured: true,
    window: { start: start.toISOString(), end: end.toISOString() },
    pool_wld: WEEKLY_PRIZE_POOL_WLD,
    payouts_wld: WEEKLY_PAYOUTS_WLD,
    entries,
  });
}
