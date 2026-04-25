"use client";

import { useEffect, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { wagmiConfig } from "@/lib/wagmi";
import { MiniKit } from "@worldcoin/minikit-js";
import "@rainbow-me/rainbowkit/styles.css";

function MiniKitInit() {
  useEffect(() => {
    try {
      // Calling install() makes MiniKit listen to messages from World App.
      // It's a no-op outside the World App webview.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = MiniKit as unknown as { install?: (appId?: string) => unknown };
      if (typeof m.install === "function") {
        m.install();
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
          <MiniKitInit />
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
