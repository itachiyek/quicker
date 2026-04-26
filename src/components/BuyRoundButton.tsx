"use client";

import { useState } from "react";
import { encodeFunctionData, erc20Abi } from "viem";
import { MiniKit } from "@worldcoin/minikit-js";
import type { PlayStatus } from "@/hooks/usePlayStatus";

const WLD_TOKEN_ADDRESS =
  "0x2cFc85d8E48F8EAB294be644d9E25C3030863003" as const;
const WORLD_CHAIN_ID = 480;

function isInWorldApp(): boolean {
  if (typeof window === "undefined") return false;
  const m = MiniKit as unknown as { isInWorldApp?: () => boolean };
  return typeof m.isInWorldApp === "function" ? !!m.isInWorldApp() : false;
}

type Result = { ok: true } | { ok: false; reason: string };

// Poll the World Developer Portal for the user op until it's mined and
// resolved to a real transaction hash. Returns the tx hash or throws.
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
        if (data.status === "success" && data.transaction_hash) {
          return data.transaction_hash;
        }
        if (data.status === "failed") {
          throw new Error("Transaction failed on chain");
        }
      }
    } catch {
      // network blip — retry
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error("Timed out waiting for confirmation");
}

export default function BuyRoundButton({
  status,
  onPurchased,
}: {
  status: PlayStatus;
  onPurchased: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBuy = async (): Promise<Result> => {
    if (!status.treasury) return { ok: false, reason: "Payments not configured" };
    if (!status.wldPerRound) return { ok: false, reason: "Price unavailable" };
    if (!isInWorldApp()) {
      return {
        ok: false,
        reason: "Open this app inside World App to purchase rounds.",
      };
    }

    // WLD has 18 decimals. Multiply by 1e18 and round up so rounding error
    // can never put us below the server-required minimum (5% slippage).
    const wldUnits = BigInt(
      Math.ceil(status.wldPerRound * 1.005 * 1e18),
    );

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
            data?: {
              userOpHash?: string;
              status?: string;
              transactionHash?: string;
            };
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

    setStage("Confirm in World App");
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
      const code =
        result?.finalPayload?.error_code ?? "Transaction cancelled";
      return { ok: false, reason: code };
    }

    setStage("Waiting for confirmation…");
    let txHash: string;
    try {
      txHash = await resolveUserOp(userOpHash);
    } catch (e) {
      return {
        ok: false,
        reason: e instanceof Error ? e.message : "Confirmation timed out",
      };
    }

    setStage("Verifying on-chain…");
    const verifyRes = await fetch("/api/play/buy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash }),
    });
    if (!verifyRes.ok) {
      const t = await verifyRes.text();
      return { ok: false, reason: t.slice(0, 160) };
    }
    return { ok: true };
  };

  const onClick = async () => {
    setBusy(true);
    setError(null);
    setStage(null);
    try {
      const res = await handleBuy();
      if (res.ok) {
        onPurchased();
      } else {
        setError(res.reason);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setBusy(false);
      setStage(null);
    }
  };

  const wldText = status.wldPerRound?.toFixed(3) ?? "—";
  const usdText = status.usdcPerRound.toFixed(2);

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={onClick}
        disabled={busy || !status.wldPerRound}
        className="btn-primary w-full"
      >
        {busy
          ? (stage ?? "Working…")
          : `Buy 1 round · ${wldText} WLD (≈ $${usdText})`}
      </button>
      {error && (
        <span className="text-xs text-rose-700 text-center">{error}</span>
      )}
      {status.wldPriceUpdatedAt && (
        <span className="text-[10px] text-stone-500 text-center">
          Price from DexScreener · updated{" "}
          {new Date(status.wldPriceUpdatedAt).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
