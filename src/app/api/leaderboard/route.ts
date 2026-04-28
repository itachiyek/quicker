import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const revalidate = 60;

export async function GET() {
  const sb = getSupabaseAdmin();
  if (!sb) {
    return NextResponse.json({ entries: [], configured: false });
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
  return NextResponse.json({ entries: data ?? [], configured: true });
}
