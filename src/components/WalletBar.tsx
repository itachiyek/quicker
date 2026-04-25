"use client";

import { useEffect, useRef } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useSignMessage, useDisconnect } from "wagmi";
import { useSession } from "@/hooks/useSession";

function buildMessage(opts: {
  domain: string;
  uri: string;
  address: string;
  nonce: string;
  chainId: number;
}) {
  const issuedAt = new Date().toISOString();
  return [
    `${opts.domain} wants you to sign in with your Ethereum account:`,
    opts.address,
    "",
    "Sign in to Brain Trainer to track your scores.",
    "",
    `URI: ${opts.uri}`,
    `Version: 1`,
    `Chain ID: ${opts.chainId}`,
    `Nonce: ${opts.nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");
}

export default function WalletBar() {
  const { address, isConnected, chainId } = useAccount();
  const { signMessageAsync, isPending: signing } = useSignMessage();
  const { disconnect } = useDisconnect();
  const { wallet, refresh } = useSession();
  const attemptedRef = useRef<string | null>(null);

  // When the user connects but isn't signed in yet, prompt them to sign once.
  useEffect(() => {
    if (!isConnected || !address) return;
    if (wallet && wallet.toLowerCase() === address.toLowerCase()) return;
    if (attemptedRef.current === address) return;
    attemptedRef.current = address;

    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/auth/nonce");
        const { nonce } = (await r.json()) as { nonce: string };
        if (cancelled) return;
        const message = buildMessage({
          domain: window.location.host,
          uri: window.location.origin,
          address,
          nonce,
          chainId: chainId ?? 1,
        });
        const signature = await signMessageAsync({ message });
        if (cancelled) return;
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, signature, address }),
        });
        if (!res.ok) throw new Error(await res.text());
        if (!cancelled) refresh();
      } catch {
        // user rejected or error — disconnect so the flow can be retried cleanly
        attemptedRef.current = null;
        if (!cancelled) disconnect();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, wallet]);

  return (
    <div className="flex items-center gap-2">
      <ConnectButton
        accountStatus="address"
        chainStatus="none"
        showBalance={false}
      />
      {isConnected && !wallet && (
        <span className="text-xs text-stone-500 whitespace-nowrap">
          {signing ? "Signiere…" : "Bitte signieren"}
        </span>
      )}
    </div>
  );
}
