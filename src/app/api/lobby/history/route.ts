import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getSession();
  if (!session.wallet) return NextResponse.json({ lobbies: [] });
  const sb = getSupabaseAdmin();
  if (!sb) return NextResponse.json({ lobbies: [] });

  const { data, error } = await sb
    .from("quicker_lobbies")
    .select(
      "id, creator_wallet, challenger_wallet, token_symbol, amount_per_player, creator_score, challenger_score, winner_wallet, is_tie, status, fee_percent, created_at, updated_at",
    )
    .or(
      `creator_wallet.eq.${session.wallet},challenger_wallet.eq.${session.wallet}`,
    )
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lobbies: data ?? [] });
}
