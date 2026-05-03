import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const revalidate = 300;

// Public, long-ish edge cache plus a stale-while-revalidate window keeps the
// page snappy without making every visit a fresh edge request. The data is
// never personalized so we can serve the same body to everyone.
const CACHE = "public, max-age=300, s-maxage=300, stale-while-revalidate=600";

export async function GET() {
  const sb = getSupabaseAdmin();
  if (!sb) {
    return NextResponse.json(
      { entries: [], configured: false },
      { headers: { "Cache-Control": CACHE } },
    );
  }
  const { data, error } = await sb
    .from("quicker_players")
    .select("wallet, display_name, best_score, games_played, updated_at")
    .order("best_score", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(
    { entries: data ?? [], configured: true },
    { headers: { "Cache-Control": CACHE } },
  );
}
