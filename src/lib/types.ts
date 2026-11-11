export interface TokenView {
  token: `0x${string}`;
  curve: `0x${string}`;
  creator: `0x${string}`;
  pairToken: `0x${string}`;
  threshold: string;
  block: string;
  txHash: string;
  timestamp: number;
  name: string;
  symbol: string;
  logo: string;
  description: string;
  socials: { twitter: string; telegram: string; discord: string; website: string; farcaster: string };
  viaApp?: boolean;
  live: { quoteReserve: string; tokenReserve: string; realQuote: string; graduated: boolean; feeBps: string; creatorTaxBps: string };
  priceEth: number;
  priceUsd: number;
  marketCapEth: number;
  marketCapUsd: number;
  progress: number;
  isNative: boolean;
  volume24hEth?: number;
  change24h?: number;
  trades24h?: number;
}

export interface Trade {
  side: "buy" | "sell";
  trader: `0x${string}`;
  quote: string;
  tokens: string;
  fee: string;
  tax: string;
  block: string;
  txHash: string;
  timestamp: number;
}
