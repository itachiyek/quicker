import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";

// Side-by-side answer comparison for the match-history detail sheet.
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const session = await getSession();
  const sb = getSupabaseAdmin();
  if (!sb) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const { data: lobby } = await sb
    .from("quicker_lobbies")
    .select(
      "id, creator_wallet, challenger_wallet, token_symbol, amount_per_player, creator_score, challenger_score, winner_wallet, is_tie, status, fee_percent",
    )
    .eq("id", id)
    .maybeSingle();
  if (!lobby) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: answers } = await sb
    .from("quicker_lobby_answers")
    .select(
      "wallet, question_index, question_text, expected_answer, drawn_answer, is_correct",
    )
    .eq("lobby_id", id)
    .order("question_index", { ascending: true });

  return NextResponse.json({
    lobby,
    answers: answers ?? [],
    me: session.wallet ?? null,
  });
}
