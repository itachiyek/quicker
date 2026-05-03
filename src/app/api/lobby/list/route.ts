import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const revalidate = 30;

const PAGE_SIZE = 20;
// Public list — same response across users for the same query string.
const CACHE = "public, max-age=30, s-maxage=30, stale-while-revalidate=120";

export async function GET(req: NextRequest) {
  const sb = getSupabaseAdmin();
  if (!sb)
    return NextResponse.json(
      { lobbies: [], hasMore: false },
      { headers: { "Cache-Control": CACHE } },
    );

  const url = new URL(req.url);
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));
  const tokenFilter = url.searchParams.get("token"); // "WLD" | "USDC" | null
  const sort = url.searchParams.get("sort") ?? "newest";
  // ^ "newest" | "stake_desc" | "stake_asc"

  // Don't return creator_score — challengers shouldn't see the target before
  // they commit to play.
  let q = sb
    .from("quicker_lobbies")
    .select(
      "id, creator_wallet, token_symbol, amount_per_player, fee_percent, created_at",
      { count: "exact" },
    )
    .eq("status", "open");

  if (tokenFilter === "WLD" || tokenFilter === "USDC") {
    q = q.eq("token_symbol", tokenFilter);
  }

  if (sort === "stake_desc") {
    q = q.order("amount_per_player", { ascending: false });
  } else if (sort === "stake_asc") {
    q = q.order("amount_per_player", { ascending: true });
  } else {
    q = q.order("created_at", { ascending: false });
  }
  // Tie-breaker so paginated pages stay stable.
  q = q.order("created_at", { ascending: false });

  q = q.range(offset, offset + PAGE_SIZE - 1);

  const { data, count, error } = await q;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const total = count ?? 0;
  const returned = data?.length ?? 0;
  const hasMore = offset + returned < total;

  return NextResponse.json(
    {
      lobbies: data ?? [],
      total,
      hasMore,
      pageSize: PAGE_SIZE,
    },
    { headers: { "Cache-Control": CACHE } },
  );
}
