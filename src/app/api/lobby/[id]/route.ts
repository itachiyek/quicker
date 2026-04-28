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

  // Hide the creator's score from anyone who isn't the creator until the
  // challenger has finished their round (or the lobby is resolved). Without
  // this the challenger could peek at the target before playing.
  const me = session.wallet?.toLowerCase() ?? null;
  const isCreator =
    me !== null && me === data.creator_wallet.toLowerCase();
  const challengerFinished = data.challenger_score !== null;
  const isResolved = data.status === "resolved";
  const lobby = { ...data };
  if (!isCreator && !challengerFinished && !isResolved) {
    lobby.creator_score = null;
  }

  return NextResponse.json({
    lobby,
    me: session.wallet ?? null,
  });
}
