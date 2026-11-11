import { isAddress, getAddress } from "viem";
import { findLaunch } from "@/lib/server/indexer";
import { buildClaim, buildClaimToken, buildSweep } from "@/lib/server/tx";
import { err, handle, json } from "@/lib/server/http";

export async function POST(req: Request) {
  return handle(async () => {
    const b = (await req.json()) as { kind: "claim" | "claimToken" | "sweep"; token?: string };
    if (b.kind === "claim") return json({ txs: [buildClaim()] });
    if (!b.token || !isAddress(b.token)) return err("token required");
    if (b.kind === "claimToken") return json({ txs: [buildClaimToken(getAddress(b.token))] });
    const l = findLaunch(b.token);
    if (!l) return err("Token not found", 404);
    return json({ txs: [buildSweep(l), buildClaim()] });
  });
}
