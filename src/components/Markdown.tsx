import React from "react";

type Block = { kind: "p" | "ul" | "ol" | "table" | "h"; lines: string[] };

const isRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isSep = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);
const bullet = /^\s*[-*]\s+/;
const numbered = /^\s*\d+\.\s+/;
const cells = (l: string) => l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

/** Groups lines into paragraphs, lists, tables and headings. */
function parse(text: string): Block[] {
  const out: Block[] = [];
  for (const line of text.split("\n")) {
    const kind: Block["kind"] | null = !line.trim() ? null : isRow(line) || isSep(line) ? "table" : bullet.test(line) ? "ul" : numbered.test(line) ? "ol" : /^#{1,4}\s/.test(line) ? "h" : "p";
    const prev = out[out.length - 1];
    if (!kind) { out.push({ kind: "p", lines: [] }); continue; }
    if (prev && prev.kind === kind && kind !== "h" && (prev.lines.length || kind !== "p")) prev.lines.push(line);
    else out.push({ kind, lines: [line] });
  }
  return out.filter((b) => b.lines.length);
}

/** Small, safe markdown: paragraphs, lists, tables, headings, **bold**, `code`, [links](/x) and /token/0x… paths. */
export function Markdown({ text }: { text: string }) {
  return (
    <div className="prose-chat space-y-2 text-sm leading-relaxed">
      {parse(text).map((b, i) => {
        if (b.kind === "h") return <p key={i} className="pt-1 font-semibold">{inline(b.lines[0].replace(/^#+\s/, ""))}</p>;
        if (b.kind === "ul") return <ul key={i} className="list-disc space-y-1 pl-5">{b.lines.map((l, j) => <li key={j}>{inline(l.replace(bullet, ""))}</li>)}</ul>;
        if (b.kind === "ol") return <ol key={i} className="list-decimal space-y-1 pl-5">{b.lines.map((l, j) => <li key={j}>{inline(l.replace(numbered, ""))}</li>)}</ol>;
        if (b.kind === "table") {
          const rows = b.lines.filter((l) => !isSep(l)).map(cells);
          const [head, ...body] = rows;
          return (
            <div key={i} className="overflow-x-auto rounded-md border border-line">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-panel-2 text-muted"><tr>{head.map((c, j) => <th key={j} className="whitespace-nowrap px-3 py-2 font-medium">{inline(c)}</th>)}</tr></thead>
                <tbody>{body.map((r, j) => <tr key={j} className="border-t border-line/60">{r.map((c, k) => <td key={k} className="whitespace-nowrap px-3 py-2">{inline(c)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          );
        }
        return <p key={i}>{b.lines.map((l, j) => <React.Fragment key={j}>{j > 0 && <br />}{inline(l)}</React.Fragment>)}</p>;
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
