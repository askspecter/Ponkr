"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, darkTheme, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, http } from "wagmi";
import { robinhoodChain, RPC_URL } from "@/lib/config";
import { useState } from "react";

const config = getDefaultConfig({
  appName: "Ponkr",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "00000000000000000000000000000000",
  chains: [robinhoodChain],
  transports: { [robinhoodChain.id]: http(RPC_URL) },
  ssr: true,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }));
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={qc}>
        <RainbowKitProvider theme={darkTheme({ accentColor: "#b6ff3b", accentColorForeground: "#0b0f02", borderRadius: "medium" })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
