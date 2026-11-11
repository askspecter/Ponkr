"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { parseEther } from "viem";
import { Check, Copy, Search } from "lucide-react";
import { Code } from "@/components/Doc";
import { EmptyState, PageHeader, PageShell, Segmented } from "@/components/Page";
import { SignInButton } from "@/components/Providers";
import { useAuth } from "@/hooks/useAuth";
import { useTxRunner } from "@/hooks/useTxRunner";
import { EXPLORER, LLM } from "@/lib/config";
import { fmtNum, timeAgo } from "@/lib/format";

interface Model {
  id: string;
  name: string;
  owned_by: string;
  context_length: number | null;
  max_output_tokens: number | null;
  input_modalities: string[];
  pricing: { input: number; output: number; cache_read: number | null; cache_write: number | null };
}
interface Account {
  enabled: boolean;
  balanceUsd: number;
  usage: {
    daily: { day: string; requests: number; input: number; output: number; costUsd: number }[];
    models: { model: string; requests: number; tokens: number; costUsd: number }[];
    totals: { requests: number; tokens: number; costUsd: number };
  };
  topups: { txHash: string; eth: string; usd: number; at: number }[];
}

const TABS = [["models", "Models"], ["usage", "Usage"], ["credits", "Credits"], ["quickstart", "Quickstart"]] as const;
type Tab = (typeof TABS)[number][0];

const usd = (n: number, d = 2) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: Math.max(d, n < 1 && n > 0 ? 4 : d) });
const price = (n: number | null) => (n === null ? "n/a" : `$${n.toFixed(2)}`);
const ctx = (n: number | null) => (n ? (n >= 1_000_000 ? `${n / 1_000_000}M` : `${Math.round(n / 1000)}K`) : "n/a");

export function Gateway() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = (TABS.find(([k]) => k === params.get("tab"))?.[0] ?? "models") as Tab;
  const setTab = (t: Tab) => router.replace(`/llm?tab=${t}`, { scroll: false });

  return (
    <PageShell>
      <PageHeader
        eyebrow="LLM Gateway"
        title="One key for every frontier model"
        description="Call Claude, GPT, Gemini, Grok, Kimi, Qwen, DeepSeek and more through a single OpenAI and Anthropic compatible API. Pay per token from a prepaid balance, no subscriptions."
        actions={<Link href="/api-keys" className="btn btn-ghost">Manage API keys</Link>}
      />
      <div className="mb-8 overflow-x-auto"><Segmented value={tab} options={TABS} onChange={setTab} /></div>
      {tab === "models" && <Models />}
      {tab === "usage" && <Gated render={(a) => <UsageTab a={a} />} />}
      {tab === "credits" && <Gated render={(a, refetch) => <Credits a={a} refetch={refetch} />} />}
      {tab === "quickstart" && <Quickstart />}
    </PageShell>
  );
}

function useAccount() {
  const { address, authHeaders } = useAuth();
  return useQuery({
    queryKey: ["llm-account", address],
    enabled: !!address,
    queryFn: async () => {
      const r = await fetch(`/api/llm/account?address=${address}`, { headers: await authHeaders() });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      return j as Account;
    },
    refetchInterval: 30_000,
  });
}

function Gated({ render }: { render: (a: Account, refetch: () => void) => React.ReactNode }) {
  const { authenticated } = useAuth();
  const q = useAccount();
  if (!authenticated) return <EmptyState title="Sign in to continue" description="Your balance, usage and top ups are tied to your wallet." action={<SignInButton />} />;
  if (q.error) return <div className="card p-6 text-sm text-down">{(q.error as Error).message}</div>;
  if (!q.data) return <div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-28 animate-pulse" />)}</div>;
  return <>{render(q.data, () => void q.refetch())}</>;
}

// ---------------------------------------------------------------------------

function Models() {
  const [q, setQ] = useState("");
  const [provider, setProvider] = useState("All");
  const [copied, setCopied] = useState<string>();
  const { data, isLoading } = useQuery({
    queryKey: ["llm-models"],
    queryFn: async () => ((await (await fetch("/api/llm/v1/models")).json()) as { data: Model[] }).data ?? [],
    staleTime: 5 * 60_000,
  });
  const providers = useMemo(() => ["All", ...Array.from(new Set((data ?? []).map((m) => m.owned_by))).sort()], [data]);
  const list = (data ?? []).filter(
    (m) => (provider === "All" || m.owned_by === provider) && (!q || `${m.name} ${m.id}`.toLowerCase().includes(q.toLowerCase())),
  );

  if (isLoading) return <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="card h-48 animate-pulse" />)}</div>;
  if (!data?.length) return <EmptyState title="Models are on their way" description="The model catalog is not available right now. Please check back shortly." />;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {providers.map((p) => (
            <button key={p} onClick={() => setProvider(p)} className={`mono rounded border px-2.5 py-1 text-xs ${provider === p ? "border-acid bg-acid text-black" : "border-line text-muted hover:text-fg"}`}>{p}</button>
          ))}
        </div>
        <label className="relative block w-full sm:w-64">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input className="input pl-9" placeholder="Search models" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      <p className="mono mb-4 text-xs text-muted">{list.length} models · prices in USD per 1M tokens</p>
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((m) => (
          <div key={m.id} className="card flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-semibold">{m.name}</div>
                <button
                  onClick={() => { void navigator.clipboard.writeText(m.id); setCopied(m.id); setTimeout(() => setCopied(undefined), 1200); }}
                  className="mono mt-0.5 flex items-center gap-1.5 text-xs text-muted hover:text-fg"
                >
                  {m.id} {copied === m.id ? <Check size={12} className="text-acid" /> : <Copy size={12} />}
                </button>
              </div>
              <span className="tag shrink-0 border border-line text-muted">{m.owned_by}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
              {m.input_modalities.map((x) => <span key={x} className="tag bg-accent/15 capitalize text-accent">{x}</span>)}
              <span className="mono">Context {ctx(m.context_length)}</span>
              {m.max_output_tokens && <span className="mono">· Output {ctx(m.max_output_tokens)}</span>}
            </div>
            <div className="mt-4 grid grid-cols-4 gap-px overflow-hidden rounded border border-line bg-line text-center">
              {[["Input", m.pricing.input], ["Output", m.pricing.output], ["Cache read", m.pricing.cache_read], ["Cache write", m.pricing.cache_write]].map(([k, v]) => (
                <div key={k as string} className="bg-panel-2 px-2 py-2.5">
                  <div className="mono text-[10px] uppercase tracking-wider text-muted">{k}</div>
                  <div className="mono mt-0.5 text-sm text-fg">{price(v as number | null)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function UsageTab({ a }: { a: Account }) {
  const max = Math.max(0.0001, ...a.usage.daily.map((d) => d.costUsd));
  const tiles = [
    ["Balance", usd(a.balanceUsd)],
    ["Spend, 30 days", usd(a.usage.totals.costUsd)],
    ["Requests, 30 days", a.usage.totals.requests.toLocaleString("en-US")],
    ["Tokens, 30 days", fmtNum(a.usage.totals.tokens)],
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-4">
        {tiles.map(([k, v]) => <div key={k} className="bg-panel p-5"><div className="label">{k}</div><div className="display text-2xl font-bold">{v}</div></div>)}
      </div>
      <div className="card p-5">
        <div className="label">Daily spend</div>
        <div className="mt-4 flex h-48 items-end gap-1">
          {a.usage.daily.map((d) => (
            <div key={d.day} className="group relative flex flex-1 flex-col items-center justify-end">
              <div className="mono pointer-events-none absolute -top-6 hidden whitespace-nowrap rounded bg-panel-2 px-1.5 py-0.5 text-[10px] group-hover:block">{d.day.slice(5)} · {usd(d.costUsd)}</div>
              <div className="w-full rounded-t-[2px] bg-accent transition group-hover:bg-acid" style={{ height: `${Math.max(d.costUsd > 0 ? 3 : 1, (d.costUsd / max) * 180)}px`, opacity: d.costUsd > 0 ? 1 : 0.25 }} />
            </div>
          ))}
        </div>
        <div className="mono mt-2 flex justify-between text-[10px] text-muted"><span>{a.usage.daily[0]?.day.slice(5)}</span><span>Today</span></div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="text-xs text-muted"><tr className="text-left"><th className="label px-5 py-3">Model</th><th className="label">Requests</th><th className="label">Tokens</th><th className="label pr-5 text-right">Cost</th></tr></thead>
          <tbody>
            {a.usage.models.map((m) => (
              <tr key={m.model} className="border-t border-line/60">
                <td className="mono px-5 py-3">{m.model}</td>
                <td>{m.requests.toLocaleString("en-US")}</td>
                <td>{fmtNum(m.tokens)}</td>
                <td className="pr-5 text-right font-semibold">{usd(m.costUsd)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!a.usage.models.length && <p className="p-8 text-center text-sm text-muted">No requests yet. Follow the <Link href="/llm?tab=quickstart" className="underline decoration-accent underline-offset-4">Quickstart</Link> to make your first call.</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

const PRESETS = [5, 20, 50, 100];

function Credits({ a, refetch }: { a: Account; refetch: () => void }) {
  const { address, authHeaders } = useAuth();
  const qc = useQueryClient();
  const { run, status } = useTxRunner();
  const [amount, setAmount] = useState(20);
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: async () => (await (await fetch("/api/stats")).json()) as { ethUsd: number } });
  const ethPrice = stats?.ethUsd ?? 0;
  const eth = ethPrice ? amount / ethPrice : 0;
  const busy = status.state === "signing" || status.state === "pending";

  async function topUp() {
    setMsg(undefined);
    if (!LLM.treasury) return setMsg({ ok: false, text: "Top ups are not available yet." });
    if (amount < LLM.minTopUpUsd) return setMsg({ ok: false, text: `The minimum top up is $${LLM.minTopUpUsd}.` });
    try {
      const hash = await run([{ to: LLM.treasury as `0x${string}`, data: "0x", value: parseEther(eth.toFixed(18)).toString(), description: `Add $${amount} in LLM credits` }]);
      const r = await fetch("/api/llm/credits", { method: "POST", headers: { "content-type": "application/json", ...(await authHeaders()) }, body: JSON.stringify({ txHash: hash, address }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setMsg({ ok: true, text: `Added ${usd(j.creditedUsd)}. Your balance is ${usd(j.balanceUsd)}.` });
      refetch();
      void qc.invalidateQueries({ queryKey: ["llm-account"] });
    } catch (e) {
      setMsg({ ok: false, text: (e as { shortMessage?: string }).shortMessage || (e as Error).message });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="card-hard p-6">
        <div className="label">Available balance</div>
        <div className="display text-5xl font-bold">{usd(a.balanceUsd)}</div>
        <p className="mt-3 text-sm text-muted">Every request is billed per token at the prices on the Models tab. Requests stop when the balance reaches zero.</p>
      </div>
      <div className="card p-6">
        <div className="label">Add credits</div>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((p) => (
            <button key={p} onClick={() => setAmount(p)} className={`mono rounded border py-2 text-sm ${amount === p ? "border-acid bg-acid text-black" : "border-line text-fg/80 hover:border-accent"}`}>${p}</button>
          ))}
        </div>
        <label className="mt-4 block">
          <span className="label">Custom amount (USD)</span>
          <input className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(Number(e.target.value.replace(/[^0-9.]/g, "")) || 0)} />
        </label>
        <div className="mono mt-3 flex justify-between text-xs text-muted">
          <span>Pay with ETH on Robinhood Chain</span>
          <span>{eth ? `${eth.toFixed(6)} ETH` : "…"}</span>
        </div>
        <button className="btn btn-primary mt-5 w-full" disabled={busy || !eth} onClick={topUp}>
          {status.state === "signing" ? "Confirm in wallet" : status.state === "pending" ? "Confirming payment" : `Add $${amount} in credits`}
        </button>
        {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-up" : "text-down"}`}>{msg.text}</p>}
      </div>
      <div className="card overflow-x-auto lg:col-span-2">
        <div className="label px-5 pt-5">Top up history</div>
        <table className="w-full min-w-[480px] text-sm">
          <tbody>
            {a.topups.map((t) => (
              <tr key={t.txHash} className="border-t border-line/60">
                <td className="px-5 py-3 font-semibold">{usd(t.usd)}</td>
                <td className="mono text-muted">{Number(t.eth).toFixed(6)} ETH</td>
                <td className="text-muted">{timeAgo(t.at / 1000)}</td>
                <td className="pr-5 text-right"><a className="mono text-xs underline decoration-accent underline-offset-4" href={`${EXPLORER}/tx/${t.txHash}`} target="_blank" rel="noreferrer">View</a></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!a.topups.length && <p className="px-5 pb-6 pt-2 text-sm text-muted">No top ups yet.</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Quickstart() {
  return (
    <div className="prose-doc max-w-3xl">
      <ol>
        <li>Create an API key on the <Link href="/api-keys">API keys</Link> page.</li>
        <li>Add credits on the Credits tab.</li>
        <li>Point any OpenAI or Anthropic SDK at the Ponkr base URL and use a model id from the Models tab.</li>
      </ol>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Format</th><th>Base URL</th></tr></thead>
          <tbody>
            <tr><td>OpenAI</td><td><code>{"<your Ponkr domain>/api/llm/v1"}</code></td></tr>
            <tr><td>Anthropic</td><td><code>{"<your Ponkr domain>/api/llm"}</code></td></tr>
          </tbody>
        </table>
      </div>
      <h3>curl</h3>
      <Code>{`curl {{HOST}}/api/llm/v1/chat/completions \\
  -H "Authorization: Bearer $PONKR_API_KEY" \\
  -H "content-type: application/json" \\
  -d '{
    "model": "claude-sonnet-5.5",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}</Code>
      <h3>OpenAI SDK</h3>
      <Code lang="typescript">{`import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "{{HOST}}/api/llm/v1",
  apiKey: process.env.PONKR_API_KEY,
});

const res = await client.chat.completions.create({
  model: "gpt-5.5",
  messages: [{ role: "user", content: "Summarize today's market." }],
});
console.log(res.choices[0].message.content);`}</Code>
      <h3>Anthropic SDK</h3>
      <Code lang="python">{`from anthropic import Anthropic

client = Anthropic(base_url="{{HOST}}/api/llm", api_key=PONKR_API_KEY)

msg = client.messages.create(
    model="claude-opus-5.5",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}],
)
print(msg.content[0].text)`}</Code>
      <h3>Streaming</h3>
      <p>Set <code>&quot;stream&quot;: true</code>. Responses use standard server sent events in the same format as each SDK expects, and usage is billed when the stream ends.</p>
      <h3>Limits</h3>
      <ul>
        <li>60 requests per minute per API key.</li>
        <li>Requests are refused with status 402 when your balance is empty.</li>
        <li>Unknown model ids return status 400. The live list is at <code>/api/llm/v1/models</code>.</li>
      </ul>
    </div>
  );
}
