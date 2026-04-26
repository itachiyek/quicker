"use client";

import { http, createConfig, fallback } from "wagmi";
import { mainnet, base, optimism, arbitrum } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";

const wcProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const connectors = [
  injected({ shimDisconnect: true }),
  coinbaseWallet({ appName: "Quicker" }),
  ...(wcProjectId
    ? [
        walletConnect({
          projectId: wcProjectId,
          showQrModal: true,
          metadata: {
            name: "Quicker",
            description: "Brain Age-style mental math game",
            url: "https://quicker-one.vercel.app",
            icons: [],
          },
        }),
      ]
    : []),
];

export const wagmiConfig = createConfig({
  chains: [mainnet, base, optimism, arbitrum],
  connectors,
  transports: {
    [mainnet.id]: fallback([http()]),
    [base.id]: fallback([http()]),
    [optimism.id]: fallback([http()]),
    [arbitrum.id]: fallback([http()]),
  },
  ssr: true,
});
