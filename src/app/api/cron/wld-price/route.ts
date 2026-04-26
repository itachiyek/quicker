import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { WLD_TOKEN_ADDRESS } from "@/lib/pricing";

// Vercel Cron sends the configured CRON_SECRET as a Bearer token.
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev: allow without secret
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

type DexPair = {
  chainId?: string;
  priceUsd?: string;
  liquidity?: { usd?: number };
  baseToken?: { address?: string; symbol?: string };
  quoteToken?: { address?: string; symbol?: string };
};

async function fetchWldUsd(): Promise<number | null> {
  try {
    const url = `https://api.dexscreener.com/latest/dex/tokens/${WLD_TOKEN_ADDRESS}`;
    const r = await fetch(url, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { pairs?: DexPair[] };
    const pairs = data.pairs ?? [];
    if (pairs.length === 0) return null;

    // Prefer pairs where WLD is the base token, then sort by liquidity.
    const ranked = pairs
      .filter(
        (p) =>
          p.priceUsd &&
          p.baseToken?.address?.toLowerCase() ===
            WLD_TOKEN_ADDRESS.toLowerCase(),
      )
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));

    const pick = ranked[0] ?? pairs.sort(
      (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0),
    )[0];
    if (!pick?.priceUsd) return null;
    const price = Number(pick.priceUsd);
    if (!Number.isFinite(price) || price <= 0) return null;
    return price;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = getSupabaseAdmin();
  if (!sb) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const price = await fetchWldUsd();
  if (price === null) {
    return NextResponse.json(
      { error: "Failed to fetch price" },
      { status: 502 },
    );
  }

  const { error } = await sb.from("quicker_price_cache").upsert(
    {
      pair: "WLD/USDC",
      price_usdc: price,
      source: "dexscreener",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "pair" },
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, price_usdc: price });
}
