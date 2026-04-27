import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  ESCROW_ABI,
  getEscrowAddress,
  walletClient,
} from "@/lib/pvp";

type AnswerInput = {
  question_index: number;
  drawn_answer: number | null;
  is_correct: boolean;
};

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session.wallet) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  if (!sb) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const body = (await req.json()) as { score?: number; answers?: AnswerInput[] };
  const score = Number(body.score);
  const answers = Array.isArray(body.answers) ? body.answers : [];
  if (!Number.isFinite(score) || score < 0 || score > 9999) {
    return NextResponse.json({ error: "Bad score" }, { status: 400 });
  }

  const { data: lobby, error: lErr } = await sb
    .from("quicker_lobbies")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (lErr || !lobby) {
    return NextResponse.json({ error: "Lobby not found" }, { status: 404 });
  }

  const wallet = session.wallet.toLowerCase();
  const isCreator = wallet === lobby.creator_wallet.toLowerCase();
  const isChallenger = wallet === (lobby.challenger_wallet ?? "").toLowerCase();
  if (!isCreator && !isChallenger) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // Status guard
  if (isCreator && lobby.status !== "creator_playing") {
    return NextResponse.json(
      { error: `Bad state: ${lobby.status}` },
      { status: 400 },
    );
  }
  if (isChallenger && lobby.status !== "challenger_playing") {
    return NextResponse.json(
      { error: `Bad state: ${lobby.status}` },
      { status: 400 },
    );
  }

  // Persist the answer rows.
  if (answers.length) {
    const eqs = (lobby.equations_json as Array<{
      id: number;
      text: string;
      answer: number;
    }>) ?? [];
    const rows = answers
      .map((a) => {
        const eq = eqs[a.question_index];
        if (!eq) return null;
        return {
          lobby_id: id,
          wallet,
          question_index: a.question_index,
          question_text: eq.text,
          expected_answer: eq.answer,
          drawn_answer: a.drawn_answer,
          is_correct: !!a.is_correct,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    if (rows.length) {
      await sb.from("quicker_lobby_answers").insert(rows);
    }
  }

  // Update the lobby score / status.
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (isCreator) {
    update.creator_score = score;
    update.status = "open"; // wait for a challenger
  } else {
    update.challenger_score = score;
    update.status = "resolving";
  }
  const { error: upErr } = await sb
    .from("quicker_lobbies")
    .update(update)
    .eq("id", id);
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  // If the challenger just finished, resolve on-chain.
  if (isChallenger) {
    const escrow = getEscrowAddress();
    const wc = walletClient();
    if (escrow && wc) {
      const creatorScore = Number(lobby.creator_score ?? 0);
      const challengerScore = score;
      let resolveTx: `0x${string}` | null = null;
      try {
        if (creatorScore === challengerScore) {
          resolveTx = await wc.writeContract({
            address: escrow,
            abi: ESCROW_ABI,
            functionName: "resolveTie",
            args: [
              lobby.token_address as `0x${string}`,
              lobby.on_chain_lobby_id as `0x${string}`,
              lobby.creator_wallet as `0x${string}`,
              wallet as `0x${string}`,
            ],
          });
          await sb
            .from("quicker_lobbies")
            .update({
              status: "resolved",
              is_tie: true,
              winner_wallet: null,
              resolve_tx: resolveTx,
              updated_at: new Date().toISOString(),
            })
            .eq("id", id);
        } else {
          const winner =
            creatorScore > challengerScore ? lobby.creator_wallet : wallet;
          resolveTx = await wc.writeContract({
            address: escrow,
            abi: ESCROW_ABI,
            functionName: "resolveChallenge",
            args: [
              lobby.token_address as `0x${string}`,
              lobby.on_chain_lobby_id as `0x${string}`,
              winner as `0x${string}`,
            ],
          });
          await sb
            .from("quicker_lobbies")
            .update({
              status: "resolved",
              winner_wallet: winner,
              resolve_tx: resolveTx,
              updated_at: new Date().toISOString(),
            })
            .eq("id", id);
        }
      } catch (e) {
        // We still report success of the score submission. Resolve can be
        // retried via a separate /resolve endpoint later.
        return NextResponse.json({
          ok: true,
          resolved: false,
          resolveError: e instanceof Error ? e.message : "resolve failed",
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
