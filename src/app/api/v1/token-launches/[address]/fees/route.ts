import { getAddress, isAddress } from "viem";
import { creatorFees } from "@/lib/server/tokens";
import { buildClaim } from "@/lib/server/tx";
import { err, handle, json } from "@/lib/server/http";

/** GET claimable fees for a creator/fee-recipient wallet, plus the unsigned claim tx. */
export async function GET(_req: Request, { params }: { params: Promise<{ address: string }> }) {
  return handle(async () => {
    const { address } = await params;
    if (!isAddress(address)) return err("Invalid address");
    const f = await creatorFees(getAddress(address));
    return json({ ...f, claimTx: buildClaim() });
  });
}
