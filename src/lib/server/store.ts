import "server-only";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Two layers of persistence:
 *
 * 1. `load` / `save`: a synchronous JSON-file cache for data derived from the chain (the launch
 *    index, trade history). Losing it only costs a re-sync, so on Vercel it lives in /tmp.
 * 2. `kv*`: durable user data (API keys, jobs, threads, usage counters, quotas). Uses Redis over
 *    REST when configured (Upstash / Vercel Marketplace: KV_REST_API_URL + KV_REST_API_TOKEN, or
 *    UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN), otherwise falls back to the file store,
 *    which is fine for a single server but NOT durable on Vercel.
 */

// On Vercel the project directory is read-only; only /tmp is writable (and it is per instance).
const DATA_DIR =
  process.env.DATA_DIR || (process.env.VERCEL ? path.join(os.tmpdir(), "ponkr-data") : path.join(process.cwd(), ".data"));

const cache = new Map<string, unknown>();
const timers = new Map<string, NodeJS.Timeout>();

function file(name: string) {
  return path.join(DATA_DIR, `${name.replace(/[^a-zA-Z0-9._-]/g, "_")}.json`);
}

export function load<T>(name: string, fallback: T): T {
  if (cache.has(name)) return cache.get(name) as T;
  let v = fallback;
  try {
    v = JSON.parse(fs.readFileSync(file(name), "utf8")) as T;
  } catch {
    /* first run */
  }
  cache.set(name, v);
  return v;
}

export function save<T>(name: string, value: T) {
  cache.set(name, value);
  clearTimeout(timers.get(name));
  timers.set(
    name,
    setTimeout(() => {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        const tmp = file(name) + ".tmp";
        fs.writeFileSync(tmp, JSON.stringify(value));
        fs.renameSync(tmp, file(name));
      } catch (e) {
        console.error("store save failed", name, e);
      }
    }, 250),
  );
}

// ---------------------------------------------------------------------------
// Durable key-value store
// ---------------------------------------------------------------------------

const R_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const R_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const PREFIX = "ponkr:";

export const kvDurable = () => Boolean(R_URL && R_TOKEN);

if (process.env.VERCEL && !kvDurable()) {
  console.warn("[kekr] No Redis configured: API keys, jobs and limits will not persist on Vercel.");
}

async function redis<T = unknown>(cmd: (string | number)[]): Promise<T> {
  const r = await fetch(R_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${R_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  const j = (await r.json()) as { result?: T; error?: string };
  if (!r.ok || j.error) throw new Error(`redis ${cmd[0]} failed: ${j.error ?? r.status}`);
  return j.result as T;
}

type FileKv = { v: unknown; exp?: number };
function fileGet(key: string): FileKv | undefined {
  const rec = load<FileKv | null>(`kv-${key}`, null);
  if (!rec) return undefined;
  if (rec.exp && rec.exp < Date.now()) return undefined;
  return rec;
}

export async function kvGet<T>(key: string, fallback: T): Promise<T> {
  if (!kvDurable()) return (fileGet(key)?.v as T) ?? fallback;
  const raw = await redis<string | null>(["GET", PREFIX + key]);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as T;
  }
}

export async function kvSet(key: string, value: unknown, ttlSec?: number) {
  if (!kvDurable()) return save(`kv-${key}`, { v: value, exp: ttlSec ? Date.now() + ttlSec * 1000 : undefined });
  const cmd: (string | number)[] = ["SET", PREFIX + key, JSON.stringify(value)];
  if (ttlSec) cmd.push("EX", ttlSec);
  await redis(cmd);
}

/** Atomic counter; the TTL is set when the key is first created. */
export async function kvIncr(key: string, ttlSec: number): Promise<number> {
  if (!kvDurable()) {
    const n = Number(fileGet(key)?.v ?? 0) + 1;
    save(`kv-${key}`, { v: n, exp: fileGet(key)?.exp ?? Date.now() + ttlSec * 1000 });
    return n;
  }
  const n = await redis<number>(["INCR", PREFIX + key]);
  if (n === 1) await redis(["EXPIRE", PREFIX + key, ttlSec]);
  return n;
}

/** Atomic add (delta may be negative). Optional TTL is applied when the key is created. */
export async function kvIncrBy(key: string, delta: number, ttlSec?: number): Promise<number> {
  const d = Math.round(delta);
  if (!kvDurable()) {
    const prev = fileGet(key);
    const n = Number(prev?.v ?? 0) + d;
    save(`kv-${key}`, { v: n, exp: prev?.exp ?? (ttlSec ? Date.now() + ttlSec * 1000 : undefined) });
    return n;
  }
  const n = await redis<number>(["INCRBY", PREFIX + key, d]);
  if (ttlSec && n === d) await redis(["EXPIRE", PREFIX + key, ttlSec]);
  return n;
}

export async function kvMGetNumbers(keys: string[]): Promise<number[]> {
  if (!keys.length) return [];
  if (!kvDurable()) return keys.map((k) => Number(fileGet(k)?.v ?? 0));
  const res = await redis<(string | null)[]>(["MGET", ...keys.map((k) => PREFIX + k)]);
  return res.map((v) => Number(v ?? 0));
}

export async function kvSIsMember(key: string, member: string): Promise<boolean> {
  if (!kvDurable()) return ((fileGet(key)?.v as string[]) ?? []).includes(member);
  return (await redis<number>(["SISMEMBER", PREFIX + key, member])) === 1;
}

export async function kvSAdd(key: string, member: string) {
  if (!kvDurable()) {
    const cur = (fileGet(key)?.v as string[]) ?? [];
    if (!cur.includes(member)) save(`kv-${key}`, { v: [...cur, member] });
    return;
  }
  await redis(["SADD", PREFIX + key, member]);
}

export async function kvSMembers(key: string): Promise<string[]> {
  if (!kvDurable()) return (fileGet(key)?.v as string[]) ?? [];
  return (await redis<string[]>(["SMEMBERS", PREFIX + key])) ?? [];
}
