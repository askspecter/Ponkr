#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const HOST = (process.env.KEKR_HOST || "http://localhost:3000").replace(/\/$/, "");
const KEY = process.env.KEKR_API_KEY;
const [, , cmd, ...rest] = process.argv;

function flags(args) {
  const o = { _: [] };
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) o[args[i].slice(2)] = args[i + 1]?.startsWith("--") || args[i + 1] === undefined ? true : args[++i];
    else o._.push(args[i]);
  }
  return o;
}
async function api(p, init = {}) {
  const r = await fetch(HOST + p, { ...init, headers: { "content-type": "application/json", ...(KEY ? { "x-api-key": KEY } : {}), ...(init.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}
const usd = (n) => (n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${n.toFixed(2)}`);

const f = flags(rest);
try {
  switch (cmd) {
    case "launches": {
      const j = await api(`/api/v1/token-launches?sort=${f.sort || "latest"}&limit=${f.limit || 20}`);
      for (const l of j.launches) console.log(`${("$" + l.symbol).padEnd(12)} ${usd(l.marketCapUsd).padStart(10)}  ${l.graduated ? "graduated" : l.bondingProgress.toFixed(1) + "%"}  ${l.tokenAddress}`);
      break;
    }
    case "token": {
      const j = await api(`/api/v1/tokens/${encodeURIComponent(f._[0])}`);
      const t = j.token;
      console.log(`${t.name} ($${t.symbol})\n  address  ${t.token}\n  price    ${usd(t.priceUsd)}\n  mcap     ${usd(t.marketCapUsd)}\n  bonded   ${t.progress.toFixed(1)}%\n  creator  ${t.creator}\n  page     ${HOST}/token/${t.token}`);
      break;
    }
    case "launch": {
      if (!KEY) throw new Error("Set KEKR_API_KEY");
      if (!f.name || !f.symbol || !f.image) throw new Error("Usage: kekr launch --name <name> --symbol <TICKER> --image <url|file> [--fee-recipient 0x…] [--description …] [--tax 1]");
      let image = f.image;
      if (!/^(https?|ipfs):\/\//.test(image)) {
        const buf = fs.readFileSync(image);
        const fd = new FormData();
        const ext = path.extname(image).slice(1).replace("jpg", "jpeg");
        fd.append("file", new Blob([buf], { type: `image/${ext}` }), path.basename(image));
        const r = await fetch(`${HOST}/api/upload`, { method: "POST", body: fd });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        image = j.uri;
      }
      const j = await api("/api/v1/token-launches/deploy", {
        method: "POST",
        body: JSON.stringify({ name: f.name, symbol: f.symbol, image, description: f.description, feeRecipient: f["fee-recipient"], creatorTaxBps: f.tax ? Math.round(Number(f.tax) * 100) : undefined, socials: { twitter: f.twitter || "", website: f.website || "", telegram: f.telegram || "" } }),
      });
      console.log(`🚀 launched $${f.symbol.toUpperCase()}\n  token ${j.tokenAddress}\n  tx    ${j.txHash}\n  page  ${HOST}/token/${j.tokenAddress}`);
      break;
    }
    case "fees": {
      const j = await api(`/api/v1/token-launches/${f._[0]}/fees`);
      console.log(`claimable: ${Number(j.claimableEth) / 1e18} ETH (${usd(j.claimableUsd)})`);
      for (const t of j.tokens) console.log(`  $${t.token.symbol}  ${usd(t.token.marketCapUsd)}`);
      break;
    }
    case "prompt": {
      if (!KEY) throw new Error("Set KEKR_API_KEY");
      const { jobId } = await api("/api/v1/agent/prompt", { method: "POST", body: JSON.stringify({ prompt: f._.join(" "), threadId: f.thread }) });
      for (;;) {
        await new Promise((r) => setTimeout(r, 2000));
        const j = await api(`/api/v1/agent/job/${jobId}`);
        if (j.status === "completed") { console.log(j.response); break; }
        if (j.status === "failed" || j.status === "cancelled") throw new Error(j.error || j.status);
      }
      break;
    }
    default:
      console.log(`kekr <command>\n  launches [--sort latest|mcap|progress|graduated] [--limit 20]\n  token <ticker|address>\n  launch --name --symbol --image [--fee-recipient] [--description] [--tax]\n  fees <wallet>\n  prompt "<text>"\n\nenv: KEKR_HOST, KEKR_API_KEY`);
  }
} catch (e) {
  console.error("error:", e.message);
  process.exit(1);
}
