import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getPlayStatus } from "@/lib/plays";
import { getTreasuryAddress, USDC_PER_ROUND } from "@/lib/pricing";

export async function GET() {
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
  const status = await getPlayStatus(sb, session.wallet);
  return NextResponse.json(
    {
      ...status,
      treasury: getTreasuryAddress(),
      usdcPerRound: USDC_PER_ROUND,
    },
    {
      // Per-user. We refresh client-side after starting a round or buying
      // credits, so a 30s browser cache is safe and dedupes panel re-opens.
      headers: { "Cache-Control": "private, max-age=30" },
    },
  );
}
