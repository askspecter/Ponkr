import { CLUB } from "@/lib/config";
import { clientIp, clubStatus, usage } from "@/lib/server/accounts";
import { deployerEnabled } from "@/lib/server/deployer";
import { handle, json } from "@/lib/server/http";
import { verifiedWallets } from "@/lib/server/privy";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const address = new URL(req.url).searchParams.get("address") || undefined;
    const { user, wallets } = await verifiedWallets(req, address);
    const status = await clubStatus(wallets);
    const identity = user ? `privy:${user.userId}` : `ip:${clientIp(req)}`;
    return json({
      ...status,
      messagesUsed: await usage("chat", identity),
      freeLimit: CLUB.freeMessagesPerDay,
      sponsoredLaunches: deployerEnabled(),
    });
  });
}
