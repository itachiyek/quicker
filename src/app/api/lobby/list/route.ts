import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export const revalidate = 5;

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const sb = getSupabaseAdmin();
  if (!sb) return NextResponse.json({ lobbies: [], hasMore: false });

  const url = new URL(req.url);
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0));
  const tokenFilter = url.searchParams.get("token"); // "WLD" | "USDC" | null
  const sort = url.searchParams.get("sort") ?? "newest";
  // ^ "newest" | "stake_desc" | "stake_asc"

  let q = sb
    .from("quicker_lobbies")
    .select(
      "id, creator_wallet, token_symbol, amount_per_player, creator_score, fee_percent, created_at",
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

  return NextResponse.json({
    lobbies: data ?? [],
    total,
    hasMore,
    pageSize: PAGE_SIZE,
  });
}
