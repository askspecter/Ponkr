"use client";

import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";
import { WagmiProvider as PrivyWagmiProvider, createConfig as createPrivyWagmiConfig, useSetActiveWallet } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { WagmiProvider, createConfig, http, useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { robinhoodChain, RPC_URL } from "@/lib/config";
import { shortAddr } from "@/lib/format";
import { AuthContext, type AuthState } from "@/hooks/useAuth";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const transports = { [robinhoodChain.id]: http(RPC_URL) };
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

function PrivyAuthBridge({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const { address } = useAccount();
  const { wallets: connected } = useWallets();
  const { setActiveWallet } = useSetActiveWallet();
  const value = useMemo<AuthState>(() => {
    const wallets = connected
      .filter((w) => w.type === "ethereum" || !("type" in w))
      .map((w) => ({
        address: w.address as `0x${string}`,
        kind: (w.walletClientType === "privy" ? "embedded" : "external") as "embedded" | "external",
        label: w.walletClientType === "privy" ? "Trading wallet" : titleCase(w.walletClientType.replace(/_/g, " ")),
      }));
    const label =
      user?.email?.address ||
      (user?.twitter?.username && `@${user.twitter.username}`) ||
      (user?.farcaster?.username && `@${user.farcaster.username}`) ||
      (user?.telegram?.username && `@${user.telegram.username}`) ||
      user?.phone?.number ||
      (address ? shortAddr(address) : undefined);
    return {
      ready,
      authenticated,
      address: authenticated ? address : undefined,
      label: label || undefined,
      login: () => login(),
      logout,
      authHeaders: async (): Promise<Record<string, string>> => {
        const t = authenticated ? await getAccessToken() : null;
        return t ? { "x-privy-token": t } : {};
      },
      wallets: authenticated ? wallets : [],
      useWallet: async (a) => {
        const w = connected.find((x) => x.address.toLowerCase() === a.toLowerCase());
        if (w) await setActiveWallet(w);
      },
    };
  }, [ready, authenticated, user, address, login, logout, getAccessToken, connected, setActiveWallet]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Local development without a Privy app id: plain browser-wallet connect. */
function InjectedAuthBridge({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const value = useMemo<AuthState>(
    () => ({
      ready: true,
      authenticated: isConnected,
      address,
      label: address ? shortAddr(address) : undefined,
      login: () => connect({ connector: injected() }),
      logout: async () => void (await disconnectAsync()),
      authHeaders: async () => ({}),
      wallets: address ? [{ address, kind: "external" as const, label: "Browser wallet" }] : [],
      useWallet: async () => {},
    }),
    [address, isConnected, connect, disconnectAsync],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const privyWagmi = createPrivyWagmiConfig({ chains: [robinhoodChain], transports, ssr: true });
const plainWagmi = createConfig({ chains: [robinhoodChain], transports, connectors: [injected()], ssr: true });

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }));

  if (!PRIVY_APP_ID) {
    return (
      <QueryClientProvider client={qc}>
        <WagmiProvider config={plainWagmi}>
          <InjectedAuthBridge>{children}</InjectedAuthBridge>
        </WagmiProvider>
      </QueryClientProvider>
    );
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["email", "sms", "twitter", "farcaster", "telegram", "wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#4d6bff",
          logo: "/icon.svg",
          landingHeader: "Sign in to Kekr",
          showWalletLoginFirst: false,
        },
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        defaultChain: robinhoodChain,
        supportedChains: [robinhoodChain],
      }}
    >
      <QueryClientProvider client={qc}>
        <PrivyWagmiProvider config={privyWagmi}>
          <PrivyAuthBridge>{children}</PrivyAuthBridge>
        </PrivyWagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

export function SignInButton({ className = "btn btn-primary" }: { className?: string }) {
  return (
    <AuthContext.Consumer>
      {(a) => (
        <button className={className} onClick={a.login} disabled={!a.ready}>
          Sign in
        </button>
      )}
    </AuthContext.Consumer>
  );
}
