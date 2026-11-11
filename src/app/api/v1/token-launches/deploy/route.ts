import { getAddress, isAddress } from "viem";
import { authApiKey, requireClub } from "@/lib/server/accounts";
import { deployerEnabled, sponsoredLaunch } from "@/lib/server/deployer";
import { pinFromUrl } from "@/lib/server/ipfs";
import { err, handle, json } from "@/lib/server/http";

/**
 * POST /api/v1/token-launches/deploy
 * { name, symbol, image (ipfs:// or https), description?, feeRecipient?, creatorTaxBps?, socials? }
 * Gas-sponsored; creator fees go to feeRecipient (defaults to the key owner's wallet).
 */
export async function POST(req: Request) {
  return handle(async () => {
    const a = await authApiKey(req);
    if ("error" in a) return err(a.error!, a.status);
    if (!deployerEnabled()) return err("Sponsored launches are disabled on this server.", 503);
    const b = (await req.json()) as { name: string; symbol: string; image: string; description?: string; feeRecipient?: string; creatorTaxBps?: number; socials?: Record<string, string>; simulate?: boolean };
    const feeRecipient = b.feeRecipient && isAddress(b.feeRecipient) ? getAddress(b.feeRecipient) : a.key.owner;
    try {
      await requireClub([a.key.owner]);
      let logo = b.image;
      if (logo?.startsWith("http")) logo = await pinFromUrl(logo);
      const r = await sponsoredLaunch(
        { name: b.name, symbol: b.symbol, logo, description: b.description, feeRecipient, creatorTaxBps: b.creatorTaxBps, socials: b.socials },
        `key-owner:${a.key.owner.toLowerCase()}`,
      );
      return json({ success: true, tokenAddress: r.token, curveAddress: r.curve, txHash: r.txHash, feeRecipient: r.feeRecipient });
    } catch (e) {
      return err((e as Error).message);
    }
  });
}
