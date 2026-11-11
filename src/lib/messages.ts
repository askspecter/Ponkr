import { getAddress } from "viem";

export function sessionMessage(address: string, issuedAt: string) {
  return `Sign in to Ponkr\nWallet: ${getAddress(address)}\nIssued: ${issuedAt}\n\nThis signature is free and only proves you own this wallet.`;
}

export function apiKeyMessage(owner: string, nonce: string) {
  return `Ponkr API key request\nWallet: ${getAddress(owner)}\nNonce: ${nonce}\n\nSigning is free and does not send a transaction.`;
}

export function sponsoredLaunchMessage(symbol: string, feeRecipient: string, nonce: string) {
  return `Ponkr sponsored launch\n$${symbol.toUpperCase()}\nFee recipient: ${getAddress(feeRecipient)}\nNonce: ${nonce}`;
}
