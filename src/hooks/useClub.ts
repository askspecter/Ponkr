"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

export interface ClubInfo {
  club: boolean;
  wallet?: string;
  balance: number;
  required: number;
  symbol: string;
  token: string;
  allowlisted: boolean;
  messagesUsed: number;
  freeLimit: number;
  sponsoredLaunches: boolean;
}

export function useClub() {
  const { address, authHeaders, authenticated } = useAuth();
  return useQuery({
    queryKey: ["club-status", address, authenticated],
    queryFn: async () => {
      const r = await fetch(`/api/club/status${address ? `?address=${address}` : ""}`, { headers: await authHeaders() });
      return (await r.json()) as ClubInfo;
    },
    refetchInterval: 30_000,
  });
}
