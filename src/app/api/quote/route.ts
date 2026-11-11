import { isAddress, parseEther, parseUnits, type Address } from "viem";
import { resolveToken } from "@/lib/server/tokens";
import { quote } from "@/lib/server/tx";
import { err, handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const u = new URL(req.url);
    const l = await resolveToken(u.searchParams.get("token") || "");
    if (!l) return err("Token not found", 404);
    const side = u.searchParams.get("side") === "sell" ? "sell" : "buy";
    const amount = u.searchParams.get("amount") || "0";
    const wallet = u.searchParams.get("wallet");
    const wei = side === "buy" ? parseEther(amount as `${number}`) : parseUnits(amount, 18);
    const q = await quote(l, side, wei, wallet && isAddress(wallet) ? (wallet as Address) : undefined);
    return json(q);
  });
}
