"use client";

import { useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { wagmiConfig } from "@/lib/wagmi";
import { MiniKit } from "@worldcoin/minikit-js";
import { SessionProvider } from "@/hooks/useSession";
import { installUnlockListeners } from "@/lib/sounds";
import { REF_STORAGE_KEY, isLikelyWallet } from "@/lib/worldApp";
import "@rainbow-me/rainbowkit/styles.css";

function ClientInit() {
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = MiniKit as unknown as { install?: (appId?: string) => unknown };
      if (typeof m.install === "function") {
        m.install();
      }
    } catch {
      /* ignore */
    }
    installUnlockListeners();

    // Capture an inbound referral code so it survives the sign-in flow.
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref && isLikelyWallet(ref)) {
        const existing = window.localStorage.getItem(REF_STORAGE_KEY);
        if (!existing) {
          window.localStorage.setItem(REF_STORAGE_KEY, ref.toLowerCase());
        }
      }
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({
            accentColor: "#1c1917",
            accentColorForeground: "#ffffff",
            borderRadius: "medium",
          })}
          modalSize="compact"
        >
          <ClientInit />
          <SessionProvider>{children}</SessionProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
