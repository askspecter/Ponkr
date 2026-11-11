#!/usr/bin/env node
/**
 * X (Twitter) bot worker: polls mentions of the bot account, runs them through the agent
 * and replies. Requires X API v2 access with user-context OAuth 1.0a keys for posting.
 *
 * env: X_BEARER_TOKEN, X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET, X_BOT_USER_ID,
 *      PONKR_HOST (e.g. http://localhost:3000), INTERNAL_SECRET, X_POLL_SECONDS (default 60)
 */
import crypto from "node:crypto";
import fs from "node:fs";

const env = process.env;
const HOST = env.PONKR_HOST || "http://localhost:3000";
const STATE = ".data/x-bot-state.json";
const need = ["X_BEARER_TOKEN", "X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_SECRET", "X_BOT_USER_ID", "INTERNAL_SECRET"];
for (const k of need) if (!env[k]) { console.error(`missing ${k}`); process.exit(1); }

const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

function oauthHeader(method, url) {
  const p = {
    oauth_consumer_key: env.X_API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: env.X_ACCESS_TOKEN,
    oauth_version: "1.0",
  };
  const base = [method, enc(url), enc(Object.keys(p).sort().map((k) => `${enc(k)}=${enc(p[k])}`).join("&"))].join("&");
  const key = `${enc(env.X_API_SECRET)}&${enc(env.X_ACCESS_SECRET)}`;
  p.oauth_signature = crypto.createHmac("sha1", key).update(base).digest("base64");
  return "OAuth " + Object.keys(p).sort().map((k) => `${enc(k)}="${enc(p[k])}"`).join(", ");
}

async function reply(inReplyTo, text) {
  const url = "https://api.x.com/2/tweets";
  const r = await fetch(url, {
    method: "POST",
    headers: { authorization: oauthHeader("POST", url), "content-type": "application/json" },
    body: JSON.stringify({ text: text.slice(0, 280), reply: { in_reply_to_tweet_id: inReplyTo } }),
  });
  if (!r.ok) console.error("reply failed", r.status, await r.text());
}

function load() { try { return JSON.parse(fs.readFileSync(STATE, "utf8")); } catch { return {}; } }
function store(s) { fs.mkdirSync(".data", { recursive: true }); fs.writeFileSync(STATE, JSON.stringify(s)); }

async function tick() {
  const s = load();
  const q = new URLSearchParams({ max_results: "20", expansions: "author_id,attachments.media_keys", "media.fields": "url,type", "user.fields": "username" });
  if (s.sinceId) q.set("since_id", s.sinceId);
  const r = await fetch(`https://api.x.com/2/users/${env.X_BOT_USER_ID}/mentions?${q}`, { headers: { authorization: `Bearer ${env.X_BEARER_TOKEN}` } });
  if (!r.ok) return console.error("mentions failed", r.status, await r.text());
  const j = await r.json();
  const media = new Map((j.includes?.media ?? []).map((m) => [m.media_key, m]));
  const tweets = (j.data ?? []).reverse();
  for (const t of tweets) {
    const img = (t.attachments?.media_keys ?? []).map((k) => media.get(k)).find((m) => m?.type === "photo")?.url;
    try {
      const a = await fetch(`${HOST}/api/internal/agent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-internal-secret": env.INTERNAL_SECRET },
        body: JSON.stringify({ text: t.text, identity: `x:${t.author_id}`, channel: "x", image: img }),
      }).then((x) => x.json());
      let text = a.text || a.error || "Something went wrong.";
      const launched = (a.actions ?? []).find((x) => x.type === "launched");
      if (launched?.token) text = `🚀 $${launched.symbol} is live: ${HOST}/token/${launched.token}`;
      await reply(t.id, text);
    } catch (e) {
      console.error("agent failed", e);
    }
    s.sinceId = t.id;
    store(s);
  }
}

console.log("x-bot running");
for (;;) {
  await tick().catch((e) => console.error(e));
  await new Promise((r) => setTimeout(r, Number(env.X_POLL_SECONDS || 60) * 1000));
}
