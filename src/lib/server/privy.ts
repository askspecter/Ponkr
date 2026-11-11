import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { getAddress, isAddress, type Address } from "viem";

const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";
const APP_SECRET = process.env.PRIVY_APP_SECRET || "";

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

export interface AuthedUser {
  userId: string;
  wallets: Address[];
}

const userCache = new Map<string, { at: number; wallets: Address[] }>();

/** Wallet addresses linked to a Privy user (embedded + external). Requires PRIVY_APP_SECRET. */
async function linkedWallets(userId: string): Promise<Address[]> {
  if (!APP_SECRET) return [];
  const hit = userCache.get(userId);
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.wallets;
  const r = await fetch(`https://auth.privy.io/api/v1/users/${encodeURIComponent(userId)}`, {
    headers: {
      authorization: "Basic " + Buffer.from(`${APP_ID}:${APP_SECRET}`).toString("base64"),
      "privy-app-id": APP_ID,
    },
    signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) return [];
  const u = (await r.json()) as { linked_accounts?: { type: string; address?: string; chain_type?: string }[] };
  const wallets = (u.linked_accounts ?? [])
    .filter((a) => a.type === "wallet" && a.address && isAddress(a.address))
    .map((a) => getAddress(a.address!));
  userCache.set(userId, { at: Date.now(), wallets });
  return wallets;
}

/** Verifies the `x-privy-token` header (Privy access token). */
export async function authUser(req: Request): Promise<AuthedUser | undefined> {
  const token = req.headers.get("x-privy-token");
  if (!token || !APP_ID) return undefined;
  try {
    jwks ??= createRemoteJWKSet(new URL(`https://auth.privy.io/api/v1/apps/${APP_ID}/jwks.json`));
    const { payload } = await jwtVerify(token, jwks, { issuer: "privy.io", audience: APP_ID });
    if (!payload.sub) return undefined;
    return { userId: payload.sub, wallets: await linkedWallets(payload.sub) };
  } catch {
    return undefined;
  }
}
