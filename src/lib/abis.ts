import { parseAbi } from "viem";

const SOCIALS =
  "(string twitter,string telegram,string discord,string website,string farcaster)";
const TOKEN_PARAMS = `(string name,string symbol,string logo,string description,${SOCIALS} socials,address creatorFeeRecipient,uint16 creatorTaxBps,bool buybackEnabled,bytes32 expectedEconomics,bytes32 salt)`;

export const factoryAbi = parseAbi([
  `function launchToken(${TOKEN_PARAMS} params,uint256 launchConfigId,address pairToken) payable returns (address token,address curve)`,
  `function launchToken(${TOKEN_PARAMS} params,uint256 launchConfigId,address pairToken,address[] snipeTaxExemptions) payable returns (address token,address curve)`,
  "function previewLaunchEconomics(uint256 launchConfigId,address pairToken) view returns (bytes32)",
  "function launchFee() view returns (uint256)",
  "function launchConfigCount() view returns (uint256)",
  "function maxCreatorTaxBps() view returns (uint256)",
  "function canLaunch(address account) view returns (bool)",
  "function snipeTaxStartBps() view returns (uint256)",
  "function snipeTaxSeconds() view returns (uint256)",
  "function transferCreatorFeeRecipient(address token,address newRecipient)",
  "event TokenLaunched(address indexed token,address indexed curve,address indexed creator,address pairToken,uint256 launchConfigId,uint256 graduationThreshold)",
]);

/** Static prefix of the getLaunchedToken() record. */
export const launchedTokenPrefix = [
  { type: "address", name: "token" },
  { type: "address", name: "curve" },
  { type: "address", name: "creator" },
  { type: "address", name: "creatorFeeRecipient" },
  { type: "address", name: "pairToken" },
  { type: "uint256", name: "graduationThreshold" },
] as const;

export const routerAbi = parseAbi([
  `function launchAndBuy(${TOKEN_PARAMS} params,uint256 launchConfigId,address pairToken,uint256 quoteIn,uint256 minTokensOut,address recipient,address[] snipeTaxExemptions) payable returns (address token,address curve,uint256 tokensOut)`,
]);

export const curveAbi = parseAbi([
  "function buy(uint256 quoteIn,uint256 minTokensOut,address recipient) payable returns (uint256 tokensOut)",
  "function sell(uint256 tokensIn,uint256 minQuoteOut,address recipient) returns (uint256 quoteOut)",
  "function getReserves() view returns (uint256 quoteReserve,uint256 tokenReserve)",
  "function realQuoteReserve() view returns (uint256)",
  "function sellableTokens() view returns (uint256)",
  "function feeBps() view returns (uint256)",
  "function creatorTaxBps() view returns (uint256)",
  "function currentSnipeTaxBps(address recipient) view returns (uint256)",
  "function readyToGraduate() view returns (bool)",
  "function graduated() view returns (bool)",
  "function graduationThreshold() view returns (uint256)",
  "function isNativeQuote() view returns (bool)",
  "function pairToken() view returns (address)",
  "function protocolFeeShareBps() view returns (uint256)",
  "function buybackBurnBps() view returns (uint256)",
  "function buybackEnabled() view returns (bool)",
  "function phantomQuote() view returns (uint256)",
  "function token() view returns (address)",
  "function sweepFees(uint256 minBuybackTokensOut)",
  "event CurveBuy(address indexed buyer,address indexed recipient,uint256 quoteIn,uint256 tokensOut,uint256 fee,uint256 tax)",
  "event CurveSell(address indexed seller,address indexed recipient,uint256 tokensIn,uint256 quoteOut,uint256 fee,uint256 tax)",
]);

export const tokenAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function approve(address spender,uint256 amount) returns (bool)",
  `function getTokenInfo() view returns (address creator,string logo,string description,${SOCIALS} socials)`,
  "event Transfer(address indexed from,address indexed to,uint256 value)",
]);

export const escrowAbi = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function balanceOfToken(address account,address token) view returns (uint256)",
  "function claim() returns (uint256)",
  "function claimToken(address token) returns (uint256)",
]);
