import type Anthropic from "@anthropic-ai/sdk";
import { getAddress, isAddress } from "viem";
import { CLUB } from "@/lib/config";
import { agentConfigured, runAgent } from "@/lib/server/agent";
import { clientIp, clubStatus, consume } from "@/lib/server/accounts";
import { verifiedWallets } from "@/lib/server/privy";
import { err, handle, json } from "@/lib/server/http";

export const maxDuration = 120;

interface Body {
  messages: { role: "user" | "assistant"; content: string }[];
  wallet?: string;
  image?: string;
}

export async function POST(req: Request) {
  return handle(async () => {
    if (!agentConfigured()) return err("The agent is not available yet. Please check back soon.", 503);
    const b = (await req.json()) as Body;
    const msgs = (b.messages ?? []).filter((m) => m.content?.trim()).slice(-20);
    if (!msgs.length || msgs[msgs.length - 1].role !== "user") return err("Send a message");
    if (msgs[msgs.length - 1].content.length > 4000) return err("Message too long");

    const wallet = b.wallet && isAddress(b.wallet) ? getAddress(b.wallet) : undefined;
    const { user, wallets } = await verifiedWallets(req, wallet);
    const identity = user ? `privy:${user.userId}` : `ip:${clientIp(req)}`;
    if (!(await clubStatus(wallets)).club) {
      const c = await consume("chat", identity, CLUB.freeMessagesPerDay);
      if (!c.ok) return json({ error: `You've used your ${CLUB.freeMessagesPerDay} free messages today. Hold ${CLUB.minHold.toLocaleString("en-US")} $${CLUB.symbol} to join Club for unlimited messages.`, upgrade: true }, 402);
    }
    const history: Anthropic.MessageParam[] = msgs.map((m) => ({ role: m.role, content: m.content }));
    const r = await runAgent(history, { channel: "web", wallet, verifiedWallets: wallets, identity, attachedImage: b.image });
    return json(r);
  });
}
