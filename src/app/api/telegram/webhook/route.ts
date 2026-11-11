import type Anthropic from "@anthropic-ai/sdk";
import { BRAND, CLUB } from "@/lib/config";
import { runAgent } from "@/lib/server/agent";
import { consume } from "@/lib/server/accounts";
import { load, save } from "@/lib/server/store";
import { handle, json } from "@/lib/server/http";

export const maxDuration = 120;

interface TgUpdate {
  message?: {
    chat: { id: number; type: string };
    from?: { id: number; username?: string };
    text?: string;
    caption?: string;
    photo?: { file_id: string; width: number }[];
  };
}

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function tg(method: string, body: unknown) {
  return fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

async function photoUrl(fileId: string) {
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=${fileId}`);
  const j = (await r.json()) as { result?: { file_path?: string } };
  return j.result?.file_path ? `https://api.telegram.org/file/bot${TOKEN}/${j.result.file_path}` : undefined;
}

/** Telegram bot: set the webhook to https://<host>/api/telegram/webhook with secret_token=TELEGRAM_WEBHOOK_SECRET. */
export async function POST(req: Request) {
  return handle(async () => {
    if (!TOKEN) return json({ ok: false }, 503);
    if (process.env.TELEGRAM_WEBHOOK_SECRET && req.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return json({ ok: false }, 401);
    }
    const u = (await req.json()) as TgUpdate;
    const m = u.message;
    const text = (m?.text || m?.caption || "").trim();
    if (!m || !text || !m.from) return json({ ok: true });
    if (m.chat.type !== "private" && !text.toLowerCase().includes(`@${BRAND.telegramBot.toLowerCase()}`)) return json({ ok: true });

    const uid = `tg:${m.from.id}`;
    if (text === "/start") {
      await tg("sendMessage", { chat_id: m.chat.id, text: `gm! I'm ${BRAND.name}. Ask me about any token, or say "launch a token called Moon Cat with ticker MCAT, fees to 0x…" and attach a logo.` });
      return json({ ok: true });
    }
    if (!consume("chat", uid, CLUB.freeMessagesPerDay * 4).ok) {
      await tg("sendMessage", { chat_id: m.chat.id, text: "Daily message limit reached. Try again tomorrow." });
      return json({ ok: true });
    }
    await tg("sendChatAction", { chat_id: m.chat.id, action: "typing" });
    const photo = m.photo?.sort((a, b) => b.width - a.width)[0];
    const image = photo ? await photoUrl(photo.file_id) : undefined;

    const threads = load<Record<string, Anthropic.MessageParam[]>>("tg-threads", {});
    const hist = (threads[uid] ?? []).concat({ role: "user", content: text });
    const r = await runAgent(hist, { channel: "telegram", identity: uid, attachedImage: image });
    threads[uid] = hist.concat({ role: "assistant", content: r.text }).slice(-16);
    save("tg-threads", threads);
    await tg("sendMessage", { chat_id: m.chat.id, text: r.text, reply_to_message_id: undefined, disable_web_page_preview: true });
    return json({ ok: true });
  });
}
