"use client";

import { useState } from "react";
import { encodeFunctionData, erc20Abi } from "viem";
import { MiniKit } from "@worldcoin/minikit-js";
import type { PlayStatus } from "@/hooks/usePlayStatus";
import { PACKAGES, type Package } from "@/lib/pricing";

const WLD_TOKEN_ADDRESS =
  "0x2cFc85d8E48F8EAB294be644d9E25C3030863003" as const;
const WORLD_CHAIN_ID = 480;

function isInWorldApp(): boolean {
  if (typeof window === "undefined") return false;
  const m = MiniKit as unknown as { isInWorldApp?: () => boolean };
  return typeof m.isInWorldApp === "function" ? !!m.isInWorldApp() : false;
}

async function resolveUserOp(userOpHash: string): Promise<string> {
  const start = Date.now();
  const TIMEOUT_MS = 60_000;
  while (Date.now() - start < TIMEOUT_MS) {
    try {
      const r = await fetch(
        `https://developer.world.org/api/v2/minikit/userop/${userOpHash}`,
        { cache: "no-store" },
      );
      if (r.ok) {
        const data = (await r.json()) as {
          status?: string;
          transaction_hash?: string;
        };
        if (data.status === "success" && data.transaction_hash)
          return data.transaction_hash;
        if (data.status === "failed") throw new Error("Transaction failed");
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error("Timed out waiting for confirmation");
}

type Result = { ok: true } | { ok: false; reason: string };

async function buyPackage(
  pkg: Package,
  status: PlayStatus,
): Promise<Result> {
  if (!status.treasury) return { ok: false, reason: "Payments not configured" };
  if (!status.wldPriceUsdc) return { ok: false, reason: "Price unavailable" };
  if (!isInWorldApp()) {
    return {
      ok: false,
      reason: "Open in World App to purchase",
    };
  }

  const wldFloat = pkg.usdcPrice / status.wldPriceUsdc;
  // 0.5% buffer so the on-chain amount stays above the server's 95% floor
  // even if the price ticks while the user confirms.
  const wldUnits = BigInt(Math.ceil(wldFloat * 1.005 * 1e18));

  const mk = MiniKit as unknown as {
    sendTransaction: (opts: {
      chainId: number;
      transactions: Array<{
        to: `0x${string}`;
        data: `0x${string}`;
        value?: `0x${string}`;
      }>;
    }) => Promise<
      | {
          executedWith?: "minikit" | "wagmi" | "fallback";
          data?: { userOpHash?: string };
          finalPayload?: {
            status?: string;
            error_code?: string;
            transaction_id?: string;
            transaction_hash?: string;
          };
        }
      | undefined
    >;
  };

  const result = await mk.sendTransaction({
    chainId: WORLD_CHAIN_ID,
    transactions: [
      {
        to: WLD_TOKEN_ADDRESS,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [status.treasury as `0x${string}`, wldUnits],
        }),
      },
    ],
  });

  const userOpHash =
    result?.data?.userOpHash ?? result?.finalPayload?.transaction_id;
  if (!userOpHash) {
    return {
      ok: false,
      reason: result?.finalPayload?.error_code ?? "Transaction cancelled",
    };
  }

  let txHash: string;
  try {
    txHash = await resolveUserOp(userOpHash);
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "Confirmation timed out",
    };
  }

  const verifyRes = await fetch("/api/play/buy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txHash, packageId: pkg.id }),
  });
  if (!verifyRes.ok) {
    const t = await verifyRes.text();
    return { ok: false, reason: t.slice(0, 160) };
  }
  return { ok: true };
}

export default function BuyPanel({
  status,
  onPurchased,
}: {
  status: PlayStatus;
  onPurchased: () => void;
}) {
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onPick = async (pkg: Package) => {
    setBusyId(pkg.id);
    setError(null);
    try {
      const res = await buyPackage(pkg, status);
      if (res.ok) onPurchased();
      else setError(res.reason);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setBusyId(null);
    }
  };

  const wldFor = (usdc: number) =>
    status.wldPriceUsdc ? (usdc / status.wldPriceUsdc).toFixed(3) : "—";

  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-stone-500 mb-2">
        Top up
      </div>
      <div className="grid grid-cols-3 gap-2">
        {PACKAGES.map((p) => {
          const busy = busyId === p.id;
          const disabled = busyId !== null && !busy;
          return (
            <button
              key={p.id}
              onClick={() => onPick(p)}
              disabled={busy || disabled}
              className="flex flex-col items-center justify-center gap-0.5 rounded-xl border border-stone-300 bg-white py-3 px-2 text-stone-900 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 transition-all"
            >
              <div className="font-serif font-bold text-xl tabular-nums leading-none">
                {p.rounds}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-stone-500">
                {p.rounds === 1 ? "round" : "rounds"}
              </div>
              <div className="text-xs font-semibold tabular-nums mt-1">
                ${p.usdcPrice.toFixed(2)}
              </div>
              <div className="text-[10px] text-stone-500 tabular-nums">
                ≈ {wldFor(p.usdcPrice)} WLD
              </div>
              {busy && (
                <div className="text-[10px] text-stone-500 mt-1">
                  Confirm…
                </div>
              )}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="mt-2 text-xs text-rose-700 text-center">{error}</p>
      )}
    </div>
  );
}
