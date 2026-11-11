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
}

export const AuthContext = createContext<AuthState>({
  ready: false,
  authenticated: false,
  login: () => {},
  logout: async () => {},
  authHeaders: async () => ({}),
});

export const useAuth = () => useContext(AuthContext);
