import { formatUnits } from "viem";

export function shortAddr(a?: string, n = 4) {
  if (!a) return "";
  return `${a.slice(0, 2 + n)}…${a.slice(-n)}`;
}

export function fmtNum(n: number, max = 2) {
  if (!isFinite(n)) return "n/a";
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(max) + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(max) + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(max) + "K";
  if (abs === 0) return "0";
  if (abs < 0.0001) return n.toExponential(2);
  return n.toLocaleString("en-US", { maximumFractionDigits: abs < 1 ? 6 : max });
}

export function fmtUsd(n: number) {
  if (!isFinite(n)) return "n/a";
  if (Math.abs(n) < 0.01 && n !== 0) return "$" + n.toPrecision(3);
  return "$" + fmtNum(n);
}

export function fmtEth(wei: bigint | string, digits = 4) {
  const v = Number(formatUnits(BigInt(wei), 18));
  return fmtNum(v, digits) + " ETH";
}

export function timeAgo(tsSec: number) {
  const d = Math.max(0, Date.now() / 1000 - tsSec);
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}
