/** Standard page frame: one content width and rhythm across the whole app. */
export function PageShell({ children, narrow = false }: { children: React.ReactNode; narrow?: boolean }) {
  return <div className={`mx-auto w-full px-4 py-8 md:px-8 md:py-12 ${narrow ? "max-w-3xl" : "max-w-6xl"}`}>{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6">
      <div className="min-w-0 max-w-2xl">
        {eyebrow && <div className="label text-acid">{eyebrow}</div>}
        <h1 className="display text-3xl font-bold md:text-[2.6rem] md:leading-[1.1]">{title}</h1>
        {description && <p className="mt-2 text-sm leading-relaxed text-muted md:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="card dots flex flex-col items-center gap-3 px-6 py-16 text-center">
      <h2 className="display text-2xl font-bold">{title}</h2>
      {description && <p className="max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-line bg-panel p-1">
      {options.map(([k, l]) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={`mono rounded px-3 py-1.5 text-xs transition ${value === k ? "bg-acid text-black" : "text-muted hover:text-fg"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
