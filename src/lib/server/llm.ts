import "server-only";
import { formatEther, getAddress, type Address, type Hex } from "viem";
import { LLM } from "../config";
import { resolveApiKey } from "./accounts";
import { ethUsd } from "./price";
import { rpc } from "./rpc";
import { kvGet, kvIncr, kvIncrBy, kvMGetNumbers, kvSAdd, kvSIsMember, kvSMembers, kvSet } from "./store";

/**
 * Ponkr LLM Gateway: an OpenAI and Anthropic compatible proxy in front of the upstream gateway.
 * Users authenticate with Ponkr API keys and pay from a prepaid USD credit balance.
 * Amounts are stored as integer micro USD (1e-6 USD).
 */

const UPSTREAM = (process.env.LLM_BASE_URL || "https://llm.bankr.bot").replace(/\/$/, "");
const UPSTREAM_KEY = process.env.LLM_API_KEY || "";
const MARKUP = Number(process.env.LLM_MARKUP || 1);
const RPM = Number(process.env.LLM_REQUESTS_PER_MINUTE || 60);
const MICRO = 1_000_000;

export const gatewayEnabled = () => Boolean(UPSTREAM_KEY);

// ---------------------------------------------------------------------------
// Models and pricing
// ---------------------------------------------------------------------------

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  context?: number;
  maxOutput?: number;
  modalities: string[];
  /** USD per 1M tokens, Ponkr price (upstream price times markup). */
  input: number;
  output: number;
  cacheRead?: number;
  cacheWrite?: number;
}

type Raw = Record<string, unknown>;
const num = (v: unknown) => (v === undefined || v === null || v === "" ? undefined : Number(v));

const PROVIDERS: [RegExp, string][] = [
  [/^claude/, "Anthropic"], [/^gemini|^gemma/, "Google"], [/^gpt|^o\d/, "OpenAI"], [/^grok/, "xAI"], [/^kimi/, "Moonshot"],
  [/^qwen/, "Alibaba"], [/^deepseek/, "DeepSeek"], [/^glm/, "Zhipu"], [/^minimax/, "MiniMax"], [/^muse/, "Meta"],
];
const providerOf = (id: string, raw?: unknown) => {
  const known = PROVIDERS.find(([r]) => r.test(id))?.[1];
  if (known) return known;
  if (typeof raw === "string" && raw && !/bankr/i.test(raw)) return raw[0].toUpperCase() + raw.slice(1);
  return "Other";
};

function prettyName(id: string) {
  return id
    .replace(/:.*/, "")
    .split("-")
    .map((p) => (/^\d/.test(p) ? p : p.length <= 3 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1)))
    .join(" ");
}

function normalize(m: Raw): ModelInfo | undefined {
  const id = String(m.id ?? "");
  if (!id || /image/.test(id) || m.deprecated || m.hidden) return undefined;
  const p = (m.pricing ?? {}) as Raw;
  const input = num(p.input ?? p.prompt);
  const output = num(p.output ?? p.completion);
  if (input === undefined || output === undefined) return undefined;
  const mod = (m.input_modalities ?? m.modalities ?? (m.architecture as Raw | undefined)?.input_modalities ?? ["text"]) as string[];
  return {
    id,
    name: String(m.name ?? m.display_name ?? prettyName(id)).replace(/bankr/gi, "").trim(),
    provider: providerOf(id, m.provider ?? m.owned_by),
    context: num(m.context_length ?? m.context_window ?? m.contextLength),
    maxOutput: num(m.max_output_tokens ?? m.max_output ?? m.maxOutput),
    modalities: Array.isArray(mod) ? mod.filter((x) => x === "text" || x === "image") : ["text"],
    input: input * MARKUP,
    output: output * MARKUP,
    cacheRead: num(p.cache_read ?? p.input_cache_read) !== undefined ? num(p.cache_read ?? p.input_cache_read)! * MARKUP : undefined,
    cacheWrite: num(p.cache_write ?? p.input_cache_write) !== undefined ? num(p.cache_write ?? p.input_cache_write)! * MARKUP : undefined,
  };
}

let modelCache: { at: number; models: ModelInfo[] } | undefined;

export async function listModels(): Promise<ModelInfo[]> {
  if (modelCache && Date.now() - modelCache.at < 10 * 60_000) return modelCache.models;
  if (!UPSTREAM_KEY) return [];
  const r = await fetch(`${UPSTREAM}/v1/models`, { headers: { "x-api-key": UPSTREAM_KEY }, cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!r.ok) {
    console.error("[llm] models fetch failed", r.status);
    return modelCache?.models ?? [];
  }
  const j = (await r.json()) as { data?: Raw[] } | Raw[];
  const raw = Array.isArray(j) ? j : (j.data ?? []);
  const models = raw.map(normalize).filter((m): m is ModelInfo => !!m);
  modelCache = { at: Date.now(), models };
  return models;
}

async function priceOf(model: string) {
  const models = await listModels();
  return models.find((m) => m.id === model) ?? models.find((m) => m.id === model.replace(/:.*/, ""));
}

export interface Usage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

/** Cost in micro USD. Cached tokens are billed at the cache rate when one is published. */
export function costMicro(p: ModelInfo, u: Usage) {
  const fresh = Math.max(0, u.input - u.cacheRead - u.cacheWrite);
  const usd =
    (fresh * p.input + u.output * p.output + u.cacheRead * (p.cacheRead ?? p.input) + u.cacheWrite * (p.cacheWrite ?? p.input)) / 1_000_000;
  return Math.ceil(usd * MICRO);
}

// ---------------------------------------------------------------------------
// Credits and usage
// ---------------------------------------------------------------------------

const wkey = (w: string) => w.toLowerCase();
const day = (d = new Date()) => d.toISOString().slice(0, 10);

export async function balanceMicro(wallet: string) {
  return Number(await kvGet(`llm:credits:${wkey(wallet)}`, 0));
}

export interface TopUp {
  txHash: string;
  eth: string;
  usd: number;
  at: number;
}

/** Verifies an ETH payment to the treasury and credits its USD value. */
export async function creditTopUp(txHash: Hex, wallets: Address[]) {
  if (!LLM.treasury) throw new Error("Top ups are not configured on this deployment yet.");
  if (await kvSIsMember("llm:topups", txHash.toLowerCase())) throw new Error("This payment was already credited.");
  const client = rpc();
  const [tx, receipt] = await Promise.all([client.getTransaction({ hash: txHash }), client.waitForTransactionReceipt({ hash: txHash, timeout: 60_000 })]);
  if (receipt.status !== "success") throw new Error("The payment transaction failed.");
  if (!tx.to || tx.to.toLowerCase() !== LLM.treasury.toLowerCase()) throw new Error("The payment was not sent to the Ponkr treasury.");
  const from = wallets.find((w) => w.toLowerCase() === tx.from.toLowerCase());
  if (!from) throw new Error("The payment must come from a wallet linked to your account.");
  const usd = Number(formatEther(tx.value)) * (await ethUsd());
  if (usd < LLM.minTopUpUsd) throw new Error(`The minimum top up is $${LLM.minTopUpUsd}.`);
  await kvSAdd("llm:topups", txHash.toLowerCase());
  const balance = await kvIncrBy(`llm:credits:${wkey(from)}`, Math.floor(usd * MICRO));
  const history = await kvGet<TopUp[]>(`llm:topup-history:${wkey(from)}`, []);
  await kvSet(`llm:topup-history:${wkey(from)}`, [{ txHash, eth: formatEther(tx.value), usd, at: Date.now() }, ...history].slice(0, 50));
  return { wallet: getAddress(from), creditedUsd: usd, balanceUsd: balance / MICRO };
}

export async function topUpHistory(wallet: string) {
  return kvGet<TopUp[]>(`llm:topup-history:${wkey(wallet)}`, []);
}

async function recordUsage(wallet: string, model: string, u: Usage, cost: number) {
  const base = `llm:u:${wkey(wallet)}:${day()}`;
  const ttl = 120 * 86400;
  await Promise.all([
    kvIncrBy(`llm:credits:${wkey(wallet)}`, -cost),
    kvIncrBy(`${base}:req`, 1, ttl),
    kvIncrBy(`${base}:in`, u.input, ttl),
    kvIncrBy(`${base}:out`, u.output, ttl),
    kvIncrBy(`${base}:cost`, cost, ttl),
    kvIncrBy(`${base}:m:${model}:req`, 1, ttl),
    kvIncrBy(`${base}:m:${model}:cost`, cost, ttl),
    kvIncrBy(`${base}:m:${model}:tok`, u.input + u.output, ttl),
    kvSAdd(`llm:models-used:${wkey(wallet)}`, model),
  ]);
}

export async function usageReport(wallet: string, days = 30) {
  const dates = Array.from({ length: days }, (_, i) => day(new Date(Date.now() - (days - 1 - i) * 86400_000)));
  const fields = ["req", "in", "out", "cost"] as const;
  const keys = dates.flatMap((d) => fields.map((f) => `llm:u:${wkey(wallet)}:${d}:${f}`));
  const vals = await kvMGetNumbers(keys);
  const daily = dates.map((d, i) => ({ day: d, requests: vals[i * 4], input: vals[i * 4 + 1], output: vals[i * 4 + 2], costUsd: vals[i * 4 + 3] / MICRO }));
  const used = await kvSMembers(`llm:models-used:${wkey(wallet)}`);
  const perModel = await Promise.all(
    used.map(async (m) => {
      const mk = dates.flatMap((d) => [`llm:u:${wkey(wallet)}:${d}:m:${m}:req`, `llm:u:${wkey(wallet)}:${d}:m:${m}:cost`, `llm:u:${wkey(wallet)}:${d}:m:${m}:tok`]);
      const v = await kvMGetNumbers(mk);
      let requests = 0, cost = 0, tokens = 0;
      for (let i = 0; i < v.length; i += 3) { requests += v[i]; cost += v[i + 1]; tokens += v[i + 2]; }
      return { model: m, requests, tokens, costUsd: cost / MICRO };
    }),
  );
  return {
    daily,
    models: perModel.filter((m) => m.requests > 0).sort((a, b) => b.costUsd - a.costUsd),
    totals: daily.reduce((t, d) => ({ requests: t.requests + d.requests, tokens: t.tokens + d.input + d.output, costUsd: t.costUsd + d.costUsd }), { requests: 0, tokens: 0, costUsd: 0 }),
  };
}

// ---------------------------------------------------------------------------
// Proxy
// ---------------------------------------------------------------------------

type Format = "openai" | "anthropic";

function errorResponse(format: Format, status: number, type: string, message: string) {
  const body = format === "anthropic" ? { type: "error", error: { type, message } } : { error: { message, type } };
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** Removes upstream branding and URLs from error text before it reaches users. */
function scrub(text: string) {
  return text.replace(/https?:\/\/\S*bankr\S*/gi, "").replace(/bankr(\.bot)?/gi, "the gateway").replace(/\s{2,}/g, " ").trim();
}

function usageFrom(obj: Raw | undefined): Partial<Usage> {
  if (!obj) return {};
  // OpenAI shape
  if ("prompt_tokens" in obj || "completion_tokens" in obj) {
    const details = (obj.prompt_tokens_details ?? {}) as Raw;
    return { input: Number(obj.prompt_tokens ?? 0), output: Number(obj.completion_tokens ?? 0), cacheRead: Number(details.cached_tokens ?? 0) };
  }
  // Anthropic shape: input_tokens excludes cached tokens
  const cr = Number(obj.cache_read_input_tokens ?? 0);
  const cw = Number(obj.cache_creation_input_tokens ?? 0);
  const out: Partial<Usage> = {};
  if ("input_tokens" in obj) Object.assign(out, { input: Number(obj.input_tokens ?? 0) + cr + cw, cacheRead: cr, cacheWrite: cw });
  if ("output_tokens" in obj) out.output = Number(obj.output_tokens ?? 0);
  return out;
}

export async function proxy(req: Request, format: Format) {
  if (!gatewayEnabled()) return errorResponse(format, 503, "unavailable", "The LLM Gateway is not available yet.");
  const key = await resolveApiKey(req);
  if (!key) return errorResponse(format, 401, "authentication_error", "Missing or invalid Ponkr API key.");

  const minute = Math.floor(Date.now() / 60_000);
  if ((await kvIncr(`llm:rpm:${key.id}:${minute}`, 120)) > RPM) {
    return errorResponse(format, 429, "rate_limit_error", `Rate limit exceeded (${RPM} requests per minute).`);
  }

  let body: Raw;
  try {
    body = (await req.json()) as Raw;
  } catch {
    return errorResponse(format, 400, "invalid_request_error", "Request body must be JSON.");
  }
  const model = String(body.model ?? "");
  const price = model ? await priceOf(model) : undefined;
  if (!price) return errorResponse(format, 400, "invalid_request_error", `Unknown model "${model}". See /api/llm/v1/models.`);

  const balance = await balanceMicro(key.owner);
  if (balance <= 0) return errorResponse(format, 402, "insufficient_credits", "Your LLM credit balance is empty. Top up at /llm.");

  const stream = Boolean(body.stream);
  if (stream && format === "openai") body.stream_options = { ...((body.stream_options as Raw) ?? {}), include_usage: true };

  const path = format === "openai" ? "/v1/chat/completions" : "/v1/messages";
  const headers: Record<string, string> = { "content-type": "application/json", "x-api-key": UPSTREAM_KEY };
  const av = req.headers.get("anthropic-version");
  if (format === "anthropic") headers["anthropic-version"] = av || "2023-06-01";

  let up: Response;
  try {
    up = await fetch(`${UPSTREAM}${path}`, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(290_000) });
  } catch {
    return errorResponse(format, 504, "timeout_error", "The model provider did not respond in time.");
  }

  if (!up.ok) {
    const text = await up.text();
    console.error("[llm] upstream error", up.status, text.slice(0, 300));
    if (up.status === 401 || up.status === 402 || up.status === 403) {
      return errorResponse(format, 503, "unavailable", "The LLM Gateway is temporarily unavailable. Please try again later.");
    }
    let message = "The model provider returned an error.";
    try {
      const j = JSON.parse(text) as { error?: { message?: string } | string };
      message = typeof j.error === "string" ? j.error : j.error?.message ?? message;
    } catch {
      /* not json */
    }
    return errorResponse(format, up.status, "provider_error", scrub(message));
  }

  const owner = key.owner;
  const charge = async (u: Partial<Usage>) => {
    const usage: Usage = { input: u.input ?? 0, output: u.output ?? 0, cacheRead: u.cacheRead ?? 0, cacheWrite: u.cacheWrite ?? 0 };
    if (usage.input + usage.output === 0) return;
    await recordUsage(owner, model, usage, costMicro(price, usage)).catch((e) => console.error("[llm] usage record failed", e));
  };

  if (!stream) {
    const j = (await up.json()) as Raw;
    await charge(usageFrom(j.usage as Raw));
    if (typeof j.model === "string") j.model = model;
    return new Response(JSON.stringify(j), { status: 200, headers: { "content-type": "application/json" } });
  }

  // Streaming: pass bytes through untouched and read usage from the SSE events as they go by.
  const usage: Partial<Usage> = {};
  let buf = "";
  const dec = new TextDecoder();
  const scan = (line: string) => {
    if (!line.startsWith("data:")) return;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") return;
    try {
      const ev = JSON.parse(data) as Raw;
      if (ev.usage) Object.assign(usage, usageFrom(ev.usage as Raw));
      const msg = ev.message as Raw | undefined;
      if (msg?.usage) Object.assign(usage, usageFrom(msg.usage as Raw));
    } catch {
      /* partial or non json event */
    }
  };
  const body$ = up.body!.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, ctl) {
        ctl.enqueue(chunk);
        buf += dec.decode(chunk, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        lines.forEach(scan);
      },
      async flush() {
        if (buf) scan(buf);
        await charge(usage);
      },
    }),
  );
  return new Response(body$, {
    status: 200,
    headers: { "content-type": up.headers.get("content-type") ?? "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" },
  });
}
