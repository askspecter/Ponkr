import { getAddress, isAddress, verifyMessage, type Hex } from "viem";
import { deployerEnabled, sponsoredLaunch } from "@/lib/server/deployer";
import { sponsoredLaunchMessage } from "@/lib/messages";
import type { LaunchInput } from "@/lib/server/tx";
import { err, handle, json } from "@/lib/server/http";

/** Gasless launch from the web form. The wallet signs a message to prove ownership of the fee recipient. */
export async function POST(req: Request) {
  return handle(async () => {
    if (!deployerEnabled()) return err("Sponsored launches are disabled on this server.", 503);
    const body = (await req.json()) as LaunchInput & { owner: string; nonce: string; signature: Hex };
    if (!isAddress(body.owner)) return err("Connect a wallet first");
    const owner = getAddress(body.owner);
    if (Math.abs(Date.now() - Number(body.nonce)) > 10 * 60_000) return err("Signature expired");
    const ok = await verifyMessage({ address: owner, message: sponsoredLaunchMessage(String(body.symbol), body.feeRecipient, body.nonce), signature: body.signature });
    if (!ok) return err("Invalid signature", 401);
    try {
      return json(await sponsoredLaunch({ ...body, initialBuyEth: undefined }, `wallet:${owner.toLowerCase()}`));
    } catch (e) {
      return err((e as Error).message);
    }
  });
}
