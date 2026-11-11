"use client";

import { SignInButton } from "@/components/Providers";
import { useAuth } from "@/hooks/useAuth";
import { EXPLORER } from "@/lib/config";
import { useTxRunner, type TxReq } from "@/hooks/useTxRunner";

export function TxCard({ title, txs, summary, onDone }: { title: string; txs: TxReq[]; summary?: Record<string, string>; onDone?: (hash?: string) => void }) {
  const { authenticated: isConnected } = useAuth();
  const { run, status } = useTxRunner();
  const busy = status.state === "signing" || status.state === "pending";
  return (
    <div className="card mt-2 max-w-md border-accent/30 p-4">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      {summary && (
        <dl className="mb-3 space-y-1 text-xs">
          {Object.entries(summary).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4"><dt className="text-muted">{k}</dt><dd className="mono truncate">{v}</dd></div>
          ))}
        </dl>
      )}
      {txs.length > 1 && <ol className="mb-3 list-decimal pl-4 text-xs text-muted">{txs.map((t, i) => <li key={i}>{t.description}</li>)}</ol>}
      {!isConnected ? (
        <SignInButton />
      ) : status.state === "done" ? (
        <a className="text-sm text-up underline" href={`${EXPLORER}/tx/${status.hash}`} target="_blank" rel="noreferrer">Confirmed. View transaction</a>
      ) : (
        <button className="btn btn-primary w-full" disabled={busy} onClick={() => run(txs).then((h) => onDone?.(h)).catch(() => {})}>
          {status.state === "signing" ? `Confirm in wallet (${status.step}/${status.total})` : status.state === "pending" ? `Pending (${status.step}/${status.total})…` : "Confirm"}
        </button>
      )}
      {status.state === "error" && <p className="mt-2 text-xs text-down">{status.error}</p>}
    </div>
  );
}
