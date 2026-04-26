import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const session = await getSession();
  if (!session.wallet) {
    return NextResponse.json({ payments: [] });
  }
  const sb = getSupabaseAdmin();
  if (!sb) return NextResponse.json({ payments: [] });

  const { data, error } = await sb
    .from("quicker_payments")
    .select("tx_hash, wld_amount, usdc_value, block_number, verified_at")
    .eq("wallet", session.wallet)
    .order("verified_at", { ascending: false })
    .limit(20);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ payments: data ?? [] });
}
