import type { Address } from "viem";
import { addRule, autopilotEnabled, autopilotOverview, autopilotWallet, cancelRule, updateSettings, withdrawAll } from "@/lib/server/autopilot";
import { err, handle, json } from "@/lib/server/http";
import { verifiedWallets } from "@/lib/server/privy";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** The signed in wallet this request acts for. */
async function ownerOf(req: Request, claimed?: string): Promise<Address | undefined> {
  const { wallets } = await verifiedWallets(req, claimed);
  return wallets.find((w) => w.toLowerCase() === claimed?.toLowerCase()) ?? wallets[0];
}

export async function GET(req: Request) {
  return handle(async () => {
    const owner = await ownerOf(req, new URL(req.url).searchParams.get("address") || undefined);
    if (!owner) return json({ enabled: autopilotEnabled(), signedIn: false });
    return json({ signedIn: true, owner, ...(await autopilotOverview(owner)) });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    if (!autopilotEnabled()) return err("Autopilot is not available yet.", 503);
    const body = (await req.json()) as Record<string, unknown> & { address?: string; action?: string };
    const owner = await ownerOf(req, body.address);
    if (!owner) return err("Sign in first.", 401);
    try {
      switch (body.action) {
        case "setup":
          return json({ address: await autopilotWallet(owner, true) });
        case "rule":
          return json({ rule: await addRule(owner, (body.rule ?? {}) as Record<string, unknown>) });
        case "cancel":
          return json({ rule: await cancelRule(owner, String(body.id)) });
        case "settings":
          return json({ settings: await updateSettings(owner, body.settings as never) });
        case "withdraw":
          return json({ hashes: await withdrawAll(owner) });
        default:
          return err("Unknown action.");
      }
    } catch (e) {
      return err((e as { shortMessage?: string }).shortMessage || (e as Error).message);
    }
  });
}
