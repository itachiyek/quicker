import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { verifySiweSignature } from "@/lib/siwe";
import { isAddress } from "viem";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    message?: string;
    signature?: string;
    address?: string;
  };

  if (!body.message || !body.signature || !body.address) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!isAddress(body.address)) {
    return NextResponse.json({ error: "Bad address" }, { status: 400 });
  }

  const session = await getSession();
  const expectedNonce = session.nonce;
  if (!expectedNonce) {
    return NextResponse.json({ error: "No nonce" }, { status: 400 });
  }
  if (!body.message.includes(`Nonce: ${expectedNonce}`)) {
    return NextResponse.json({ error: "Nonce mismatch" }, { status: 400 });
  }
  if (!body.message.toLowerCase().includes(body.address.toLowerCase())) {
    return NextResponse.json({ error: "Address mismatch" }, { status: 400 });
  }

  const ok = await verifySiweSignature(
    body.message,
    body.signature as `0x${string}`,
    body.address as `0x${string}`,
  );
  if (!ok) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  // Persist a normalized lowercase wallet address.
  const wallet = body.address.toLowerCase();
  session.wallet = wallet;
  session.nonce = undefined;
  await session.save();

  // Best-effort: ensure player row exists.
  const sb = getSupabaseAdmin();
  if (sb) {
    await sb
      .from("quicker_players")
      .upsert(
        { wallet, display_name: null },
        { onConflict: "wallet", ignoreDuplicates: true },
      );
  }

  return NextResponse.json({ wallet });
}
