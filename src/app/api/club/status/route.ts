import { CLUB } from "@/lib/config";
import { clientIp, clubExpiry, usage } from "@/lib/server/accounts";
import { deployerEnabled } from "@/lib/server/deployer";
import { json } from "@/lib/server/http";
import { authUser } from "@/lib/server/privy";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get("address") || undefined;
  const exp = clubExpiry(address);
  const user = await authUser(req);
  const identity = user ? `privy:${user.userId}` : `ip:${clientIp(req)}`;
  return json({
    club: exp > Date.now(),
    expiresAt: exp || null,
    messagesUsed: usage("chat", identity),
    freeLimit: CLUB.freeMessagesPerDay,
    sponsoredLaunches: deployerEnabled(),
  });
}
