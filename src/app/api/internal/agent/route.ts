import type Anthropic from "@anthropic-ai/sdk";
import { runAgent, type Channel } from "@/lib/server/agent";
import { consume } from "@/lib/server/accounts";
import { load, save } from "@/lib/server/store";
import { err, handle, json } from "@/lib/server/http";

export const maxDuration = 120;

/** Used by the X bot worker (scripts/x-bot.mjs). Protected by INTERNAL_SECRET. */
export async function POST(req: Request) {
  return handle(async () => {
    const secret = process.env.INTERNAL_SECRET;
    if (!secret || req.headers.get("x-internal-secret") !== secret) return err("Forbidden", 403);
    const b = (await req.json()) as { text: string; identity: string; channel?: Channel; image?: string };
    if (!b.text || !b.identity) return err("text and identity required");
    if (!consume("chat", b.identity, 20).ok) return json({ text: "Daily limit reached. Try again tomorrow." });
    const threads = load<Record<string, Anthropic.MessageParam[]>>("x-threads", {});
    const hist = (threads[b.identity] ?? []).concat({ role: "user", content: b.text });
    const r = await runAgent(hist, { channel: b.channel ?? "x", identity: b.identity, attachedImage: b.image });
    threads[b.identity] = hist.concat({ role: "assistant", content: r.text }).slice(-10);
    save("x-threads", threads);
    return json(r);
  });
}
