import { Toc, TocSelect, type TocItem } from "./Doc";

/** Two column article layout used by the documentation and legal pages. */
export function DocLayout({
  eyebrow,
  title,
  intro,
  meta,
  toc,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: React.ReactNode;
  meta?: React.ReactNode;
  toc: TocItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <header className="mb-10 border-b border-line pb-8">
        <div className="label text-acid">{eyebrow}</div>
        <h1 className="display text-4xl font-bold md:text-5xl">{title}</h1>
        <div className="mt-3 max-w-3xl text-base leading-relaxed text-muted">{intro}</div>
        {meta && <div className="mono mt-4 text-xs text-muted">{meta}</div>}
      </header>
      <div className="grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-8 max-h-[calc(100dvh-4rem)] overflow-y-auto pb-8">
            <div className="label mb-3">On this page</div>
            <Toc items={toc} />
          </div>
        </aside>
        <div className="min-w-0">
          <TocSelect items={toc} />
          <article className="prose-doc max-w-3xl">{children}</article>
        </div>
      </div>
    </div>
  );
}
