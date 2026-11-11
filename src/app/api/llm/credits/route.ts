import { creditTopUp } from "@/lib/server/llm";
import { verifiedWallets } from "@/lib/server/privy";
import { err, handle, json } from "@/lib/server/http";

export const maxDuration = 90;

/** POST { txHash, address } after paying ETH to the treasury. */
export async function POST(req: Request) {
  return handle(async () => {
    const b = (await req.json()) as { txHash?: string; address?: string };
    if (!b.txHash || !/^0x[0-9a-fA-F]{64}$/.test(b.txHash)) return err("Invalid transaction hash");
    const { wallets } = await verifiedWallets(req, b.address);
    if (!wallets.length) return err("Sign in first", 401);
    try {
      return json(await creditTopUp(b.txHash as `0x${string}`, wallets));
    } catch (e) {
      return err((e as Error).message);
    }
  });
}
