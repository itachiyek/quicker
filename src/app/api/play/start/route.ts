import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";
import { consumePlay, getPlayStatus } from "@/lib/plays";

export async function POST() {
  const session = await getSession();
  if (!session.wallet) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  if (!sb) {
    return NextResponse.json(
      { error: "Backend not configured" },
      { status: 503 },
    );
  }
  const result = await consumePlay(sb, session.wallet);
  if (!result.ok) {
    const status = await getPlayStatus(sb, session.wallet);
    return NextResponse.json(
      { error: result.reason, status },
      { status: 402 },
    );
  }
  const status = await getPlayStatus(sb, session.wallet);
  return NextResponse.json({ ok: true, source: result.source, status });
}
