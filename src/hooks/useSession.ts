"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { sessionMessage } from "@/lib/messages";

const KEY = "ponkr-session";

/** Wallet sign-in (free signature) used to unlock Club perks and per-wallet limits. */
export function useSession() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw && address && raw.toLowerCase().startsWith(address.toLowerCase())) setToken(raw);
      else setToken(null);
    } catch {
      setToken(null);
    }
  }, [address]);

  const signIn = useCallback(async () => {
    if (!address) throw new Error("Connect your wallet first");
    const issued = String(Date.now());
    const sig = await signMessageAsync({ message: sessionMessage(address, issued) });
    const t = `${address}.${issued}.${sig}`;
    try {
      localStorage.setItem(KEY, t);
    } catch {}
    setToken(t);
    return t;
  }, [address, signMessageAsync]);

  return { token, signIn, headers: token ? { "x-session": token } : ({} as Record<string, string>) };
}
