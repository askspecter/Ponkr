import { getAddress, isAddress, parseEther, parseUnits } from "viem";
import { resolveToken } from "@/lib/server/tokens";
import { buildBuy, buildSell } from "@/lib/server/tx";
import { err, handle, json } from "@/lib/server/http";

export async function POST(req: Request) {
  return handle(async () => {
    const b = (await req.json()) as { token: string; side: "buy" | "sell"; amount: string; wallet: string; slippageBps?: number };
    if (!isAddress(b.wallet)) return err("Connect a wallet first");
    const l = await resolveToken(b.token);
    if (!l) return err("Token not found", 404);
    try {
      const wallet = getAddress(b.wallet);
      const r = b.side === "sell"
        ? await buildSell(l, parseUnits(b.amount, 18), wallet, b.slippageBps ?? 300)
        : await buildBuy(l, parseEther(b.amount as `${number}`), wallet, b.slippageBps ?? 300);
      return json(r);
    } catch (e) {
      return err((e as Error).message);
    }
  });
}
