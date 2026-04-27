import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const revalidate = 5;

export async function GET() {
  const sb = getSupabaseAdmin();
  if (!sb) return NextResponse.json({ lobbies: [] });

  // "Open" = creator has finished and we're waiting on a challenger.
  const { data, error } = await sb
    .from("quicker_lobbies")
    .select(
      "id, creator_wallet, token_symbol, amount_per_player, creator_score, fee_percent, created_at, expires_at",
    )
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lobbies: data ?? [] });
}
