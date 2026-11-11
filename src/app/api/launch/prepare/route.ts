import { getAddress, isAddress } from "viem";
import { requireClub } from "@/lib/server/accounts";
import { verifiedWallets } from "@/lib/server/privy";
import { buildLaunch, type LaunchInput } from "@/lib/server/tx";
import { err, handle, json } from "@/lib/server/http";

export async function POST(req: Request) {
  return handle(async () => {
    const body = (await req.json()) as LaunchInput & { sender: string };
    if (!isAddress(body.sender)) return err("Sign in first");
    const sender = getAddress(body.sender);
    const { wallets } = await verifiedWallets(req, sender);
    if (!wallets.some((w) => w.toLowerCase() === sender.toLowerCase())) return err("Sign in with the wallet you are launching from.", 401);
    try {
      await requireClub([sender]);
      return json(await buildLaunch(body, sender));
    } catch (e) {
      return err((e as Error).message, 403);
    }
  });
}
