// Weekly contest. Top 10 players by best score Monday 00:00 UTC -> next
// Monday 00:00 UTC share a 200 WLD prize pool.

export const WEEKLY_PRIZE_POOL_WLD = 200;

// Hand-tuned, sums to exactly 200 WLD.
export const WEEKLY_PAYOUTS_WLD: number[] = [
  60, 40, 25, 18, 14, 12, 10, 8, 7, 6,
];

if (WEEKLY_PAYOUTS_WLD.reduce((a, b) => a + b, 0) !== WEEKLY_PRIZE_POOL_WLD) {
  throw new Error("Weekly payouts must sum to the pool");
}

// Returns [start, end) in UTC for the current contest week. The week runs
// Monday 00:00:00 UTC through the following Monday 00:00:00 UTC.
export function currentContestWindow(now: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const d = new Date(now);
  // Day-of-week with Monday = 0, Sunday = 6.
  const dow = (d.getUTCDay() + 6) % 7;
  const start = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dow),
  );
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}

export type ContestEntry = {
  wallet: string;
  best_score: number;
  games_played: number;
  prize_wld: number;
};
