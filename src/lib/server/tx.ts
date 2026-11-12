import "server-only";
import { encodeFunctionData, getAddress, keccak256, maxUint256, parseEther, toHex, type Address, type Hex } from "viem";
import { curveAbi, escrowAbi, factoryAbi, routerAbi, tokenAbi } from "../abis";
import { CONTRACTS, DEFAULT_LAUNCH_CONFIG_ID, NATIVE, robinhoodChain } from "../config";
import { quoteBuy, quoteSell, withSlippage } from "../math";
import type { Launch } from "./indexer";
import { liveStates } from "./indexer";
import { rpc } from "./rpc";

export interface TxRequest {
  to: Address;
  data: Hex;
  value: string;
  chainId: number;
  description: string;
}

const tx = (to: Address, data: Hex, value: bigint, description: string): TxRequest => ({
  to,
  data,
  value: value.toString(),
  chainId: robinhoodChain.id,
  description,
});

async function curveState(l: Launch, recipient?: Address) {
  const live = (await liveStates([l.curve], 2_000)).get(l.curve.toLowerCase())!;
  let snipeTaxBps = 0n;
  if (recipient) {
    try {
      snipeTaxBps = await rpc().readContract({ address: l.curve, abi: curveAbi, functionName: "currentSnipeTaxBps", args: [recipient] });
    } catch {
      /* not in snipe window */
    }
  }
  return {
    live,
    state: {
      quoteReserve: BigInt(live.quoteReserve),
      tokenReserve: BigInt(live.tokenReserve),
      feeBps: BigInt(live.feeBps),
      creatorTaxBps: BigInt(live.creatorTaxBps),
      snipeTaxBps,
    },
  };
}

export async function quote(l: Launch, side: "buy" | "sell", amountWei: bigint, recipient?: Address) {
  const { live, state } = await curveState(l, recipient);
  if (live.graduated) return { graduated: true as const };
  if (side === "buy") {
    const q = quoteBuy(state, amountWei);
    return { graduated: false as const, side, amountIn: amountWei, amountOut: q.tokensOut, fees: q.fees, priceImpactBps: q.priceImpactBps, snipeTaxBps: state.snipeTaxBps };
  }
  const q = quoteSell(state, amountWei);
  return { graduated: false as const, side, amountIn: amountWei, amountOut: q.quoteOut, fees: q.fees, priceImpactBps: q.priceImpactBps, snipeTaxBps: 0n };
}

export async function buildBuy(l: Launch, quoteIn: bigint, recipient: Address, slippageBps = 300) {
  if (l.pairToken !== NATIVE) throw new Error("Only ETH-paired tokens are supported for trading in this app.");
  const q = await quote(l, "buy", quoteIn, recipient);
  if (q.graduated) throw new Error(`${l.symbol} has graduated to the DEX pool; trade it on a Uniswap v4 interface.`);
  const minOut = withSlippage(q.amountOut, slippageBps);
  return {
    quote: q,
    txs: [
      tx(l.curve, encodeFunctionData({ abi: curveAbi, functionName: "buy", args: [quoteIn, minOut, recipient] }), quoteIn, `Buy $${l.symbol} with ${Number(quoteIn) / 1e18} ETH`),
    ],
  };
}

export async function buildSell(l: Launch, tokensIn: bigint, owner: Address, slippageBps = 300) {
  if (l.pairToken !== NATIVE) throw new Error("Only ETH-paired tokens are supported for trading in this app.");
  const q = await quote(l, "sell", tokensIn);
  if (q.graduated) throw new Error(`${l.symbol} has graduated to the DEX pool; trade it on a Uniswap v4 interface.`);
  const minOut = withSlippage(q.amountOut, slippageBps);
  const txs: TxRequest[] = [];
  const allowance = await rpc().readContract({ address: l.token, abi: tokenAbi, functionName: "allowance", args: [owner, l.curve] });
  if (allowance < tokensIn) {
    txs.push(tx(l.token, encodeFunctionData({ abi: tokenAbi, functionName: "approve", args: [l.curve, maxUint256] }), 0n, `Approve $${l.symbol} for selling`));
  }
  txs.push(tx(l.curve, encodeFunctionData({ abi: curveAbi, functionName: "sell", args: [tokensIn, minOut, owner] }), 0n, `Sell ${Number(tokensIn) / 1e18} $${l.symbol}`));
  return { quote: q, txs };
}

export interface LaunchInput {
  name: string;
  symbol: string;
  logo: string; // ipfs:// URI or https URL of stored logo
  description?: string;
  socials?: Partial<{ twitter: string; telegram: string; discord: string; website: string; farcaster: string }>;
  feeRecipient: Address;
  creatorTaxBps?: number;
  buybackEnabled?: boolean;
  initialBuyEth?: string;
}

export function validateLaunch(i: LaunchInput) {
  const name = i.name?.trim();
  const symbol = i.symbol?.trim().replace(/^\$/, "").toUpperCase();
  if (!name || name.length > 32) throw new Error("Name is required (max 32 chars).");
  if (!symbol || !/^[A-Z0-9]{1,10}$/.test(symbol)) throw new Error("Symbol must be 1-10 letters/numbers.");
  if (!i.logo || !/^(ipfs:\/\/|https:\/\/)/.test(i.logo)) throw new Error("A logo is required. Upload an image first.");
  const tax = Math.round(i.creatorTaxBps ?? 100);
  if (tax < 0 || tax > 1000) throw new Error("Creator tax must be between 0 and 10%.");
  return { name, symbol, tax, feeRecipient: getAddress(i.feeRecipient) };
}

export async function buildLaunch(i: LaunchInput, sender: Address) {
  const v = validateLaunch(i);
  const client = rpc();
  const [fee, econ, maxTax] = await Promise.all([
    client.readContract({ address: CONTRACTS.factory, abi: factoryAbi, functionName: "launchFee" }),
    client.readContract({ address: CONTRACTS.factory, abi: factoryAbi, functionName: "previewLaunchEconomics", args: [DEFAULT_LAUNCH_CONFIG_ID, NATIVE] }),
    client.readContract({ address: CONTRACTS.factory, abi: factoryAbi, functionName: "maxCreatorTaxBps" }),
  ]);
  if (BigInt(v.tax) > maxTax) throw new Error(`Creator tax exceeds protocol max (${Number(maxTax) / 100}%).`);
  const s = i.socials ?? {};
  const params = {
    name: v.name,
    symbol: v.symbol,
    logo: i.logo,
    description: (i.description ?? "").slice(0, 500),
    socials: { twitter: s.twitter ?? "", telegram: s.telegram ?? "", discord: s.discord ?? "", website: s.website ?? "", farcaster: s.farcaster ?? "" },
    creatorFeeRecipient: v.feeRecipient,
    creatorTaxBps: v.tax,
    buybackEnabled: Boolean(i.buybackEnabled),
    expectedEconomics: econ,
    salt: keccak256(toHex(`${sender}:${v.symbol}:${Date.now()}:${Math.random()}`)),
  };
  const buy = i.initialBuyEth && Number(i.initialBuyEth) > 0 ? parseEther(i.initialBuyEth) : 0n;
  let t: TxRequest;
  let predicted: { token: Address; curve: Address } | undefined;
  if (buy > 0n) {
    const data = encodeFunctionData({ abi: routerAbi, functionName: "launchAndBuy", args: [params, DEFAULT_LAUNCH_CONFIG_ID, NATIVE, buy, 0n, v.feeRecipient, [v.feeRecipient, sender]] });
    t = tx(CONTRACTS.launchAndBuyRouter, data, fee + buy, `Launch $${v.symbol} and buy ${i.initialBuyEth} ETH`);
  } else {
    const data = encodeFunctionData({ abi: factoryAbi, functionName: "launchToken", args: [params, DEFAULT_LAUNCH_CONFIG_ID, NATIVE] });
    t = tx(CONTRACTS.factory, data, fee, `Launch $${v.symbol}`);
  }
  // Simulate with a balance override so we surface reverts before the user signs.
  try {
    const r = await client.call({ account: sender, to: t.to, data: t.data, value: BigInt(t.value), stateOverride: [{ address: sender, balance: BigInt(t.value) + parseEther("1") }] });
    if (r.data && r.data.length >= 130) {
      predicted = { token: getAddress(`0x${r.data.slice(26, 66)}`), curve: getAddress(`0x${r.data.slice(90, 130)}`) };
    }
  } catch (e) {
    const msg = (e as { shortMessage?: string }).shortMessage ?? String(e);
    throw new Error(`Launch simulation failed: ${msg}`);
  }
  return { tx: t, predicted, launchFee: fee.toString(), params: { ...params, initialBuyWei: buy.toString() } };
}

export function buildClaim(): TxRequest {
  return tx(CONTRACTS.feeEscrow, encodeFunctionData({ abi: escrowAbi, functionName: "claim" }), 0n, "Claim creator fees (ETH)");
}

export function buildClaimToken(token: Address): TxRequest {
  return tx(CONTRACTS.feeEscrow, encodeFunctionData({ abi: escrowAbi, functionName: "claimToken", args: [token] }), 0n, "Claim creator fees (token)");
}

export function buildSweep(l: Launch): TxRequest {
  return tx(l.curve, encodeFunctionData({ abi: curveAbi, functionName: "sweepFees", args: [0n] }), 0n, `Sweep accrued fees for $${l.symbol}`);
}
