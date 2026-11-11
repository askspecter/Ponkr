import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { formatUnits, getAddress, isAddress, parseEther, parseUnits, type Address } from "viem";
import { BRAND, CLUB, EXPLORER } from "../config";
import { fmtNum } from "../format";
import { deployerEnabled, sponsoredLaunch } from "./deployer";
import { requireClub } from "./accounts";
import { allLaunches, markViaApp } from "./indexer";
import { pinFile, pinFromUrl } from "./ipfs";
import { ethUsd } from "./price";
import { rpc } from "./rpc";
import { creatorFees, listTokens, resolveToken, tokenDetail, walletHoldings, type TokenView } from "./tokens";
import { buildBuy, buildClaim, buildLaunch, buildSell, buildSweep, quote, type TxRequest } from "./tx";
import { tokenAbi } from "../abis";

export type Channel = "web" | "api" | "telegram" | "x";

export interface AgentContext {
  channel: Channel;
  /** Wallet that can sign transactions in this channel (web) or that owns the request. */
  wallet?: Address;
  /** Stable id used for sponsored-launch quotas. */
  identity: string;
  /** Wallets proven to belong to the caller (web: Privy session, api: key owner). */
  verifiedWallets?: Address[];
  /** Optional image attached by the user (ipfs:// or https URL). */
  attachedImage?: string;
}

export type AgentAction =
  | { type: "txs"; title: string; txs: TxRequest[]; summary?: Record<string, string> }
  | { type: "token"; token: Address; symbol: string }
  | { type: "launched"; token?: Address; symbol: string; txHash: string };

export interface AgentResult {
  text: string;
  actions: AgentAction[];
}

/**
 * Two ways to reach the model:
 * - LLM gateway (preferred): LLM_API_KEY + LLM_BASE_URL. The gateway exposes an Anthropic-compatible
 *   /v1/messages endpoint, so the same SDK is used with a different base URL and key.
 * - Direct: ANTHROPIC_API_KEY.
 */
const GATEWAY_KEY = process.env.LLM_API_KEY || "";
const GATEWAY_URL = process.env.LLM_BASE_URL || "https://llm.bankr.bot";
const useGateway = Boolean(GATEWAY_KEY);
const MODEL = process.env.AGENT_MODEL || (useGateway ? "claude-opus-5.5" : "claude-opus-5-5");
const EFFORT = (process.env.AGENT_EFFORT || "low") as "low" | "medium" | "high";
const MAX_TOKENS = Number(process.env.AGENT_MAX_TOKENS || 4096);

export const agentConfigured = () => Boolean(GATEWAY_KEY || process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

let anthropic: Anthropic | undefined;
const client = () =>
  (anthropic ??= useGateway ? new Anthropic({ apiKey: GATEWAY_KEY, baseURL: GATEWAY_URL, maxRetries: 2, defaultHeaders: { "x-api-key": GATEWAY_KEY } }) : new Anthropic());

async function callModel(system: string, messages: Anthropic.MessageParam[]): Promise<Anthropic.Message> {
  try {
    if (useGateway) {
      // Plain Messages API shape: gateway-routed providers may not accept Anthropic beta fields.
      return await client().messages.create({ model: MODEL, max_tokens: MAX_TOKENS, system, tools, messages });
    }
    return (await client().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: EFFORT },
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      tools,
      messages,
    } as never)) as unknown as Anthropic.Message;
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      console.error("[agent] model error", e.status, e.message);
      if (e.status === 402) throw new Error("The agent is temporarily unavailable (AI credits exhausted). Please try again later.");
      if (e.status === 401 || e.status === 403) throw new Error("The agent is not configured correctly (AI key rejected).");
      if (e.status === 429) throw new Error("The agent is busy right now. Try again in a minute.");
      throw new Error("The agent hit an error talking to the AI service. Try again.");
    }
    throw e;
  }
}

const tools: Anthropic.Tool[] = [
  {
    name: "search_tokens",
    description: "Search launchpad tokens by name, ticker or address, or list them. sort: latest (most recent launches), mcap (largest market cap), progress (closest to graduating), graduated, app (launched via this app).",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Optional name/ticker/address filter" },
        sort: { type: "string", enum: ["latest", "mcap", "progress", "graduated", "app"] },
        limit: { type: "integer", minimum: 1, maximum: 20 },
      },
      required: [],
    },
  },
  {
    name: "get_token",
    description: "Get full details for one token: price, market cap, bonding-curve progress, 24h volume, fees, creator, socials, recent trades.",
    input_schema: { type: "object", properties: { token: { type: "string", description: "Ticker like $FOO or 0x address" } }, required: ["token"] },
  },
  {
    name: "quote_trade",
    description: "Quote a buy (amount in ETH) or sell (amount in tokens, or percent like '50%' of the user's balance) without executing.",
    input_schema: {
      type: "object",
      properties: { token: { type: "string" }, side: { type: "string", enum: ["buy", "sell"] }, amount: { type: "string" } },
      required: ["token", "side", "amount"],
    },
  },
  {
    name: "trade",
    description: "Prepare a buy or sell for the user's connected wallet to sign. Buy amount is in ETH (or '$25' in USD). Sell amount is in tokens or a percentage such as '100%'. Only available when the user has a wallet connected.",
    input_schema: {
      type: "object",
      properties: {
        token: { type: "string" },
        side: { type: "string", enum: ["buy", "sell"] },
        amount: { type: "string" },
        slippage_percent: { type: "number", minimum: 0.1, maximum: 50 },
      },
      required: ["token", "side", "amount"],
    },
  },
  {
    name: "launch_token",
    description: "Launch a new token on the bonding-curve launchpad. Supply is fixed at 1B. A logo is required: use the user's attached image, an image URL they provide, or set generate_logo=true to create a simple generated logo. mode 'wallet' prepares a transaction for the user's connected wallet (supports an initial buy); mode 'sponsored' deploys from the platform wallet for free and sends 100% of creator fees to fee_recipient.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        symbol: { type: "string" },
        description: { type: "string" },
        image_url: { type: "string", description: "ipfs:// or https URL of the logo" },
        generate_logo: { type: "boolean" },
        fee_recipient: { type: "string", description: "Address that receives creator fees. Defaults to the user's wallet." },
        creator_tax_percent: { type: "number", minimum: 0, maximum: 10, description: "Extra creator tax on every trade, default 1%" },
        initial_buy_eth: { type: "string", description: "Optional ETH to buy at launch (wallet mode only)" },
        mode: { type: "string", enum: ["wallet", "sponsored"] },
        twitter: { type: "string" },
        telegram: { type: "string" },
        website: { type: "string" },
      },
      required: ["name", "symbol"],
    },
  },
  {
    name: "get_portfolio",
    description: "Get ETH balance and launchpad token holdings with USD values for an address (defaults to the user's wallet).",
    input_schema: { type: "object", properties: { address: { type: "string" } }, required: [] },
  },
  {
    name: "creator_fees",
    description: "Show claimable creator fees and tokens created by an address (defaults to the user's wallet). Set prepare_claim=true to prepare the claim transaction(s).",
    input_schema: {
      type: "object",
      properties: { address: { type: "string" }, prepare_claim: { type: "boolean" }, sweep_token: { type: "string", description: "Optionally sweep accrued fees of one token into the escrow first" } },
      required: [],
    },
  },
  {
    name: "market_overview",
    description: "ETH price and launchpad-wide stats (number of launches, launches in last 24h, graduated count).",
    input_schema: { type: "object", properties: {}, required: [] },
  },
];

function summarize(v: TokenView) {
  return {
    name: v.name,
    symbol: v.symbol,
    token: v.token,
    priceUsd: v.priceUsd,
    priceEth: v.priceEth,
    marketCapUsd: Math.round(v.marketCapUsd),
    bondingProgressPct: Math.round(v.progress * 10) / 10,
    graduated: v.live.graduated,
    creator: v.creator,
    launchedAt: new Date(v.timestamp * 1000).toISOString(),
    tradeFeePct: Number(v.live.feeBps) / 100,
    creatorTaxPct: Number(v.live.creatorTaxBps) / 100,
    volume24hEth: v.volume24hEth,
    change24hPct: v.change24h,
    socials: Object.fromEntries(Object.entries(v.socials).filter(([, x]) => x)),
    page: `/token/${v.token}`,
  };
}

async function parseAmount(side: "buy" | "sell", amount: string, token: { token: Address }, wallet?: Address) {
  const a = amount.trim().toLowerCase().replace(/eth$/, "").trim();
  if (side === "buy") {
    if (a.startsWith("$")) {
      const usd = Number(a.slice(1));
      return parseEther(((usd / (await ethUsd())).toFixed(18)) as `${number}`);
    }
    return parseEther(a as `${number}`);
  }
  if (a.endsWith("%")) {
    if (!wallet) throw new Error("A wallet is required to sell a percentage of a balance.");
    const pct = Number(a.slice(0, -1));
    const bal = await rpc().readContract({ address: token.token, abi: tokenAbi, functionName: "balanceOf", args: [wallet] });
    return (bal * BigInt(Math.round(pct * 100))) / 10000n;
  }
  return parseUnits(a, 18);
}

function logoSvg(symbol: string) {
  const h = [...symbol].reduce((s, c) => (s * 31 + c.charCodeAt(0)) % 360, 7);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h},85%,55%)"/><stop offset="1" stop-color="hsl(${(h + 70) % 360},85%,40%)"/></linearGradient></defs><rect width="512" height="512" rx="96" fill="url(#g)"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="${symbol.length > 5 ? 96 : 150}" fill="#fff">$${symbol.slice(0, 8)}</text></svg>`;
}

async function runTool(name: string, input: Record<string, unknown>, ctx: AgentContext, actions: AgentAction[]): Promise<unknown> {
  switch (name) {
    case "search_tokens": {
      const r = await listTokens({ q: input.query as string | undefined, sort: (input.sort as never) ?? "latest", limit: Math.min(Number(input.limit ?? 8), 20) });
      return { total: r.total, tokens: r.items.map(summarize) };
    }
    case "get_token": {
      const d = await tokenDetail(String(input.token));
      if (!d) return { error: "Token not found on the launchpad." };
      actions.push({ type: "token", token: d.token.token, symbol: d.token.symbol });
      return { ...summarize(d.token), recentTrades: d.trades.slice(0, 5).map((t) => ({ side: t.side, eth: Number(formatUnits(BigInt(t.quote), 18)), tokens: Number(formatUnits(BigInt(t.tokens), 18)), trader: t.trader })) };
    }
    case "quote_trade": {
      const l = await resolveToken(String(input.token));
      if (!l) return { error: "Token not found." };
      const side = input.side as "buy" | "sell";
      const amt = await parseAmount(side, String(input.amount), l, ctx.wallet);
      const q = await quote(l, side, amt, ctx.wallet);
      if (q.graduated) return { error: `${l.symbol} graduated to its DEX pool; bonding-curve quotes are unavailable.` };
      return side === "buy"
        ? { side, ethIn: formatUnits(amt, 18), tokensOut: fmtNum(Number(formatUnits(q.amountOut, 18))), feesEth: formatUnits(q.fees, 18), priceImpactPct: Number(q.priceImpactBps) / 100, snipeTaxPct: Number(q.snipeTaxBps) / 100 }
        : { side, tokensIn: fmtNum(Number(formatUnits(amt, 18))), ethOut: formatUnits(q.amountOut, 18), feesEth: formatUnits(q.fees, 18), priceImpactPct: Number(q.priceImpactBps) / 100 };
    }
    case "trade": {
      if (ctx.channel !== "web" || !ctx.wallet) return { error: "Trading requires a connected wallet in the web app. Ask the user to connect their wallet at the top right." };
      const l = await resolveToken(String(input.token));
      if (!l) return { error: "Token not found." };
      const side = input.side as "buy" | "sell";
      const amt = await parseAmount(side, String(input.amount), l, ctx.wallet);
      if (amt <= 0n) return { error: "Amount must be greater than zero." };
      const slip = Math.round(Number(input.slippage_percent ?? 3) * 100);
      const built = side === "buy" ? await buildBuy(l, amt, ctx.wallet, slip) : await buildSell(l, amt, ctx.wallet, slip);
      const out = built.quote.graduated ? 0n : built.quote.amountOut;
      actions.push({
        type: "txs",
        title: side === "buy" ? `Buy $${l.symbol}` : `Sell $${l.symbol}`,
        txs: built.txs,
        summary: side === "buy"
          ? { Pay: `${formatUnits(amt, 18)} ETH`, "Receive (est.)": `${fmtNum(Number(formatUnits(out, 18)))} $${l.symbol}`, Slippage: `${slip / 100}%` }
          : { Sell: `${fmtNum(Number(formatUnits(amt, 18)))} $${l.symbol}`, "Receive (est.)": `${Number(formatUnits(out, 18)).toFixed(6)} ETH`, Slippage: `${slip / 100}%` },
      });
      return { prepared: true, note: "A transaction card is shown to the user to confirm in their wallet. Do not claim it is executed." };
    }
    case "launch_token": {
      const symbol = String(input.symbol).replace(/^\$/, "").toUpperCase();
      let feeRecipient: Address | undefined = undefined;
      if (input.fee_recipient && isAddress(String(input.fee_recipient))) feeRecipient = getAddress(String(input.fee_recipient));
      else feeRecipient = ctx.wallet;
      if (!feeRecipient) return { error: "Need a fee recipient address (0x…) to receive creator fees. Ask the user for one." };

      // Only Club members (official token holders) can launch. On social channels, where the sender
      // has no linked wallet, the fee recipient must be the Club wallet.
      const gateWallets = ctx.channel === "web" || ctx.channel === "api" ? ctx.verifiedWallets ?? [] : [feeRecipient];
      try {
        await requireClub(gateWallets);
      } catch (e) {
        return { error: (e as Error).message, clubPage: "/club" };
      }

      let logo = (input.image_url as string | undefined) || ctx.attachedImage;
      try {
        if (logo && logo.startsWith("http")) logo = await pinFromUrl(logo);
        if (!logo && input.generate_logo) logo = await pinFile(new Blob([logoSvg(symbol)], { type: "image/svg+xml" }), `${symbol}.svg`);
      } catch (e) {
        return { error: (e as Error).message };
      }
      if (!logo) return { error: "A logo is required. Ask the user to attach an image, give an image URL, or confirm a generated logo (generate_logo=true)." };

      const mode = (input.mode as string | undefined) ?? (ctx.channel === "web" && ctx.wallet ? "wallet" : "sponsored");
      const launchInput = {
        name: String(input.name),
        symbol,
        logo,
        description: input.description as string | undefined,
        socials: { twitter: (input.twitter as string) ?? "", telegram: (input.telegram as string) ?? "", website: (input.website as string) ?? "" },
        feeRecipient,
        creatorTaxBps: Math.round(Number(input.creator_tax_percent ?? 1) * 100),
        initialBuyEth: input.initial_buy_eth as string | undefined,
      };
      if (mode === "wallet") {
        if (ctx.channel !== "web" || !ctx.wallet) return { error: "Wallet mode needs a connected wallet in the web app; use sponsored mode instead." };
        const built = await buildLaunch(launchInput, ctx.wallet);
        if (built.predicted?.token) await markViaApp(built.predicted.token);
        actions.push({
          type: "txs",
          title: `Launch $${symbol}`,
          txs: [built.tx],
          summary: { Name: launchInput.name, Ticker: `$${symbol}`, "Fee recipient": feeRecipient, "Creator tax": `${launchInput.creatorTaxBps / 100}%`, "Initial buy": `${launchInput.initialBuyEth ?? "0"} ETH`, "Launch fee": `${formatUnits(BigInt(built.launchFee), 18)} ETH` },
        });
        return { prepared: true, predictedToken: built.predicted?.token, note: "Transaction card shown to the user; it is not launched until they confirm." };
      }
      if (!deployerEnabled()) return { error: "Sponsored launches are disabled on this server. The user can launch from their own wallet at /launch." };
      const r = await sponsoredLaunch(launchInput, ctx.identity);
      actions.push({ type: "launched", token: r.token, symbol: r.symbol, txHash: r.txHash });
      return { launched: true, ...r, explorer: `${EXPLORER}/tx/${r.txHash}`, page: r.token ? `/token/${r.token}` : undefined };
    }
    case "get_portfolio": {
      const addr = (input.address as string) || ctx.wallet;
      if (!addr || !isAddress(addr)) return { error: "No wallet connected and no address given." };
      const p = await walletHoldings(getAddress(addr));
      return {
        address: p.address,
        eth: formatUnits(BigInt(p.eth), 18),
        ethUsd: Math.round(p.ethUsd * 100) / 100,
        totalUsd: Math.round(p.totalUsd * 100) / 100,
        positions: p.positions.slice(0, 25).map((x) => ({ symbol: x.token.symbol, token: x.token.token, amount: fmtNum(x.amount), valueUsd: Math.round(x.valueUsd * 100) / 100, graduated: x.token.live.graduated })),
      };
    }
    case "creator_fees": {
      const addr = (input.address as string) || ctx.wallet;
      if (!addr || !isAddress(addr)) return { error: "No wallet connected and no address given." };
      const f = await creatorFees(getAddress(addr));
      if (input.prepare_claim || input.sweep_token) {
        if (ctx.channel !== "web" || !ctx.wallet) return { error: "Claiming requires a connected wallet in the web app (/fees)." };
        const txs: TxRequest[] = [];
        if (input.sweep_token) {
          const l = await resolveToken(String(input.sweep_token));
          if (l) txs.push(buildSweep(l));
        }
        if (BigInt(f.claimableEth) > 0n || txs.length) txs.push(buildClaim());
        if (!txs.length) return { claimableEth: "0", note: "Nothing to claim yet." };
        actions.push({ type: "txs", title: "Claim creator fees", txs, summary: { Claimable: `${formatUnits(BigInt(f.claimableEth), 18)} ETH` } });
      }
      return {
        claimableEth: formatUnits(BigInt(f.claimableEth), 18),
        claimableUsd: Math.round(f.claimableUsd * 100) / 100,
        tokensCreated: f.tokens.map((t) => ({ symbol: t.token.symbol, token: t.token.token, marketCapUsd: Math.round(t.token.marketCapUsd) })),
      };
    }
    case "market_overview": {
      const ls = allLaunches();
      const now = Date.now() / 1000;
      return { ethUsd: await ethUsd(), totalLaunches: ls.length, launches24h: ls.filter((l) => l.timestamp > now - 86400).length };
    }
  }
  return { error: `Unknown tool ${name}` };
}

function systemPrompt(ctx: AgentContext) {
  return `You are ${BRAND.name}, an AI crypto agent and token launchpad assistant on Robinhood Chain (an Ethereum L2, chain id 4663, gas in ETH).
You help users discover, research, trade and launch tokens on the ${BRAND.name} launchpad: every token has a fixed 1B supply, trades on a bonding curve priced in ETH, and graduates automatically into a permanently locked Uniswap v4 pool when the curve raises its target. Creators earn fees on every trade forever.

Rules:
- Always use tools for live data. Never invent prices, addresses or balances.
- You never hold user funds. Trades and wallet launches are prepared as transactions the user signs; never say they are done until a tool reports it launched.
- Before preparing a trade with a large amount (> 0.5 ETH) or a launch, restate the key details in one line.
- Refer to the launchpad only as the "${BRAND.name} launchpad". Do not name third-party launchpad protocols.
- Tokens are highly speculative; do not give financial advice or promise returns.
- Be concise: short sentences, numbers formatted (e.g. $12.3K), tickers with $.
- Never use em dashes, en dashes or hyphens as punctuation. Use commas, periods or colons instead.
- Free plan: ${CLUB.freeMessagesPerDay} messages/day. ${BRAND.name} Club removes the limit.
- Only Club members can launch tokens. Club means holding at least ${CLUB.minHold.toLocaleString("en-US")} $${CLUB.symbol}. If a launch is refused for this, explain it and point to /club.

Channel: ${ctx.channel}. ${ctx.wallet ? `User wallet: ${ctx.wallet}.` : "No wallet connected."}${
    ctx.channel === "web" ? " In the web app, prepared transactions appear as cards with a Confirm button." : " In this channel the user cannot sign transactions; offer sponsored launches (fee recipient address required) and point to the web app for trading."
  }${ctx.attachedImage ? ` The user attached an image: ${ctx.attachedImage} (use it as the logo when launching).` : ""}`;
}

/** House style: no em/en dashes or spaced hyphens used as punctuation. Markdown list bullets are kept. */
export function noDashes(t: string) {
  return t
    .replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, "$1 to $2")
    .replace(/\s*[\u2014\u2013]\s*/g, ", ")
    .replace(/(\S) - (\S)/g, "$1, $2")
    .replace(/, ([.,;:!?])/g, "$1");
}

export async function runAgent(history: Anthropic.MessageParam[], ctx: AgentContext): Promise<AgentResult> {
  const actions: AgentAction[] = [];
  const messages: Anthropic.MessageParam[] = history.slice(-20);
  for (let i = 0; i < 8; i++) {
    const res = await callModel(systemPrompt(ctx), messages);

    if (res.stop_reason === "refusal") {
      return { text: "I can't help with that request.", actions };
    }
    messages.push({ role: "assistant", content: res.content as Anthropic.ContentBlockParam[] });
    const toolUses = res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (res.stop_reason !== "tool_use" || !toolUses.length) {
      const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
      return { text: noDashes(text) || "Done.", actions };
    }
    const results = await Promise.all(
      toolUses.map(async (tu): Promise<Anthropic.ToolResultBlockParam> => {
        try {
          const out = await runTool(tu.name, (tu.input ?? {}) as Record<string, unknown>, ctx, actions);
          return { type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(out, (_k, v) => (typeof v === "bigint" ? v.toString() : v)) };
        } catch (e) {
          return { type: "tool_result", tool_use_id: tu.id, content: (e as Error).message || "Tool failed", is_error: true };
        }
      }),
    );
    messages.push({ role: "user", content: results });
  }
  return { text: "I ran out of steps on that one. Could you narrow the request?", actions };
}
