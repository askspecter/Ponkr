"use client";

import { EmptyState, PageHeader, PageShell } from "@/components/Page";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSignMessage } from "wagmi";
import { SignInButton } from "@/components/Providers";
import { useAuth } from "@/hooks/useAuth";
import { apiKeyMessage } from "@/lib/messages";

export default function ApiKeys() {
  const { address } = useAuth();
  const { signMessageAsync } = useSignMessage();
  const [name, setName] = useState("my-agent");
  const [created, setCreated] = useState<string>();
  const [err, setErr] = useState<string>();
  const keys = useQuery({
    queryKey: ["keys", address],
    enabled: !!address,
    queryFn: async () => (await (await fetch(`/api/keys?owner=${address}`)).json()) as { keys: { id: string; prefix: string; name: string; createdAt: number }[] },
  });

  async function call(body: Record<string, unknown>) {
    setErr(undefined);
    try {
      const nonce = String(Date.now());
      const signature = await signMessageAsync({ message: apiKeyMessage(address!, nonce) });
      const r = await fetch("/api/keys", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ owner: address, nonce, signature, ...body }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      if (j.key) setCreated(j.key);
      void keys.refetch();
    } catch (e) {
      setErr((e as { shortMessage?: string }).shortMessage || (e as Error).message);
    }
  }

  const header = <PageHeader eyebrow="Developers" title="API keys" description={<>Authenticate the Agent API, the Launch API and the CLI. Read the <a className="text-fg underline decoration-accent underline-offset-4" href="/docs#api">API documentation</a>.</>} />;
  if (!address) return <PageShell narrow>{header}<EmptyState title="Sign in to manage keys" description="Keys are tied to your wallet. Creating one only asks for a free signature." action={<SignInButton />} /></PageShell>;
  return (
    <PageShell narrow>
      {header}
      <div className="card flex gap-2 p-4">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name" />
        <button className="btn btn-primary shrink-0" onClick={() => call({ name })}>Create key</button>
      </div>
      {created && (
        <div className="card mt-4 border-up/40 p-4">
          <div className="text-sm font-semibold text-up">Copy your key now. It won&apos;t be shown again.</div>
          <code className="mono mt-2 block break-all rounded bg-panel-2 p-3 text-xs">{created}</code>
        </div>
      )}
      {err && <p className="mt-3 text-sm text-down">{err}</p>}
      <div className="card mt-6 divide-y divide-line">
        {keys.data?.keys.map((k) => (
          <div key={k.id} className="flex items-center justify-between p-4 text-sm">
            <div><div className="font-semibold">{k.name}</div><div className="mono text-xs text-muted">{k.prefix}… · created {new Date(k.createdAt).toLocaleDateString()}</div></div>
            <button className="btn btn-ghost px-3 py-1 text-xs" onClick={() => call({ revoke: k.id })}>Revoke</button>
          </div>
        ))}
        {keys.data && !keys.data.keys.length && <p className="p-6 text-center text-sm text-muted">No keys yet.</p>}
      </div>
    </PageShell>
  );
}
