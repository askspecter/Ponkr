import { TOTAL_SUPPLY } from "./config";

const BPS = 10_000n;

export interface CurveState {
  quoteReserve: bigint; // virtual (includes phantom liquidity)
  tokenReserve: bigint;
  feeBps: bigint;
  creatorTaxBps: bigint;
  snipeTaxBps?: bigint;
}

/** Buy: fees are taken from the quote input before pricing. */
export function quoteBuy(s: CurveState, quoteIn: bigint) {
  const feeTotalBps = s.feeBps + s.creatorTaxBps + (s.snipeTaxBps ?? 0n);
  const fees = (quoteIn * feeTotalBps) / BPS;
  const net = quoteIn - fees;
  if (net <= 0n) return { tokensOut: 0n, fees, priceImpactBps: 0n };
  const tokensOut = (s.tokenReserve * net) / (s.quoteReserve + net);
  const spot = priceE18(s.quoteReserve, s.tokenReserve);
  const nq = s.quoteReserve + net;
  const nt = s.tokenReserve - tokensOut;
  const after = priceE18(nq, nt);
  const priceImpactBps = spot > 0n ? ((after - spot) * BPS) / spot : 0n;
  return { tokensOut, fees, priceImpactBps };
}

/** Sell: priced first, then fees are taken from the quote output. */
export function quoteSell(s: CurveState, tokensIn: bigint) {
  const gross = (s.quoteReserve * tokensIn) / (s.tokenReserve + tokensIn);
  const fees = (gross * (s.feeBps + s.creatorTaxBps)) / BPS;
  const quoteOut = gross - fees;
  const spot = priceE18(s.quoteReserve, s.tokenReserve);
  const after = priceE18(s.quoteReserve - gross, s.tokenReserve + tokensIn);
  const priceImpactBps = spot > 0n ? ((spot - after) * BPS) / spot : 0n;
  return { quoteOut, fees, priceImpactBps };
}

/** Price of one whole token in quote, scaled 1e18. */
export function priceE18(quoteReserve: bigint, tokenReserve: bigint) {
  if (tokenReserve === 0n) return 0n;
  return (quoteReserve * 10n ** 18n) / tokenReserve;
}

export function marketCapQuote(quoteReserve: bigint, tokenReserve: bigint) {
  return (priceE18(quoteReserve, tokenReserve) * TOTAL_SUPPLY) / 10n ** 18n;
}

export function withSlippage(amount: bigint, slippageBps: number) {
  return (amount * (BPS - BigInt(Math.round(slippageBps)))) / BPS;
}

export function progressPct(realQuote: bigint, threshold: bigint) {
  if (threshold === 0n) return 0;
  const p = Number((realQuote * 10000n) / threshold) / 100;
  return Math.min(100, Math.max(0, p));
}
