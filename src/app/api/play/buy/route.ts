import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  http,
  parseAbiItem,
  parseUnits,
  formatUnits,
  isAddress,
  isHash,
} from "viem";
import { getSession } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  WLD_TOKEN_ADDRESS,
  getTreasuryAddress,
  USDC_PER_ROUND,
} from "@/lib/pricing";
import { getPlayStatus } from "@/lib/plays";

// World Chain mainnet (chainId 480).
const WORLDCHAIN_RPC =
  process.env.WORLDCHAIN_RPC_URL ?? "https://worldchain-mainnet.g.alchemy.com/public";

const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

export async function POST(req: NextRequest) {
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
  const treasury = getTreasuryAddress();
  if (!treasury) {
    return NextResponse.json(
      { error: "Payments not configured" },
      { status: 503 },
    );
  }

  const body = (await req.json()) as { txHash?: string };
  const txHash = body.txHash;
  if (!txHash || !isHash(txHash)) {
    return NextResponse.json({ error: "Bad tx hash" }, { status: 400 });
  }

  // Don't double-credit the same transaction.
  const { data: existing } = await sb
    .from("quicker_payments")
    .select("tx_hash")
    .eq("tx_hash", txHash)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "Already processed" }, { status: 409 });
  }

  // Look up the receipt + verify a WLD Transfer event from the player to the
  // treasury for at least the required amount.
  const client = createPublicClient({
    transport: http(WORLDCHAIN_RPC),
  });

  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash: txHash });
  } catch {
    return NextResponse.json({ error: "Tx not found" }, { status: 404 });
  }
  if (receipt.status !== "success") {
    return NextResponse.json({ error: "Tx not successful" }, { status: 400 });
  }

  // Look up cached price to compute the required WLD amount.
  const { data: priceRow } = await sb
    .from("quicker_price_cache")
    .select("price_usdc,updated_at")
    .eq("pair", "WLD/USDC")
    .maybeSingle();
  const priceUsdc = priceRow?.price_usdc as number | undefined;
  if (!priceUsdc || priceUsdc <= 0) {
    return NextResponse.json(
      { error: "Price unavailable" },
      { status: 503 },
    );
  }
  // Allow 5% slippage downward (price moves between buy + verify) but require
  // at least 95% of the spec.
  const requiredWld = USDC_PER_ROUND / priceUsdc;
  const minWld = requiredWld * 0.95;
  const minUnits = parseUnits(minWld.toFixed(18), 18);

  // Find the matching Transfer log: WLD token, from=session.wallet, to=treasury.
  let totalIn = 0n;
  for (const log of receipt.logs) {
    if (
      log.address.toLowerCase() !== WLD_TOKEN_ADDRESS.toLowerCase()
    )
      continue;
    let parsed;
    try {
      // viem decodeEventLog needs the abi item.
      const { decodeEventLog } = await import("viem");
      parsed = decodeEventLog({
        abi: [transferEvent],
        data: log.data,
        topics: log.topics,
      });
    } catch {
      continue;
    }
    if (parsed.eventName !== "Transfer") continue;
    const args = parsed.args as { from: string; to: string; value: bigint };
    if (
      isAddress(args.from) &&
      args.from.toLowerCase() === session.wallet.toLowerCase() &&
      isAddress(args.to) &&
      args.to.toLowerCase() === treasury.toLowerCase()
    ) {
      totalIn += args.value;
    }
  }

  if (totalIn < minUnits) {
    return NextResponse.json(
      {
        error: "Insufficient WLD transferred",
        required: minWld,
        actual: Number(formatUnits(totalIn, 18)),
      },
      { status: 400 },
    );
  }

  // All good — record the payment and increment paid_credits.
  const wldPaid = Number(formatUnits(totalIn, 18));
  const usdcValue = Number((wldPaid * priceUsdc).toFixed(4));

  const { error: payErr } = await sb.from("quicker_payments").insert({
    tx_hash: txHash,
    wallet: session.wallet,
    wld_amount: wldPaid,
    usdc_value: usdcValue,
    block_number: Number(receipt.blockNumber),
  });
  if (payErr) {
    return NextResponse.json({ error: payErr.message }, { status: 500 });
  }

  // Make sure player row exists then increment.
  await sb
    .from("quicker_players")
    .upsert(
      { wallet: session.wallet },
      { onConflict: "wallet", ignoreDuplicates: true },
    );

  // Read-modify-write: simple +1 increment. Race-tolerant since we only ever
  // grant a single credit per verified tx.
  const { data: cur } = await sb
    .from("quicker_players")
    .select("paid_credits")
    .eq("wallet", session.wallet)
    .maybeSingle();
  const next = ((cur?.paid_credits as number | undefined) ?? 0) + 1;
  await sb
    .from("quicker_players")
    .update({ paid_credits: next })
    .eq("wallet", session.wallet);

  const status = await getPlayStatus(sb, session.wallet);
  return NextResponse.json({ ok: true, status });
}
