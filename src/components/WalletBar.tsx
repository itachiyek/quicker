"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { MiniKit } from "@worldcoin/minikit-js";
import { useSession } from "@/hooks/useSession";

function buildSiweMessage(opts: {
  domain: string;
  uri: string;
  address: string;
  nonce: string;
  chainId: number;
  statement: string;
}) {
  const issuedAt = new Date().toISOString();
  return [
    `${opts.domain} wants you to sign in with your Ethereum account:`,
    opts.address,
    "",
    opts.statement,
    "",
    `URI: ${opts.uri}`,
    `Version: 1`,
    `Chain ID: ${opts.chainId}`,
    `Nonce: ${opts.nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");
}

const STATEMENT = "Sign in to Brain Trainer to track your scores.";

function isInWorldApp(): boolean {
  if (typeof window === "undefined") return false;
  const m = MiniKit as unknown as { isInWorldApp?: () => boolean };
  return typeof m.isInWorldApp === "function" ? !!m.isInWorldApp() : false;
}

async function signInWithMiniKit(nonce: string) {
  const mk = MiniKit as unknown as {
    walletAuth: (opts: {
      nonce: string;
      statement?: string;
      expirationTime?: Date;
    }) => Promise<
      | {
          executedWith?: "minikit" | "wagmi" | "fallback";
          data?: { address: string; message: string; signature: string };
          finalPayload?: {
            status?: string;
            error_code?: string;
            address?: string;
            message?: string;
            signature?: string;
          };
        }
      | undefined
    >;
  };
  const result = await mk.walletAuth({
    nonce,
    statement: STATEMENT,
    expirationTime: new Date(Date.now() + 1000 * 60 * 60),
  });
  const payload =
    result?.data ??
    (result?.finalPayload?.status === "success" ? result.finalPayload : undefined);
  if (!payload) {
    throw new Error(result?.finalPayload?.error_code ?? "Sign-in cancelled");
  }
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: "minikit", payload, nonce }),
  });
  if (!res.ok) throw new Error(await res.text());
}

export type WalletBarProps = {
  /** When true, render only the address chip + sign-out, no big sign-in button */
  compact?: boolean;
  /** Called once a wallet has been connected AND signed in */
  onSignedIn?: (wallet: string) => void;
};

export default function WalletBar({ compact = false, onSignedIn }: WalletBarProps) {
  const { wallet, refresh, logout } = useSession();
  const { address, isConnected, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inWorldApp = isInWorldApp();
  const attemptedRef = useRef<string | null>(null);
  const onSignedInRef = useRef(onSignedIn);
  onSignedInRef.current = onSignedIn;

  // Notify parent once we have a session.
  useEffect(() => {
    if (wallet) onSignedInRef.current?.(wallet);
  }, [wallet]);

  // Sign the SIWE message via wagmi after the user connects a wallet.
  const signWithWagmi = useCallback(
    async (addr: string) => {
      const r = await fetch("/api/auth/nonce");
      const { nonce } = (await r.json()) as { nonce: string };
      const message = buildSiweMessage({
        domain: window.location.host,
        uri: window.location.origin,
        address: addr,
        nonce,
        chainId: chainId ?? 1,
        statement: STATEMENT,
      });
      const signature = await signMessageAsync({ message });
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "wagmi",
          message,
          signature,
          address: addr,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
    },
    [chainId, signMessageAsync],
  );

  // Auto-trigger the SIWE step as soon as the user connects, so they only
  // tap "Connect Wallet" once.
  useEffect(() => {
    if (!isConnected || !address) return;
    if (wallet && wallet.toLowerCase() === address.toLowerCase()) return;
    if (attemptedRef.current === address) return;
    attemptedRef.current = address;
    setError(null);
    setBusy(true);
    signWithWagmi(address)
      .then(() => refresh())
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Sign-in failed");
        attemptedRef.current = null;
        disconnect();
      })
      .finally(() => setBusy(false));
  }, [isConnected, address, wallet, signWithWagmi, refresh, disconnect]);

  const handleClick = useCallback(async () => {
    setError(null);
    if (inWorldApp) {
      setBusy(true);
      try {
        const r = await fetch("/api/auth/nonce");
        const { nonce } = (await r.json()) as { nonce: string };
        await signInWithMiniKit(nonce);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Sign-in failed");
      } finally {
        setBusy(false);
      }
      return;
    }

    // Outside World App → open RainbowKit; the auto-sign effect picks it up.
    if (!isConnected) {
      openConnectModal?.();
      return;
    }
    // Already connected but not signed in → trigger a sign manually.
    if (address) {
      attemptedRef.current = null;
      setBusy(true);
      try {
        await signWithWagmi(address);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Sign-in failed");
      } finally {
        setBusy(false);
      }
    }
  }, [
    address,
    inWorldApp,
    isConnected,
    openConnectModal,
    refresh,
    signWithWagmi,
  ]);

  const short = wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : null;

  if (wallet) {
    return (
      <div className="flex items-center gap-2">
        <span className="btn-ghost font-mono text-xs">{short}</span>
        {!compact && (
          <button
            onClick={async () => {
              await logout();
              disconnect();
            }}
            className="btn-ghost text-xs"
          >
            Sign out
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={busy}
        className="btn-primary text-sm py-2 px-4"
      >
        {busy ? "Signing in…" : inWorldApp ? "Sign in with World" : "Connect Wallet"}
      </button>
      {error && (
        <span className="text-xs text-rose-700 max-w-[60vw] text-right break-words">
          {error}
        </span>
      )}
    </div>
  );
}
