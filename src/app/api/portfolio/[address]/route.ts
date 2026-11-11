import { getAddress, isAddress } from "viem";
import { walletHoldings } from "@/lib/server/tokens";
import { err, handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ address: string }> }) {
  return handle(async () => {
    const { address } = await params;
    if (!isAddress(address)) return err("Invalid address");
    return json(await walletHoldings(getAddress(address)));
  });
}
