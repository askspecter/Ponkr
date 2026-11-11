import type Anthropic from "@anthropic-ai/sdk";
import { getAddress, isAddress } from "viem";
import { CLUB } from "@/lib/config";
import { runAgent } from "@/lib/server/agent";
import { clientIp, consume, isClub } from "@/lib/server/accounts";
import { authUser } from "@/lib/server/privy";
import { err, handle, json } from "@/lib/server/http";

export const maxDuration = 120;

interface Body {
  messages: { role: "user" | "assistant"; content: string }[];
  wallet?: string;
  image?: string;
}

export async function POST(req: Request) {
  return handle(async () => {
    if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
      return err("The agent is not configured (ANTHROPIC_API_KEY missing).", 503);
    }
    const b = (await req.json()) as Body;
    const msgs = (b.messages ?? []).filter((m) => m.content?.trim()).slice(-20);
    if (!msgs.length || msgs[msgs.length - 1].role !== "user") return err("Send a message");
    if (msgs[msgs.length - 1].content.length > 4000) return err("Message too long");

    const user = await authUser(req);
    const wallet = b.wallet && isAddress(b.wallet) ? getAddress(b.wallet) : undefined;
    const identity = user ? `privy:${user.userId}` : `ip:${clientIp(req)}`;
    if (!(user && user.wallets.some((w) => isClub(w)))) {
      const c = consume("chat", identity, CLUB.freeMessagesPerDay);
      if (!c.ok) return json({ error: `You've used your ${CLUB.freeMessagesPerDay} free messages today. Join Club for unlimited messages.`, upgrade: true }, 402);
    }
    const history: Anthropic.MessageParam[] = msgs.map((m) => ({ role: m.role, content: m.content }));
    const r = await runAgent(history, { channel: "web", wallet, identity, attachedImage: b.image });
    return json(r);
  });
}
