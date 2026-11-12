"use client";

import { createContext, useContext } from "react";
import type { Address } from "viem";

export interface AuthState {
  ready: boolean;
  authenticated: boolean;
  address?: Address;
  /** Human label for the signed-in account (email, @handle, or short address). */
  label?: string;
  login: () => void;
  logout: () => Promise<void>;
  /** Headers proving the session to our API (Privy access token). */
  authHeaders: () => Promise<Record<string, string>>;
  /** Wallets on the account: the embedded trading wallet and any external wallets. */
  wallets: { address: Address; kind: "embedded" | "external"; label: string }[];
  /** Makes a wallet the one used for signing. */
  useWallet: (address: Address) => Promise<void>;
}

export const AuthContext = createContext<AuthState>({
  ready: false,
  authenticated: false,
  login: () => {},
  logout: async () => {},
  authHeaders: async () => ({}),
  wallets: [],
  useWallet: async () => {},
});

export const useAuth = () => useContext(AuthContext);
