"use client";

import { useCallback, useEffect, useState } from "react";
import { claimFromEscrow } from "@/lib/worldDeposit";
import { useSession } from "@/hooks/useSession";

type Unclaimed = {
  wld: string;
  usdc: string;
  configured: boolean;
  tokens?: { WLD: string; USDC: string };
  escrow?: string;
};

export default function UnclaimedCard() {
  const { wallet } = useSession();
  const [data, setData] = useState<Unclaimed | null>(null);
  const [claimingToken, setClaimingToken] = useState<"WLD" | "USDC" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!wallet) return;
    try {
      const r = await fetch("/api/me/unclaimed", { cache: "no-store" });
      if (r.ok) setData(await r.json());
    } catch {
      /* ignore */
    }
  }, [wallet]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onClaim = async (sym: "WLD" | "USDC") => {
    setError(null);
    if (!data?.escrow || !data.tokens) return;
    setClaimingToken(sym);
    const r = await claimFromEscrow({
      escrow: data.escrow as `0x${string}`,
      token: data.tokens[sym] as `0x${string}`,
    });
    if (!r.ok) setError(r.reason);
    else await refresh();
    setClaimingToken(null);
  };

  const wldAmount = Number(data?.wld ?? 0);
  const usdcAmount = Number(data?.usdc ?? 0);
  if (!wallet || (wldAmount <= 0 && usdcAmount <= 0)) return null;

  return (
    <section className="card-glass w-full p-4 border border-emerald-200/70 bg-emerald-50/60">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-base shrink-0">
          ✓
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-emerald-800">
            Unclaimed winnings
          </div>
          <div className="display text-2xl font-black italic tabular-nums text-emerald-900 leading-tight mt-0.5 break-words">
            {wldAmount > 0 && `${wldAmount.toFixed(3)} WLD`}
            {wldAmount > 0 && usdcAmount > 0 && (
              <span className="text-emerald-400 mx-1">+</span>
            )}
            {usdcAmount > 0 && `${usdcAmount.toFixed(2)} USDC`}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          onClick={() => onClaim("WLD")}
          disabled={
            wldAmount <= 0 || claimingToken !== null || !data?.escrow
          }
          className="btn-primary text-sm py-3 disabled:opacity-30"
        >
          {claimingToken === "WLD"
            ? "Confirm…"
            : `Claim ${wldAmount.toFixed(3)} WLD`}
        </button>
        <button
          onClick={() => onClaim("USDC")}
          disabled={
            usdcAmount <= 0 || claimingToken !== null || !data?.escrow
          }
          className="btn-primary text-sm py-3 disabled:opacity-30"
        >
          {claimingToken === "USDC"
            ? "Confirm…"
            : `Claim ${usdcAmount.toFixed(2)} USDC`}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs text-rose-700 text-center">{error}</p>
      )}
    </section>
  );
}
