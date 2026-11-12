"use client";

import { useEffect, useRef, useState } from "react";
import { fmtPrice } from "@/lib/format";
import type { Trade } from "@/lib/types";

const INTERVALS = { "1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400 } as const;

export function PriceChart({ trades, ethUsd, usd }: { trades: Trade[]; ethUsd: number; usd: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const [iv, setIv] = useState<keyof typeof INTERVALS>("5m");

  useEffect(() => {
    if (!el.current) return;
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      const { createChart, ColorType } = await import("lightweight-charts");
      if (disposed || !el.current) return;
      const chart = createChart(el.current, {
        layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#8f897c", fontFamily: "IBM Plex Mono, monospace", attributionLogo: false },
        grid: { vertLines: { color: "#1c1c21" }, horzLines: { color: "#1c1c21" } },
        rightPriceScale: { borderColor: "#29292f" },
        timeScale: { borderColor: "#29292f", timeVisible: true },
        height: 360,
        autoSize: true,
      });
      const series = chart.addCandlestickSeries({
        upColor: "#3ddc84", downColor: "#ff5c7a", wickUpColor: "#3ddc84", wickDownColor: "#ff5c7a", borderVisible: false,
        priceFormat: { type: "custom", minMove: 1e-12, formatter: (p: number) => fmtPrice(p, usd ? "$" : "") },
      });
      const step = INTERVALS[iv];
      const sorted = [...trades].filter((t) => t.timestamp > 0 && BigInt(t.tokens) > 0n).sort((a, b) => a.timestamp - b.timestamp);
      const buckets = new Map<number, { open: number; high: number; low: number; close: number }>();
      let prev: number | undefined;
      for (const t of sorted) {
        const gross = t.side === "buy" ? Number(t.quote) - Number(t.fee) - Number(t.tax) : Number(t.quote) + Number(t.fee) + Number(t.tax);
        let p = gross / Number(t.tokens);
        if (usd) p *= ethUsd;
        const time = Math.floor(t.timestamp / step) * step;
        const b = buckets.get(time);
        if (!b) buckets.set(time, { open: prev ?? p, high: Math.max(p, prev ?? p), low: Math.min(p, prev ?? p), close: p });
        else Object.assign(b, { high: Math.max(b.high, p), low: Math.min(b.low, p), close: p });
        prev = p;
      }
      series.setData([...buckets.entries()].map(([time, v]) => ({ time: time as never, ...v })));
      chart.timeScale().fitContent();
      cleanup = () => chart.remove();
    })();
    return () => {
      disposed = true;
      cleanup();
    };
  }, [trades, iv, usd, ethUsd]);

  return (
    <div>
      <div className="mb-2 flex gap-1">
        {(Object.keys(INTERVALS) as (keyof typeof INTERVALS)[]).map((k) => (
          <button key={k} onClick={() => setIv(k)} className={`rounded px-2 py-0.5 text-xs ${iv === k ? "bg-panel-2 text-fg" : "text-muted"}`}>{k}</button>
        ))}
      </div>
      <div ref={el} className="h-[360px] w-full" />
      {trades.length === 0 && <p className="-mt-48 text-center text-sm text-muted">No trades yet. Be the first.</p>}
    </div>
  );
}
