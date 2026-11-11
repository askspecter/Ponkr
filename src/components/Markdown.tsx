import React from "react";

/** Minimal, safe markdown: paragraphs, **bold**, `code`, [links](/x) and bare /token/0x… paths. */
export function Markdown({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="prose-chat text-sm leading-relaxed">
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        const isList = lines.every((l) => /^\s*([-*]|\d+\.)\s+/.test(l));
        if (isList) return <ul key={i} className="my-1 list-disc pl-5">{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*([-*]|\d+\.)\s+/, ""))}</li>)}</ul>;
        return <p key={i}>{lines.map((l, j) => <React.Fragment key={j}>{j > 0 && <br />}{inline(l)}</React.Fragment>)}</p>;
      })}
    </div>
  );
}

function inline(s: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\/token\/0x[0-9a-fA-F]{40}|^#+\s)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={k++}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) out.push(<code key={k++}>{t.slice(1, -1)}</code>);
    else if (t.startsWith("[")) {
      const [, label, href] = /\[([^\]]+)\]\(([^)]+)\)/.exec(t)!;
      const safe = /^(https?:\/\/|\/)/.test(href) ? href : "#";
      out.push(<a key={k++} href={safe} target={safe.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{label}</a>);
    } else if (t.startsWith("/token/")) out.push(<a key={k++} href={t}>{t.slice(0, 13)}…</a>);
    last = m.index + t.length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}
