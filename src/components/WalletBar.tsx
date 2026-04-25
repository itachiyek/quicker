"use client";

import { useCallback, useState } from "react";
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

export default function WalletBar({ compact = false }: { compact?: boolean }) {
  const { wallet, refresh, logout } = useSession();
  const { address, isConnected, chainId } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isInWorldApp =
    typeof window !== "undefined" &&
    typeof (MiniKit as unknown as { isInWorldApp?: () => boolean })
      .isInWorldApp === "function" &&
    (MiniKit as unknown as { isInWorldApp: () => boolean }).isInWorldApp();

  const handleSignIn = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const r = await fetch("/api/auth/nonce");
      const { nonce } = (await r.json()) as { nonce: string };

      // Path A — inside World App: use MiniKit's walletAuth.
      if (isInWorldApp) {
        // Cast to a minimal callable shape; the SDK types are over-narrow.
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
        // Newer SDK returns {executedWith, data}; older shapes use finalPayload.
        const payload =
          result?.data ??
          (result?.finalPayload?.status === "success"
            ? result.finalPayload
            : undefined);
        if (!payload) {
          throw new Error(
            result?.finalPayload?.error_code ?? "Sign-in cancelled",
          );
        }
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "minikit",
            payload,
            nonce,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        await refresh();
        return;
      }

      // Path B — regular browser/EOA wallet via wagmi+RainbowKit.
      let walletAddress = address;
      if (!isConnected || !walletAddress) {
        // Open RainbowKit modal so the user picks a wallet.
        if (!openConnectModal) throw new Error("Connect modal unavailable");
        openConnectModal();
        // We can't await the modal — bail and let user click again.
        return;
      }
      const message = buildSiweMessage({
        domain: window.location.host,
        uri: window.location.origin,
        address: walletAddress,
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
          address: walletAddress,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
      // Disconnect dangling EOA so the next click can retry cleanly.
      if (isConnected && !wallet) disconnect();
    } finally {
      setBusy(false);
    }
  }, [
    address,
    chainId,
    disconnect,
    isConnected,
    isInWorldApp,
    openConnectModal,
    refresh,
    signMessageAsync,
    wallet,
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
        onClick={handleSignIn}
        disabled={busy}
        className="btn-primary text-sm py-2 px-4"
      >
        {busy ? "Signing in…" : isInWorldApp ? "Sign in with World" : "Connect Wallet"}
      </button>
      {error && (
        <span className="text-xs text-rose-700 max-w-[60vw] text-right">
          {error}
        </span>
      )}
    </div>
  );
}
