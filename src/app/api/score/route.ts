import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.wallet) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const body = (await req.json()) as {
    score?: number;
    total?: number;
    durationSeconds?: number;
  };
  const score = Number(body.score);
  const total = Number(body.total);
  const duration = Number(body.durationSeconds);
  if (!Number.isFinite(score) || score < 0 || score > 9999) {
    return NextResponse.json({ error: "Bad score" }, { status: 400 });
  }
  if (!Number.isFinite(total) || total < 0 || total > 9999) {
    return NextResponse.json({ error: "Bad total" }, { status: 400 });
  }
  if (!Number.isFinite(duration) || duration < 1 || duration > 600) {
    return NextResponse.json({ error: "Bad duration" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  if (!sb) {
    return NextResponse.json(
      { error: "Leaderboard not configured" },
      { status: 503 },
    );
  }

  await sb
    .from("quicker_players")
    .upsert(
      { wallet: session.wallet },
      { onConflict: "wallet", ignoreDuplicates: true },
    );

  const { error } = await sb.from("quicker_scores").insert({
    wallet: session.wallet,
    score,
    total,
    duration_seconds: duration,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
