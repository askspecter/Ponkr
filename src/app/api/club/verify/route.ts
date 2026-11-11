import { getAddress, isAddress, type Hex } from "viem";
import { verifyClubPayment } from "@/lib/server/accounts";
import { err, handle, json } from "@/lib/server/http";

export async function POST(req: Request) {
  return handle(async () => {
    const b = (await req.json()) as { txHash: Hex; address: string };
    if (!isAddress(b.address) || !/^0x[0-9a-fA-F]{64}$/.test(b.txHash)) return err("Invalid input");
    try {
      return json(await verifyClubPayment(b.txHash, getAddress(b.address)));
    } catch (e) {
      return err((e as Error).message);
    }
  });
}
