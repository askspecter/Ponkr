import { getAddress, isAddress } from "viem";
import { balanceMicro, gatewayEnabled, topUpHistory, usageReport } from "@/lib/server/llm";
import { verifiedWallets } from "@/lib/server/privy";
import { err, handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Balance, usage and top up history for the signed in wallet. */
export async function GET(req: Request) {
  return handle(async () => {
    const address = new URL(req.url).searchParams.get("address") || "";
    if (!isAddress(address)) return err("Sign in first", 401);
    const { wallets } = await verifiedWallets(req, address);
    if (!wallets.some((w) => w.toLowerCase() === address.toLowerCase())) return err("Sign in with this wallet", 401);
    const wallet = getAddress(address);
    const [balance, usage, topups] = await Promise.all([balanceMicro(wallet), usageReport(wallet), topUpHistory(wallet)]);
    return json({ enabled: gatewayEnabled(), wallet, balanceUsd: balance / 1_000_000, usage, topups });
  });
}
