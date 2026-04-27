import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  ESCROW_ABI,
  getEscrowAddress,
  isHash,
  parseUnits,
  decimalsFor,
  verifyDepositTx,
  walletClient,
} from "@/lib/pvp";

// Verify the on-chain transfer + call recordDeposit on the escrow contract.
// Used both for creator's first deposit and for challenger's matching deposit.
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

  const escrow = getEscrowAddress();
  if (!escrow) {
    return NextResponse.json(
      { error: "Escrow contract not configured" },
      { status: 503 },
    );
  }
  const wc = walletClient();
  if (!wc) {
    return NextResponse.json(
      { error: "Owner wallet not configured" },
      { status: 503 },
    );
  }

  const body = (await req.json()) as { txHash?: string };
  const txHash = body.txHash;
  if (!txHash || !isHash(txHash)) {
    return NextResponse.json({ error: "Bad tx hash" }, { status: 400 });
  }

  const { data: lobby, error: lobbyErr } = await sb
    .from("quicker_lobbies")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (lobbyErr || !lobby) {
    return NextResponse.json({ error: "Lobby not found" }, { status: 404 });
  }

  const wallet = session.wallet.toLowerCase();
  const isCreator = wallet === lobby.creator_wallet.toLowerCase();
  const isChallenger =
    !isCreator && (lobby.challenger_wallet?.toLowerCase() === wallet || !lobby.challenger_wallet);

  if (!isCreator && !isChallenger) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  // Status guard
  if (isCreator && lobby.status !== "awaiting_creator_deposit") {
    return NextResponse.json(
      { error: `Bad lobby state: ${lobby.status}` },
      { status: 400 },
    );
  }
  if (isChallenger && lobby.status !== "open") {
    return NextResponse.json(
      { error: `Lobby is not open (${lobby.status})` },
      { status: 400 },
    );
  }

  // Parse the expected amount in the token's smallest unit.
  const decimals = decimalsFor(lobby.token_symbol as "WLD" | "USDC");
  const expectedUnits = parseUnits(
    String(lobby.amount_per_player),
    decimals,
  );

  const verification = await verifyDepositTx({
    txHash: txHash as `0x${string}`,
    token: lobby.token_address as `0x${string}`,
    expectedFrom: wallet as `0x${string}`,
    expectedAmount: expectedUnits,
    toContract: escrow,
  });
  if (!verification.ok) {
    return NextResponse.json({ error: verification.reason }, { status: 400 });
  }

  // Call recordDeposit on the escrow as the owner — fee is split off here.
  let recordTx: `0x${string}`;
  try {
    recordTx = await wc.writeContract({
      address: escrow,
      abi: ESCROW_ABI,
      functionName: "recordDeposit",
      args: [
        lobby.token_address as `0x${string}`,
        lobby.on_chain_lobby_id as `0x${string}`,
        wallet as `0x${string}`,
        verification.amount,
      ],
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "recordDeposit failed" },
      { status: 500 },
    );
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (isCreator) {
    update.creator_deposit_tx = txHash;
    update.status = "creator_playing";
  } else {
    update.challenger_wallet = wallet;
    update.challenger_deposit_tx = txHash;
    update.status = "challenger_playing";
  }
  const { error: upErr } = await sb
    .from("quicker_lobbies")
    .update(update)
    .eq("id", id);
  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, recordTx });
}
