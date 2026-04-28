"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { parseUnits } from "viem";
import { sendErc20Transfer, isInWorldApp } from "@/lib/worldDeposit";

const WLD_TOKEN_ADDRESS =
  "0x2cFc85d8E48F8EAB294be644d9E25C3030863003" as const;

const SYMBOL_OPTIONS: ("WLD" | "USDC")[] = ["WLD", "USDC"];
const QUICK_AMOUNTS = [0.05, 0.5, 1, 5];

function decimalsFor(s: "WLD" | "USDC") {
  return s === "WLD" ? 18 : 6;
}

export default function CreateLobbySheet({
  onClose,
}: {
  onClose: () => void;
}) {
  const router = useRouter();
  const [token, setToken] = useState<"WLD" | "USDC">("WLD");
  const [amount, setAmount] = useState("0.05");
  const [escrow, setEscrow] = useState<string | null>(null);
  const [usdcAddr, setUsdcAddr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/lobby/escrow", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { escrow?: string; usdc?: string } | null) => {
        if (d?.escrow) setEscrow(d.escrow);
        if (d?.usdc) setUsdcAddr(d.usdc);
      })
      .catch(() => {});
  }, []);

  const tokenAddress: `0x${string}` =
    token === "WLD"
      ? WLD_TOKEN_ADDRESS
      : ((usdcAddr ?? "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1") as `0x${string}`);

  const onCreate = async () => {
    setError(null);
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0.05) {
      setError("Minimum stake is 0.05");
      return;
    }
    if (!escrow) {
      setError("Escrow not configured");
      return;
    }
    if (!isInWorldApp()) {
      setError("Open inside World App to deposit");
      return;
    }

    const amountUnits = parseUnits(String(amt), decimalsFor(token));

    setBusy("deposit");
    const dep = await sendErc20Transfer({
      token: tokenAddress,
      to: escrow as `0x${string}`,
      amountUnits,
    });
    if (!dep.ok) {
      setError(dep.reason);
      setBusy(null);
      return;
    }

    setBusy("confirm");
    try {
      const r = await fetch("/api/lobby/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenSymbol: token,
          amount: amt,
          txHash: dep.txHash,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? `HTTP ${r.status}`);
      }
      const d = (await r.json()) as { id: string };
      router.push(`/battles/${d.id}`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center"
      onClick={busy ? undefined : onClose}
    >
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl shadow-xl p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 bg-stone-300 rounded-full mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-extrabold italic tracking-tight">
          Create lobby
        </h2>
        <p className="text-stone-600 text-sm mt-1">
          Stake is taken on confirm. You play right after.
        </p>

        <div className="grid grid-cols-2 gap-2 mt-4">
          {SYMBOL_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setToken(s)}
              disabled={!!busy}
              className={`rounded-xl border py-2.5 font-semibold transition-all ${
                token === s
                  ? "bg-stone-900 text-white border-stone-900"
                  : "bg-white text-stone-700 border-stone-300"
              } disabled:opacity-50`}
            >
              {s}
            </button>
          ))}
        </div>

        <label className="text-[10px] uppercase tracking-wider text-stone-500 mt-4 block">
          Stake per player
        </label>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) =>
            setAmount(e.target.value.replace(/[^0-9.]/g, ""))
          }
          disabled={!!busy}
          className="w-full mt-1 px-4 py-3 rounded-xl border border-stone-300 bg-white text-2xl font-serif tabular-nums disabled:opacity-50"
        />
        <div className="grid grid-cols-4 gap-2 mt-2">
          {QUICK_AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => setAmount(String(a))}
              disabled={!!busy}
              className="chip !text-sm disabled:opacity-50"
            >
              {a}
            </button>
          ))}
        </div>

        <button
          onClick={onCreate}
          disabled={!!busy || !escrow}
          className="btn-primary w-full mt-5"
        >
          {busy === "deposit"
            ? "Confirm in World App…"
            : busy === "confirm"
              ? "Verifying…"
              : `Stake ${amount || "0"} ${token}`}
        </button>

        {error && (
          <p className="mt-3 text-xs text-rose-700 text-center break-words">
            {error}
          </p>
        )}

        {!isInWorldApp() && (
          <p className="mt-3 text-[11px] text-stone-500 text-center">
            Open inside World App to deposit.
          </p>
        )}
      </div>
    </div>
  );
}
