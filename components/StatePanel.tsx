import type { ReactNode } from "react";

type StateTone = "loading" | "empty" | "error";

type StatePanelProps = Readonly<{
  tone: StateTone;
  title: string;
  description: string;
  children?: ReactNode;
  actions?: ReactNode;
  className?: string;
}>;

const toneStyles: Record<StateTone, string> = {
  loading: "border-zinc-800 bg-zinc-900/80 text-zinc-300",
  empty: "border-zinc-800 bg-zinc-900/80 text-zinc-300",
  error: "border-rose-500/40 bg-rose-950/30 text-rose-200",
};

const toneBadgeStyles: Record<StateTone, string> = {
  loading: "border-zinc-700 bg-zinc-950/80 text-zinc-300",
  empty: "border-zinc-700 bg-zinc-950/80 text-zinc-300",
  error: "border-rose-500/30 bg-rose-950/30 text-rose-100",
};

export function StatePanel({
  tone,
  title,
  description,
  children,
  actions,
  className,
}: StatePanelProps) {
  return (
    <section
      aria-busy={tone === "loading" ? "true" : undefined}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={`rounded-xl border p-6 ${toneStyles[tone]} ${className ?? ""}`.trim()}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wide ${toneBadgeStyles[tone]}`}
          >
            {tone}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{description}</p>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>

      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
