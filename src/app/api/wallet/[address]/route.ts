import { getAddress, isAddress } from "viem";
import { walletOverview } from "@/lib/server/wallet";
import { err, handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Balances, positions with PnL, and recent launchpad activity for a wallet. */
export async function GET(_req: Request, { params }: { params: Promise<{ address: string }> }) {
  return handle(async () => {
    const { address } = await params;
    if (!isAddress(address)) return err("Invalid address");
    return json(await walletOverview(getAddress(address)));
  });
}
