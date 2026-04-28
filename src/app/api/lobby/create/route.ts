import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";
import { makeEquations } from "@/lib/equations";
import {
  ESCROW_ABI,
  decimalsFor,
  getEscrowAddress,
  isHash,
  lobbyIdToBytes32,
  parseUnits,
  shortLobbyId,
  tokenAddressFor,
  verifyDepositTx,
  walletClient,
} from "@/lib/pvp";

const POOL_SIZE = 200;
const MIN_AMOUNT = 0.05;
const MAX_AMOUNT = 10_000;

// Create + deposit are atomic from the client's perspective: the user is
// asked to sign the transfer first, and only when that's confirmed on-chain
// does this endpoint create the lobby row and call recordDeposit. No more
// orphan lobbies that exist without any actual money.
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
  const wc = walletClient();
  if (!wc) {
    return NextResponse.json(
      { error: "Owner wallet not configured" },
      { status: 503 },
    );
  }

  const body = (await req.json()) as {
    tokenSymbol?: "WLD" | "USDC";
    amount?: number;
    txHash?: string;
  };
  const sym = body.tokenSymbol;
  if (sym !== "WLD" && sym !== "USDC") {
    return NextResponse.json({ error: "Bad token" }, { status: 400 });
  }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return NextResponse.json(
      { error: `Amount must be between ${MIN_AMOUNT} and ${MAX_AMOUNT}` },
      { status: 400 },
    );
  }
  const txHash = body.txHash;
  if (!txHash || !isHash(txHash)) {
    return NextResponse.json({ error: "Missing deposit tx" }, { status: 400 });
  }

  // Reject re-use of the same tx for another lobby.
  const { data: dup } = await sb
    .from("quicker_lobbies")
    .select("id")
    .eq("creator_deposit_tx", txHash)
    .maybeSingle();
  if (dup) {
    return NextResponse.json(
      { error: "Deposit already used", id: dup.id },
      { status: 409 },
    );
  }

  const tokenAddress = tokenAddressFor(sym);
  const decimals = decimalsFor(sym);
  const expectedUnits = parseUnits(String(amount), decimals);

  // Verify the user actually transferred the right amount to the escrow.
  const verification = await verifyDepositTx({
    txHash: txHash as `0x${string}`,
    token: tokenAddress,
    expectedFrom: session.wallet as `0x${string}`,
    expectedAmount: expectedUnits,
    toContract: escrow,
  });
  if (!verification.ok) {
    return NextResponse.json({ error: verification.reason }, { status: 400 });
  }

  // Read configurable fee from settings.
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

  const { error: insErr } = await sb.from("quicker_lobbies").insert({
    id,
    on_chain_lobby_id: onChainId,
    creator_wallet: session.wallet,
    token_symbol: sym,
    token_address: tokenAddress,
    amount_per_player: amount,
    fee_percent: feePercent,
    status: "creator_playing",
    equations_json: equations,
    creator_deposit_tx: txHash,
  });
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  // Call recordDeposit on chain — fee is split off here.
  try {
    await wc.writeContract({
      address: escrow,
      abi: ESCROW_ABI,
      functionName: "recordDeposit",
      args: [
        tokenAddress,
        onChainId as `0x${string}`,
        session.wallet as `0x${string}`,
        verification.amount,
      ],
    });
  } catch (e) {
    // Lobby was created but recordDeposit failed — surface the error so the
    // operator can investigate. The user's funds are at the contract address
    // and can be recovered manually via resolveTie(creator, creator).
    return NextResponse.json(
      {
        ok: false,
        id,
        error:
          "Deposit verified but recordDeposit failed: " +
          (e instanceof Error ? e.message : "unknown"),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id, on_chain_lobby_id: onChainId });
}
