"use client";

import { encodeFunctionData, erc20Abi } from "viem";
import { MiniKit } from "@worldcoin/minikit-js";

const WORLD_CHAIN_ID = 480;

export function isInWorldApp(): boolean {
  if (typeof window === "undefined") return false;
  const m = MiniKit as unknown as { isInWorldApp?: () => boolean };
  return typeof m.isInWorldApp === "function" ? !!m.isInWorldApp() : false;
}

export type DepositResult =
  | { ok: true; txHash: `0x${string}` }
  | { ok: false; reason: string };

/** Resolve a MiniKit userOpHash to a real on-chain transaction hash by
 *  polling the World Developer Portal. */
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

/** Send an ERC-20 transfer from inside World App and return the on-chain
 *  transaction hash once it's mined. */
export async function sendErc20Transfer(opts: {
  token: `0x${string}`;
  to: `0x${string}`;
  amountUnits: bigint;
}): Promise<DepositResult> {
  if (!isInWorldApp()) {
    return { ok: false, reason: "Open inside World App to deposit" };
  }

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

  let result;
  try {
    result = await mk.sendTransaction({
      chainId: WORLD_CHAIN_ID,
      transactions: [
        {
          to: opts.token,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "transfer",
            args: [opts.to, opts.amountUnits],
          }),
        },
      ],
    });
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "Send failed" };
  }

  const userOpHash =
    result?.data?.userOpHash ?? result?.finalPayload?.transaction_id;
  if (!userOpHash) {
    return {
      ok: false,
      reason: result?.finalPayload?.error_code ?? "Transaction cancelled",
    };
  }

  try {
    const txHash = await resolveUserOp(userOpHash);
    return { ok: true, txHash: txHash as `0x${string}` };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : "Confirmation timed out",
    };
  }
}
