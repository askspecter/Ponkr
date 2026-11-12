#!/usr/bin/env node
// Pre-warms the on-chain launch index by hitting the stats endpoint until the count stabilises.
const HOST = process.env.KEKR_HOST || "http://localhost:3000";
let prev = -1;
for (let i = 0; i < 200; i++) {
  const r = await fetch(`${HOST}/api/stats`).then((x) => x.json()).catch((e) => ({ error: String(e) }));
  console.log(new Date().toISOString(), r);
  if (r.totalLaunches === prev && prev > 0) break;
  prev = r.totalLaunches ?? prev;
  await new Promise((r) => setTimeout(r, 9000));
}
