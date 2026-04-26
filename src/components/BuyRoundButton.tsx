"use client";

import { useState } from "react";
import { MiniKit } from "@worldcoin/minikit-js";
import type { PlayStatus } from "@/hooks/usePlayStatus";

function isInWorldApp(): boolean {
  if (typeof window === "undefined") return false;
  const m = MiniKit as unknown as { isInWorldApp?: () => boolean };
  return typeof m.isInWorldApp === "function" ? !!m.isInWorldApp() : false;
}

type Result = { ok: true } | { ok: false; reason: string };

export default function BuyRoundButton({
  status,
  onPurchased,
}: {
  status: PlayStatus;
  onPurchased: () => void;
}) {
  const [busy, setBusy] = useState(false);
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

    // Generate a fresh reference so World can correlate the request.
    const reference =
      "rnd_" +
      Math.random().toString(36).slice(2, 10) +
      Date.now().toString(36);

    const mk = MiniKit as unknown as {
      pay: (opts: {
        reference: string;
        to: string;
        tokens: Array<{ symbol: "WLD"; token_amount: string }>;
        description: string;
      }) => Promise<
        | {
            finalPayload?: {
              status?: string;
              transaction_id?: string;
              transaction_hash?: string;
              error_code?: string;
            };
          }
        | undefined
      >;
    };

    // World expects token_amount in the smallest decimal unit (1e18 for WLD).
    const wldAmount = BigInt(
      Math.ceil(status.wldPerRound * 1e18),
    ).toString();

    const result = await mk.pay({
      reference,
      to: status.treasury,
      tokens: [{ symbol: "WLD", token_amount: wldAmount }],
      description: "1 round of Brain Trainer",
    });

    const fp = result?.finalPayload;
    if (!fp || fp.status !== "success") {
      return {
        ok: false,
        reason: fp?.error_code ?? "Payment cancelled",
      };
    }
    const txHash = fp.transaction_hash;
    if (!txHash) {
      return { ok: false, reason: "No transaction hash returned" };
    }

    const verifyRes = await fetch("/api/play/buy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ txHash }),
    });
    if (!verifyRes.ok) {
      const t = await verifyRes.text();
      return { ok: false, reason: t.slice(0, 120) };
    }
    return { ok: true };
  };

  const onClick = async () => {
    setBusy(true);
    setError(null);
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
          ? "Confirm in World App…"
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
