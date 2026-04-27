import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const session = await getSession();
  const sb = getSupabaseAdmin();
  if (!sb) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data, error } = await sb
    .from("quicker_lobbies")
    .select(
      "id, on_chain_lobby_id, creator_wallet, challenger_wallet, token_symbol, token_address, amount_per_player, fee_percent, status, creator_score, challenger_score, winner_wallet, is_tie, equations_json, created_at, expires_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Hide opponent's equations_json after a player has played to discourage
  // peeking — actually both play the SAME equations, so revealing them only
  // matters between deposit and play. We keep it simple: anyone can see them
  // since both players need them to play.
  return NextResponse.json({
    lobby: data,
    me: session.wallet ?? null,
  });
}
