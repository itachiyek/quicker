import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { verifySiweSignature } from "@/lib/siwe";
import { isAddress } from "viem";
import { getSupabaseAdmin } from "@/lib/supabase";

// Unified login endpoint. Accepts either:
//   1. World App (MiniKit) payload:
//      { source: "minikit", payload: {address, message, signature, ...}, nonce }
//   2. Plain SIWE / wagmi:
//      { source: "wagmi", message, signature, address }  (nonce is read from session)
//
// Verifies the signature, persists the wallet in the iron-session cookie,
// and ensures a player row exists.

type WagmiBody = {
  source: "wagmi";
  message: string;
  signature: `0x${string}`;
  address: string;
  ref?: string;
};

type MiniKitBody = {
  source: "minikit";
  nonce: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  ref?: string;
};

const REFERRAL_CREDIT = 1;
const WALLET_RE = /^0x[a-f0-9]{40}$/i;

export async function POST(req: NextRequest) {
  const body = (await req.json()) as WagmiBody | MiniKitBody;
  const session = await getSession();
  const expectedNonce = session.nonce;
  if (!expectedNonce) {
    return NextResponse.json({ error: "No nonce" }, { status: 400 });
  }

  let wallet: string | null = null;

  if (body.source === "minikit") {
    if (body.nonce !== expectedNonce) {
      return NextResponse.json({ error: "Bad nonce" }, { status: 400 });
    }
    try {
      const { verifySiweMessage } = await import(
        "@worldcoin/minikit-js/siwe"
      );
      const verification = await verifySiweMessage(body.payload, body.nonce);
      if (!verification.isValid) {
        return NextResponse.json({ error: "Invalid SIWE" }, { status: 401 });
      }
      const addr =
        verification.siweMessageData?.address ?? body.payload?.address;
      if (!addr || !isAddress(addr)) {
        return NextResponse.json({ error: "Bad address" }, { status: 401 });
      }
      wallet = addr.toLowerCase();
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Verify failed" },
        { status: 400 },
      );
    }
  } else if (body.source === "wagmi") {
    if (!body.message || !body.signature || !body.address) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (!isAddress(body.address)) {
      return NextResponse.json({ error: "Bad address" }, { status: 400 });
    }
    if (!body.message.includes(`Nonce: ${expectedNonce}`)) {
      return NextResponse.json({ error: "Nonce mismatch" }, { status: 400 });
    }
    if (!body.message.toLowerCase().includes(body.address.toLowerCase())) {
      return NextResponse.json({ error: "Address mismatch" }, { status: 400 });
    }
    const ok = await verifySiweSignature(
      body.message,
      body.signature,
      body.address as `0x${string}`,
    );
    if (!ok) {
      return NextResponse.json({ error: "Bad signature" }, { status: 401 });
    }
    wallet = body.address.toLowerCase();
  } else {
    return NextResponse.json({ error: "Unknown source" }, { status: 400 });
  }

  session.wallet = wallet!;
  session.nonce = undefined;
  await session.save();

  const sb = getSupabaseAdmin();
  if (sb) {
    // Detect a brand-new player so we only credit a referrer once per signup.
    const { data: existing } = await sb
      .from("quicker_players")
      .select("wallet")
      .eq("wallet", wallet!)
      .maybeSingle();

    const rawRef = (body.ref ?? "").toLowerCase();
    const referrer =
      WALLET_RE.test(rawRef) && rawRef !== wallet!.toLowerCase()
        ? rawRef
        : null;

    if (!existing) {
      await sb
        .from("quicker_players")
        .insert({ wallet: wallet!, referred_by: referrer });

      if (referrer) {
        // Only credit if the referrer is a known player.
        const { data: refRow } = await sb
          .from("quicker_players")
          .select("paid_credits")
          .eq("wallet", referrer)
          .maybeSingle();
        if (refRow) {
          const next =
            ((refRow.paid_credits as number | undefined) ?? 0) + REFERRAL_CREDIT;
          await sb
            .from("quicker_players")
            .update({ paid_credits: next })
            .eq("wallet", referrer);
        }
      }
    }
  }
  return NextResponse.json({ wallet });
}
