import "server-only";
import crypto from "node:crypto";
import { formatUnits, getAddress, isAddress, parseUnits, verifyMessage, type Address, type Hex } from "viem";
import { tokenAbi } from "../abis";
import { CLUB } from "../config";
import { apiKeyMessage } from "../messages";
import { rpc } from "./rpc";
import { kvGet, kvIncr, kvSet } from "./store";

// ---------- Club membership (token gated) ----------

const ALLOWLIST = new Set(
  (process.env.CLUB_ALLOWLIST || "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean),
);
const holdCache = new Map<string, { at: number; balance: bigint }>();
let decimalsCache: number | undefined;

export interface ClubStatus {
  club: boolean;
  /** Wallet that qualifies (or the first wallet checked). */
  wallet?: Address;
  /** Official token balance in whole tokens. */
  balance: number;
  required: number;
  symbol: string;
  token: string;
  allowlisted: boolean;
}

async function officialBalance(addr: Address): Promise<bigint> {
  if (!CLUB.token) return 0n;
  const key = addr.toLowerCase();
  const hit = holdCache.get(key);
  if (hit && Date.now() - hit.at < 30_000) return hit.balance;
  const balance = await rpc().readContract({ address: CLUB.token as Address, abi: tokenAbi, functionName: "balanceOf", args: [addr] });
  holdCache.set(key, { at: Date.now(), balance });
  return balance;
}

async function officialDecimals() {
  if (decimalsCache === undefined && CLUB.token) {
    decimalsCache = Number(await rpc().readContract({ address: CLUB.token as Address, abi: tokenAbi, functionName: "decimals" }).catch(() => 18));
  }
  return decimalsCache ?? 18;
}

/** Club if any of the wallets holds >= CLUB.minHold official tokens (or is allowlisted). */
export async function clubStatus(wallets: (Address | string | undefined)[]): Promise<ClubStatus> {
  const list = wallets.filter((w): w is string => !!w && isAddress(w)).map((w) => getAddress(w));
  const base = { required: CLUB.minHold, symbol: CLUB.symbol, token: CLUB.token };
  const allow = list.find((w) => ALLOWLIST.has(w.toLowerCase()));
  if (allow) return { ...base, club: true, wallet: allow, balance: 0, allowlisted: true };
  if (!CLUB.token || !list.length) return { ...base, club: false, wallet: list[0], balance: 0, allowlisted: false };
  const dec = await officialDecimals();
  const need = parseUnits(String(CLUB.minHold), dec);
  let best = { wallet: list[0], bal: 0n };
  for (const w of list) {
    const bal = await officialBalance(w).catch(() => 0n);
    if (bal > best.bal) best = { wallet: w, bal };
  }
  return { ...base, club: best.bal >= need, wallet: best.wallet, balance: Number(formatUnits(best.bal, dec)), allowlisted: false };
}

export async function isClub(address?: string) {
  return (await clubStatus([address])).club;
}

export function clubRequirementText() {
  return CLUB.token
    ? `Launching is for Club members. Hold at least ${CLUB.minHold.toLocaleString("en-US")} $${CLUB.symbol} in your wallet to join.`
    : `Launching opens to Club members once $${CLUB.symbol} is live. Club means holding at least ${CLUB.minHold.toLocaleString("en-US")} $${CLUB.symbol}.`;
}

/** Throws a user facing error unless one of the wallets is Club. */
export async function requireClub(wallets: (Address | string | undefined)[]) {
  const st = await clubStatus(wallets);
  if (!st.club) {
    const have = st.balance ? ` You hold ${Math.floor(st.balance).toLocaleString("en-US")}.` : "";
    throw new Error(clubRequirementText() + have);
  }
  return st;
}

// ---------- Daily usage limits ----------

const today = () => new Date().toISOString().slice(0, 10);

export async function consume(bucket: string, identity: string, limit: number) {
  const used = await kvIncr(`usage:${bucket}:${today()}:${identity}`, 2 * 86400);
  if (used > limit) return { ok: false as const, used: limit, limit };
  return { ok: true as const, used, limit };
}

export async function usage(bucket: string, identity: string) {
  return Number(await kvGet(`usage:${bucket}:${today()}:${identity}`, 0));
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
const ownerKey = (owner: string) => `apikeys:${owner.toLowerCase()}`;

export async function createApiKey(owner: Address, nonce: string, signature: Hex, name: string) {
  const ts = Number(nonce);
  if (!ts || Math.abs(Date.now() - ts) > 10 * 60_000) throw new Error("Signature expired, try again.");
  const ok = await verifyMessage({ address: owner, message: apiKeyMessage(owner, nonce), signature });
  if (!ok) throw new Error("Invalid signature.");
  const keys = await kvGet<ApiKeyRecord[]>(ownerKey(owner), []);
  if (keys.filter((k) => !k.revoked).length >= 10) throw new Error("Maximum of 10 active keys per wallet.");
  const secret = "pk_" + crypto.randomBytes(24).toString("base64url");
  const rec: ApiKeyRecord = {
    id: crypto.randomUUID(),
    hash: sha(secret),
    prefix: secret.slice(0, 10),
    owner: getAddress(owner),
    name: (name || "default").slice(0, 40),
    createdAt: Date.now(),
  };
  await kvSet(`apikey:${rec.hash}`, rec);
  await kvSet(ownerKey(owner), [...keys, rec]);
  return { key: secret, id: rec.id, prefix: rec.prefix };
}

export async function listApiKeys(owner: string) {
  return (await kvGet<ApiKeyRecord[]>(ownerKey(owner), []))
    .filter((k) => !k.revoked)
    .map(({ id, prefix, name, createdAt }) => ({ id, prefix, name, createdAt }));
}

export async function revokeApiKey(owner: Address, id: string, nonce: string, signature: Hex) {
  const ok = await verifyMessage({ address: owner, message: apiKeyMessage(owner, nonce), signature });
  if (!ok) throw new Error("Invalid signature.");
  const keys = await kvGet<ApiKeyRecord[]>(ownerKey(owner), []);
  const k = keys.find((x) => x.id === id);
  if (!k) throw new Error("Key not found.");
  k.revoked = true;
  await kvSet(`apikey:${k.hash}`, k);
  await kvSet(ownerKey(owner), keys);
}

/** Resolves X-API-Key / Bearer auth and enforces daily limits. */
export async function authApiKey(req: Request) {
  const raw =
    req.headers.get("x-api-key") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  if (!raw) return { error: "Missing API key (X-API-Key header).", status: 401 } as const;
  const rec = await kvGet<ApiKeyRecord | null>(`apikey:${sha(raw)}`, null);
  if (!rec || rec.revoked) return { error: "Invalid API key.", status: 401 } as const;
  const limit = (await isClub(rec.owner)) ? CLUB.apiDailyClub : CLUB.apiDailyFree;
  const c = await consume("api", rec.id, limit);
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
