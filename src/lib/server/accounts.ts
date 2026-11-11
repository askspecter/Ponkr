import "server-only";
import crypto from "node:crypto";
import { getAddress, parseEther, verifyMessage, type Address, type Hex } from "viem";
import { CLUB } from "../config";
import { apiKeyMessage } from "../messages";
import { rpc } from "./rpc";
import { load, save } from "./store";

// ---------- Club membership ----------

type Club = Record<string, { expiresAt: number; txs: string[] }>;

export function clubExpiry(address?: string): number {
  if (!address) return 0;
  return load<Club>("club", {})[address.toLowerCase()]?.expiresAt ?? 0;
}

export function isClub(address?: string) {
  return clubExpiry(address) > Date.now();
}

export async function verifyClubPayment(txHash: Hex, address: Address) {
  if (!CLUB.treasury) throw new Error("Club payments are not configured (NEXT_PUBLIC_TREASURY_ADDRESS).");
  const club = load<Club>("club", {});
  const used = Object.values(club).some((c) => c.txs.includes(txHash.toLowerCase()));
  if (used) throw new Error("This payment was already used.");
  const client = rpc();
  const [txn, receipt] = await Promise.all([
    client.getTransaction({ hash: txHash }),
    client.waitForTransactionReceipt({ hash: txHash, timeout: 30_000 }),
  ]);
  if (receipt.status !== "success") throw new Error("Payment transaction failed.");
  if (txn.from.toLowerCase() !== address.toLowerCase()) throw new Error("Payment must come from your connected wallet.");
  if (!txn.to || txn.to.toLowerCase() !== CLUB.treasury.toLowerCase()) throw new Error("Payment was not sent to the treasury.");
  const price = parseEther(CLUB.priceEth);
  if (txn.value < price) throw new Error(`Payment must be at least ${CLUB.priceEth} ETH.`);
  const periods = Number(txn.value / price);
  const key = address.toLowerCase();
  const base = Math.max(Date.now(), club[key]?.expiresAt ?? 0);
  club[key] = {
    expiresAt: base + periods * CLUB.periodDays * 86400_000,
    txs: [...(club[key]?.txs ?? []), txHash.toLowerCase()],
  };
  save("club", club);
  return club[key];
}

// ---------- Daily usage limits ----------

export function consume(bucket: string, identity: string, limit: number) {
  const day = new Date().toISOString().slice(0, 10);
  const name = `usage-${bucket}-${day}`;
  const u = load<Record<string, number>>(name, {});
  const used = u[identity] ?? 0;
  if (used >= limit) return { ok: false as const, used, limit };
  u[identity] = used + 1;
  save(name, u);
  return { ok: true as const, used: used + 1, limit };
}

export function usage(bucket: string, identity: string) {
  const day = new Date().toISOString().slice(0, 10);
  return load<Record<string, number>>(`usage-${bucket}-${day}`, {})[identity] ?? 0;
}

// ---------- API keys ----------

interface ApiKeyRecord {
  id: string;
  hash: string;
  prefix: string;
  owner: Address;
  name: string;
  createdAt: number;
  revoked?: boolean;
}

const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");


export async function createApiKey(owner: Address, nonce: string, signature: Hex, name: string) {
  const ts = Number(nonce);
  if (!ts || Math.abs(Date.now() - ts) > 10 * 60_000) throw new Error("Signature expired, try again.");
  const ok = await verifyMessage({ address: owner, message: apiKeyMessage(owner, nonce), signature });
  if (!ok) throw new Error("Invalid signature.");
  const keys = load<ApiKeyRecord[]>("api-keys", []);
  if (keys.filter((k) => k.owner.toLowerCase() === owner.toLowerCase() && !k.revoked).length >= 10) {
    throw new Error("Maximum of 10 active keys per wallet.");
  }
  const secret = "pk_" + crypto.randomBytes(24).toString("base64url");
  const rec: ApiKeyRecord = {
    id: crypto.randomUUID(),
    hash: sha(secret),
    prefix: secret.slice(0, 10),
    owner: getAddress(owner),
    name: (name || "default").slice(0, 40),
    createdAt: Date.now(),
  };
  keys.push(rec);
  save("api-keys", keys);
  return { key: secret, id: rec.id, prefix: rec.prefix };
}

export function listApiKeys(owner: string) {
  return load<ApiKeyRecord[]>("api-keys", [])
    .filter((k) => k.owner.toLowerCase() === owner.toLowerCase() && !k.revoked)
    .map(({ id, prefix, name, createdAt }) => ({ id, prefix, name, createdAt }));
}

export async function revokeApiKey(owner: Address, id: string, nonce: string, signature: Hex) {
  const ok = await verifyMessage({ address: owner, message: apiKeyMessage(owner, nonce), signature });
  if (!ok) throw new Error("Invalid signature.");
  const keys = load<ApiKeyRecord[]>("api-keys", []);
  const k = keys.find((x) => x.id === id && x.owner.toLowerCase() === owner.toLowerCase());
  if (!k) throw new Error("Key not found.");
  k.revoked = true;
  save("api-keys", keys);
}

/** Resolves X-API-Key / Bearer auth and enforces daily limits. */
export function authApiKey(req: Request) {
  const raw =
    req.headers.get("x-api-key") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  if (!raw) return { error: "Missing API key (X-API-Key header).", status: 401 } as const;
  const rec = load<ApiKeyRecord[]>("api-keys", []).find((k) => k.hash === sha(raw) && !k.revoked);
  if (!rec) return { error: "Invalid API key.", status: 401 } as const;
  const limit = isClub(rec.owner) ? CLUB.apiDailyClub : CLUB.apiDailyFree;
  const c = consume("api", rec.id, limit);
  if (!c.ok) return { error: `Daily API limit reached (${limit}/day).`, status: 429 } as const;
  return { key: rec, remaining: limit - c.used } as const;
}

export function clientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}
