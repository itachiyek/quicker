import type { SupabaseClient } from "@supabase/supabase-js";
import { FREE_PLAYS_PER_DAY, USDC_PER_ROUND } from "./pricing";

export type PlayStatus = {
  freeRemaining: number;
  freeCap: number;
  paidCredits: number;
  nextFreeAt: string | null; // ISO timestamp, when the oldest play falls out of the window
  canPlay: boolean;
  wldPriceUsdc: number | null;
  wldPriceUpdatedAt: string | null;
  wldPerRound: number | null;
  usdcPerRound: number;
};

export async function getPlayStatus(
  sb: SupabaseClient,
  wallet: string,
): Promise<PlayStatus> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [
    { data: playsData },
    { data: playerData },
    { data: priceData },
  ] = await Promise.all([
    sb
      .from("quicker_plays")
      .select("started_at,source")
      .eq("wallet", wallet)
      .gte("started_at", since)
      .order("started_at", { ascending: true }),
    sb
      .from("quicker_players")
      .select("paid_credits")
      .eq("wallet", wallet)
      .maybeSingle(),
    sb
      .from("quicker_price_cache")
      .select("price_usdc,updated_at")
      .eq("pair", "WLD/USDC")
      .maybeSingle(),
  ]);

  const recentFreePlays = (playsData ?? []).filter(
    (p: { source: string }) => p.source === "free",
  );
  const freeUsed = recentFreePlays.length;
  const freeRemaining = Math.max(0, FREE_PLAYS_PER_DAY - freeUsed);

  let nextFreeAt: string | null = null;
  if (freeRemaining === 0 && recentFreePlays.length > 0) {
    const oldest = recentFreePlays[0].started_at as string;
    nextFreeAt = new Date(
      new Date(oldest).getTime() + 24 * 60 * 60 * 1000,
    ).toISOString();
  }

  const paidCredits = (playerData?.paid_credits as number | undefined) ?? 0;
  const price = priceData?.price_usdc as number | undefined;
  const wldPerRound =
    typeof price === "number" && price > 0
      ? Number((USDC_PER_ROUND / price).toFixed(4))
      : null;

  return {
    freeRemaining,
    freeCap: FREE_PLAYS_PER_DAY,
    paidCredits,
    nextFreeAt,
    canPlay: freeRemaining > 0 || paidCredits > 0,
    wldPriceUsdc: typeof price === "number" ? Number(price) : null,
    wldPriceUpdatedAt: (priceData?.updated_at as string | undefined) ?? null,
    wldPerRound,
    usdcPerRound: USDC_PER_ROUND,
  };
}

export async function consumePlay(
  sb: SupabaseClient,
  wallet: string,
): Promise<{ ok: true; source: "free" | "paid" } | { ok: false; reason: string }> {
  const status = await getPlayStatus(sb, wallet);
  if (status.freeRemaining > 0) {
    const { error } = await sb
      .from("quicker_plays")
      .insert({ wallet, source: "free" });
    if (error) return { ok: false, reason: error.message };
    return { ok: true, source: "free" };
  }
  if (status.paidCredits > 0) {
    // Atomic-ish decrement via update.
    const { error: updErr, data: updated } = await sb
      .from("quicker_players")
      .update({ paid_credits: status.paidCredits - 1 })
      .eq("wallet", wallet)
      .eq("paid_credits", status.paidCredits) // optimistic concurrency check
      .select("paid_credits")
      .maybeSingle();
    if (updErr || !updated) {
      return { ok: false, reason: "Could not decrement credits" };
    }
    const { error } = await sb
      .from("quicker_plays")
      .insert({ wallet, source: "paid" });
    if (error) return { ok: false, reason: error.message };
    return { ok: true, source: "paid" };
  }
  return { ok: false, reason: "No plays remaining" };
}
