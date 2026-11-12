import { defineChain, type Address } from "viem";

export const BRAND = {
  name: "Kekr",
  tagline: "Your AI trading agent & token launchpad",
  twitter: process.env.NEXT_PUBLIC_X_HANDLE || "kekrbot",
  telegramBot: process.env.NEXT_PUBLIC_TELEGRAM_BOT || "kekr_bot",
};

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";

export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://robinhoodchain.blockscout.com" },
  },
  contracts: {
    multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" },
  },
});

export const EXPLORER = robinhoodChain.blockExplorers.default.url;

/** On-chain launchpad protocol contracts (Robinhood Chain mainnet). */
export const CONTRACTS = {
  factory: "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e",
  launchAndBuyRouter: "0xe33E9E479dF8802cb0866d5d05258bEc4cF62948",
  hook: "0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044",
  locker: "0x267444D099b10fB5Ed7c3Cc7B7c767AdcA574952",
  feeEscrow: "0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e",
  buybackVault: "0x42df2a798f82289E177311362e8f5ccC45c1219c",
  poolManager: "0x8366a39cc670b4001a1121b8f6a443a643e40951",
} as const satisfies Record<string, Address>;

export const NATIVE: Address = "0x0000000000000000000000000000000000000000";

/** Quote assets we can price in USD. Others still trade on-chain but show no USD value. */
export const PAIR_TOKENS: Record<string, { symbol: string; decimals: number; usd: "eth" | "btc" | number }> = {
  [NATIVE]: { symbol: "ETH", decimals: 18, usd: "eth" },
  "0x5fc5360d0400a0fd4f2af552add042d716f1d168": { symbol: "USDG", decimals: 6, usd: 1 },
  "0xcec185eb182c47d1ba1efc84e6959e18cd620be4": { symbol: "cbBTC", decimals: 8, usd: "btc" },
};

/** keccak256("TokenLaunched(address,address,address,address,uint256,uint256)") */
export const TOKEN_LAUNCHED_TOPIC =
  "0x8d4aad4953d0ca700d468f3753aa14432d1b35b43ec6409f051fb6aa43a89607";

/**
 * Where the launch indexer starts. The factory has emitted ~900k launches since block ~26.8M,
 * so by default we index a recent window (INDEXER_LOOKBACK_BLOCKS, ~14 days at 0.1s blocks).
 * Older tokens are still resolved on demand by address. Set INDEXER_START_BLOCK to override.
 */
export const START_BLOCK = process.env.INDEXER_START_BLOCK ? BigInt(process.env.INDEXER_START_BLOCK) : undefined;
export const LOOKBACK_BLOCKS = BigInt(process.env.INDEXER_LOOKBACK_BLOCKS || "12000000");
/** Max block span per eth_getLogs call (official RPC accepts large spans). */
export const LOG_CHUNK = BigInt(process.env.INDEXER_LOG_CHUNK || "2000000");

/** Tick spacing of graduated Uniswap v4 pools (fee = 0, the hook charges the fee). */
export const GRADUATED_TICK_SPACING = 200;

export const TOTAL_SUPPLY = 1_000_000_000n * 10n ** 18n;
export const DEFAULT_LAUNCH_CONFIG_ID = 0n;

/**
 * Club = wallets holding at least `minHold` of the official token. Only Club members can launch.
 * Until the official token address is set, only CLUB_ALLOWLIST wallets (server env) count as Club,
 * so the team can launch the official token itself.
 */
export const CLUB = {
  token: (process.env.NEXT_PUBLIC_OFFICIAL_TOKEN_ADDRESS || "") as Address | "",
  symbol: process.env.NEXT_PUBLIC_OFFICIAL_TOKEN_SYMBOL || "KEKR",
  minHold: Number(process.env.NEXT_PUBLIC_CLUB_MIN_HOLD || 1_000_000),
  freeMessagesPerDay: Number(process.env.FREE_MESSAGES_PER_DAY || 5),
  apiDailyFree: 100,
  apiDailyClub: 1000,
};

/** LLM Gateway credits: top ups are paid in ETH to the treasury and credited in USD. */
export const LLM = {
  treasury: (process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "") as Address | "",
  minTopUpUsd: Number(process.env.NEXT_PUBLIC_LLM_MIN_TOPUP_USD || 1),
};

export const IPFS_GATEWAY =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://ipfs.io/ipfs/";

export function ipfsToHttp(uri?: string | null): string | undefined {
  if (!uri) return undefined;
  if (uri.startsWith("ipfs://")) return IPFS_GATEWAY + uri.slice(7);
  if (uri.startsWith("http")) return uri;
  return undefined;
}
