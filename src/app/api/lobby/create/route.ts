import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";
import { makeEquations } from "@/lib/equations";
import {
  getEscrowAddress,
  lobbyIdToBytes32,
  shortLobbyId,
  tokenAddressFor,
} from "@/lib/pvp";

const POOL_SIZE = 200;
const MIN_AMOUNT = 0.1; // arbitrary floor; tune if needed
const MAX_AMOUNT = 10_000;

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.wallet) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  if (!sb) return NextResponse.json({ error: "DB unavailable" }, { status: 503 });

  const escrow = getEscrowAddress();
  if (!escrow) {
    return NextResponse.json(
      { error: "Escrow contract not configured" },
      { status: 503 },
    );
  }

  const body = (await req.json()) as {
    tokenSymbol?: "WLD" | "USDC";
    amount?: number;
  };
  const sym = body.tokenSymbol;
  if (sym !== "WLD" && sym !== "USDC") {
    return NextResponse.json({ error: "Bad token" }, { status: 400 });
  }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return NextResponse.json({ error: "Bad amount" }, { status: 400 });
  }

  // Read fee_percent from settings (defaults to 10).
  const { data: feeRow } = await sb
    .from("quicker_settings")
    .select("value")
    .eq("key", "pvp_fee_percent")
    .maybeSingle();
  const feePercent = Number(
    (feeRow?.value as number | string | undefined) ?? 10,
  );

  const id = shortLobbyId();
  const onChainId = lobbyIdToBytes32(id);
  const equations = makeEquations(POOL_SIZE);

  const { error } = await sb.from("quicker_lobbies").insert({
    id,
    on_chain_lobby_id: onChainId,
    creator_wallet: session.wallet,
    token_symbol: sym,
    token_address: tokenAddressFor(sym),
    amount_per_player: amount,
    fee_percent: feePercent,
    status: "awaiting_creator_deposit",
    equations_json: equations,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id,
    on_chain_lobby_id: onChainId,
    escrow,
    token_address: tokenAddressFor(sym),
    amount,
    fee_percent: feePercent,
  });
}
