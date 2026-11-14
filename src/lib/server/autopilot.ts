import "server-only";
import crypto from "node:crypto";
import { createWalletClient, formatEther, getAddress, http, parseEther, type Address, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { robinhoodChain } from "../config";
import { erc20Abi } from "viem";
import { tokenAbi } from "../abis";
import { ensureLaunch, findLaunch } from "./indexer";
import { rpc, SERVER_RPC } from "./rpc";
import { kvGet, kvIncr, kvSAdd, kvSet, kvSMembers, kvDurable } from "./store";
import { listTokens, resolveToken, tokenSummary, type TokenView } from "./tokens";
import { buildBuy, buildSell } from "./tx";

/**
 * Autopilot: each user gets a separate wallet that Kekr can sign with. The user funds it with a
 * budget; rules (buy below, sell above, follow a creator) run on a schedule within daily limits.
 * Funds can only ever be withdrawn back to the owner's own wallet.
 */

export type Metric = "mcapUsd" | "priceUsd" | "progress";
export type Op = "lte" | "gte";

export type Rule =
  | { kind: "buy"; token: Address; symbol: string; ethAmount: number; when: { metric: Metric; op: Op; value: number } }
  | { kind: "sell"; token: Address; symbol: string; percent: number; when: { metric: Metric; op: Op; value: number } }
  | { kind: "follow"; creator: Address; ethAmount: number; maxBuys: number; bought: string[]; fromBlock: string };

export type RuleRecord = Rule & {
  id: string;
  status: "active" | "done" | "cancelled" | "failed";
  createdAt: number;
  firedAt?: number;
  txHash?: string;
  lastError?: string;
  note?: string;
};

export interface Settings {
  dailyLimitEth: number;
  paused: boolean;
}

const MAX_TRADE_ETH = 0.1;
const MAX_RULES = 20;
const GAS_RESERVE = parseEther("0.0003");
const DEFAULTS: Settings = { dailyLimitEth: 0.05, paused: false };

const SECRET = process.env.AUTOPILOT_SECRET || "";
export const autopilotEnabled = () => SECRET.length >= 16 && kvDurable();

const k = (owner: string) => owner.toLowerCase();
const day = () => new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Key storage: AES-256-GCM with a key derived from AUTOPILOT_SECRET. The KV alone cannot
// decrypt a wallet; both the store and the server secret are needed.

const aesKey = () => crypto.createHash("sha256").update("kekr-autopilot:" + SECRET).digest();

function seal(pk: Hex): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", aesKey(), iv);
  const enc = Buffer.concat([c.update(pk, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}

function open(sealed: string): Hex {
  const [iv, tag, enc] = sealed.split(".").map((s) => Buffer.from(s, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", aesKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8") as Hex;
}

interface WalletRecord { address: Address; sealed: string; createdAt: number }

export async function autopilotWallet(owner: Address, create = false): Promise<Address | undefined> {
  const rec = await kvGet<WalletRecord | null>(`autopilot:wallet:${k(owner)}`, null);
  if (rec) return rec.address;
  if (!create) return undefined;
  const pk = generatePrivateKey();
  const address = privateKeyToAccount(pk).address;
  await kvSet(`autopilot:wallet:${k(owner)}`, { address, sealed: seal(pk), createdAt: Date.now() } satisfies WalletRecord);
  await kvSAdd("autopilot:owners", k(owner));
  return address;
}

async function signer(owner: Address) {
  const rec = await kvGet<WalletRecord | null>(`autopilot:wallet:${k(owner)}`, null);
  if (!rec) throw new Error("Autopilot wallet not set up.");
  const account = privateKeyToAccount(open(rec.sealed));
  return createWalletClient({ account, chain: robinhoodChain, transport: http(SERVER_RPC) });
}

// ---------------------------------------------------------------------------
// Rules and settings

export const getRules = (owner: Address) => kvGet<RuleRecord[]>(`autopilot:rules:${k(owner)}`, []);
const putRules = (owner: Address, rules: RuleRecord[]) => kvSet(`autopilot:rules:${k(owner)}`, rules.slice(-60));
export const getSettings = async (owner: Address) => ({ ...DEFAULTS, ...(await kvGet<Partial<Settings>>(`autopilot:settings:${k(owner)}`, {})) });
export const spentToday = async (owner: Address) => Number(await kvGet<number>(`autopilot:spent:${k(owner)}:${day()}`, 0));

export async function updateSettings(owner: Address, patch: Partial<Settings>) {
  const s = await getSettings(owner);
  if (patch.dailyLimitEth !== undefined) {
    const v = Number(patch.dailyLimitEth);
    if (!(v > 0) || v > 1) throw new Error("Daily limit must be between 0 and 1 ETH.");
    s.dailyLimitEth = v;
  }
  if (patch.paused !== undefined) s.paused = Boolean(patch.paused);
  await kvSet(`autopilot:settings:${k(owner)}`, s);
  return s;
}

export async function addRule(owner: Address, input: Record<string, unknown>): Promise<RuleRecord> {
  const rules = await getRules(owner);
  if (rules.filter((r) => r.status === "active").length >= MAX_RULES) throw new Error(`You can have up to ${MAX_RULES} active rules.`);
  const base = { id: crypto.randomUUID().slice(0, 8), status: "active" as const, createdAt: Date.now() };
  const kind = String(input.kind);
  let rule: RuleRecord;
  if (kind === "follow") {
    const creator = String(input.creator || "");
    if (!/^0x[0-9a-fA-F]{40}$/.test(creator)) throw new Error("Enter the creator's wallet address.");
    const eth = Number(input.ethAmount);
    if (!(eth > 0) || eth > MAX_TRADE_ETH) throw new Error(`Amount per buy must be between 0 and ${MAX_TRADE_ETH} ETH.`);
    const maxBuys = Math.min(Math.max(1, Math.floor(Number(input.maxBuys) || 3)), 20);
    rule = { ...base, kind: "follow", creator: getAddress(creator), ethAmount: eth, maxBuys, bought: [], fromBlock: (await rpc().getBlockNumber()).toString() };
  } else if (kind === "buy" || kind === "sell") {
    const l = await resolveToken(String(input.token || ""));
    const t = l && (await tokenSummary(l.token));
    if (!t) throw new Error("Token not found. Use the ticker or contract address.");
    if (!t.isNative) throw new Error("Autopilot supports ETH paired tokens only.");
    if (t.live.graduated) throw new Error(`$${t.symbol} has graduated; Autopilot trades bonding curve tokens.`);
    const metric = (["mcapUsd", "priceUsd", "progress"] as const).find((m) => m === input.metric) ?? "mcapUsd";
    const op: Op = input.op === "gte" ? "gte" : "lte";
    const value = Number(input.value);
    if (!(value > 0)) throw new Error("Enter a trigger value.");
    const when = { metric, op, value };
    if (kind === "buy") {
      const eth = Number(input.ethAmount);
      if (!(eth > 0) || eth > MAX_TRADE_ETH) throw new Error(`Buy amount must be between 0 and ${MAX_TRADE_ETH} ETH.`);
      rule = { ...base, kind: "buy", token: t.token, symbol: t.symbol, ethAmount: eth, when };
    } else {
      const pct = Number(input.percent);
      if (!(pct > 0) || pct > 100) throw new Error("Sell percent must be between 1 and 100.");
      rule = { ...base, kind: "sell", token: t.token, symbol: t.symbol, percent: pct, when };
    }
  } else throw new Error("Unknown rule type.");
  await putRules(owner, [...rules, rule]);
  await kvSAdd("autopilot:owners", k(owner));
  return rule;
}

export async function cancelRule(owner: Address, id: string) {
  const rules = await getRules(owner);
  const r = rules.find((x) => x.id === id);
  if (!r) throw new Error("Rule not found.");
  if (r.status === "active") r.status = "cancelled";
  await putRules(owner, rules);
  return r;
}

export function describeRule(r: Rule): string {
  if (r.kind === "follow") return `Buy ${r.ethAmount} ETH of every token launched by ${r.creator.slice(0, 6)}…${r.creator.slice(-4)} (up to ${r.maxBuys})`;
  const m = r.when.metric === "mcapUsd" ? "market cap" : r.when.metric === "priceUsd" ? "price" : "curve progress";
  const v = r.when.metric === "progress" ? `${r.when.value}%` : `$${r.when.value.toLocaleString("en-US")}`;
  const cond = `${m} ${r.when.op === "lte" ? "falls to" : "reaches"} ${v}`;
  return r.kind === "buy" ? `Buy ${r.ethAmount} ETH of $${r.symbol} when ${cond}` : `Sell ${r.percent}% of $${r.symbol} when ${cond}`;
}

// ---------------------------------------------------------------------------
// Balances and withdrawals

export async function autopilotOverview(owner: Address) {
  const address = await autopilotWallet(owner);
  const [rules, settings, spent] = await Promise.all([getRules(owner), getSettings(owner), spentToday(owner)]);
  let eth = 0;
  const holdings: { token: Address; symbol: string; amount: number; valueUsd: number }[] = [];
  if (address) {
    eth = Number(formatEther(await rpc().getBalance({ address })));
    const tokens = [...new Set(rules.flatMap((r) => (r.kind === "follow" ? r.bought : [r.token])))].slice(0, 30) as Address[];
    for (const t of tokens) {
      const bal = await rpc().readContract({ address: t, abi: tokenAbi, functionName: "balanceOf", args: [address] }).catch(() => 0n);
      if (bal > 0n) {
        const v = await tokenSummary(t);
        const amount = Number(formatEther(bal));
        holdings.push({ token: t, symbol: v?.symbol ?? "?", amount, valueUsd: amount * (v?.priceUsd ?? 0) });
      }
    }
  }
  return { enabled: autopilotEnabled(), address, eth, holdings, rules: rules.slice().reverse().map((r) => ({ ...r, label: describeRule(r) })), settings, spentToday: spent };
}

/** Sends everything back to the owner: tokens first, then ETH minus gas. */
export async function withdrawAll(owner: Address) {
  const wc = await signer(owner);
  const me = wc.account.address;
  const hashes: string[] = [];
  const rules = await getRules(owner);
  const tokens = [...new Set(rules.flatMap((r) => (r.kind === "follow" ? r.bought : [r.token])))] as Address[];
  for (const t of tokens) {
    const bal = await rpc().readContract({ address: t, abi: tokenAbi, functionName: "balanceOf", args: [me] }).catch(() => 0n);
    if (bal > 0n) hashes.push(await wc.writeContract({ address: t, abi: erc20Abi, functionName: "transfer", args: [owner, bal] }));
  }
  if (hashes.length) await rpc().waitForTransactionReceipt({ hash: hashes[hashes.length - 1] as Hex });
  const bal = await rpc().getBalance({ address: me });
  const gasPrice = await rpc().getGasPrice();
  const fee = gasPrice * 21_000n * 2n;
  if (bal > fee) hashes.push(await wc.sendTransaction({ to: owner, value: bal - fee }));
  return hashes;
}

// ---------------------------------------------------------------------------
// The scheduler

function hit(t: TokenView, w: { metric: Metric; op: Op; value: number }) {
  const v = w.metric === "mcapUsd" ? t.marketCapUsd : w.metric === "priceUsd" ? t.priceUsd : t.progress;
  if (!(v > 0)) return false;
  return w.op === "lte" ? v <= w.value : v >= w.value;
}

async function execBuy(owner: Address, token: Address, eth: number, settings: Settings) {
  const spent = await spentToday(owner);
  if (spent + eth > settings.dailyLimitEth + 1e-12) throw new Error(`Daily limit of ${settings.dailyLimitEth} ETH reached.`);
  const wc = await signer(owner);
  const wei = parseEther(String(eth) as `${number}`);
  const bal = await rpc().getBalance({ address: wc.account.address });
  if (bal < wei + GAS_RESERVE) throw new Error("Not enough ETH in the Autopilot wallet.");
  const l = findLaunch(token) ?? (await ensureLaunch(token));
  if (!l) throw new Error("Token not found.");
  const { txs } = await buildBuy(l, wei, wc.account.address);
  let hash = "";
  for (const t of txs) {
    hash = await wc.sendTransaction({ to: t.to, data: t.data, value: BigInt(t.value) });
    await rpc().waitForTransactionReceipt({ hash: hash as Hex });
  }
  await kvSet(`autopilot:spent:${k(owner)}:${day()}`, spent + eth, 60 * 60 * 48);
  return hash;
}

async function execSell(owner: Address, token: Address, percent: number) {
  const wc = await signer(owner);
  const me = wc.account.address;
  const bal = await rpc().readContract({ address: token, abi: tokenAbi, functionName: "balanceOf", args: [me] });
  const amount = (bal * BigInt(Math.round(percent * 100))) / 10_000n;
  if (amount <= 0n) throw new Error("No tokens to sell in the Autopilot wallet.");
  const l = findLaunch(token) ?? (await ensureLaunch(token));
  if (!l) throw new Error("Token not found.");
  const { txs } = await buildSell(l, amount, me);
  let hash = "";
  for (const t of txs) {
    hash = await wc.sendTransaction({ to: t.to, data: t.data, value: BigInt(t.value) });
    await rpc().waitForTransactionReceipt({ hash: hash as Hex });
  }
  return hash;
}

/** One pass over every owner's active rules. Safe to call every minute. */
export async function runAutopilot(budgetMs = 50_000) {
  if (!autopilotEnabled()) return { skipped: "Autopilot is not configured." };
  if ((await kvIncr(`autopilot:lock`, 55)) > 1) return { skipped: "Another run is in progress." };
  const started = Date.now();
  const owners = await kvSMembers("autopilot:owners");
  const log: string[] = [];
  for (const o of owners) {
    if (Date.now() - started > budgetMs) break;
    const owner = getAddress(o);
    const settings = await getSettings(owner);
    if (settings.paused || !(await autopilotWallet(owner))) continue;
    const rules = await getRules(owner);
    let changed = false;
    for (const r of rules) {
      if (r.status !== "active" || Date.now() - started > budgetMs) continue;
      try {
        if (r.kind === "follow") {
          const { items } = await listTokens({ sort: "new", creator: r.creator, limit: 5 });
          const fresh = items.filter((t) => BigInt(t.block) > BigInt(r.fromBlock) && !r.bought.includes(t.token) && t.isNative && !t.live.graduated);
          for (const t of fresh) {
            if (r.bought.length >= r.maxBuys) break;
            r.txHash = await execBuy(owner, t.token, r.ethAmount, settings);
            r.bought.push(t.token);
            r.firedAt = Date.now();
            r.lastError = undefined;
            log.push(`${owner} follow bought ${t.symbol}`);
            changed = true;
          }
          if (r.bought.length >= r.maxBuys) { r.status = "done"; changed = true; }
          continue;
        }
        const t = await tokenSummary(r.token);
        if (!t || !hit(t, r.when)) continue;
        if (t.live.graduated) { r.status = "failed"; r.lastError = "Token graduated before the rule fired."; changed = true; continue; }
        r.txHash = r.kind === "buy" ? await execBuy(owner, r.token, r.ethAmount, settings) : await execSell(owner, r.token, r.percent);
        r.status = "done";
        r.firedAt = Date.now();
        r.lastError = undefined;
        log.push(`${owner} ${r.kind} ${r.symbol}`);
        changed = true;
      } catch (e) {
        const msg = (e as { shortMessage?: string }).shortMessage || (e as Error).message;
        if (r.lastError !== msg) { r.lastError = msg; changed = true; }
      }
    }
    if (changed) await putRules(owner, rules);
  }
  return { owners: owners.length, executed: log, ms: Date.now() - started };
}

