import type { ReactNode } from "react";

type SkeletonBlockProps = Readonly<{
  className?: string;
}>;

export function SkeletonBlock({ className }: SkeletonBlockProps) {
  return <div className={`animate-pulse rounded-lg bg-zinc-800/80 ${className ?? ""}`.trim()} />;
}

type SkeletonStackProps = Readonly<{
  rows?: number;
  className?: string;
  rowClassName?: string;
}>;

export function SkeletonStack({ rows = 3, className, rowClassName }: SkeletonStackProps) {
  return (
    <div className={`space-y-2 ${className ?? ""}`.trim()}>
      {Array.from({ length: rows }).map((_, rowNumber) => (
        <SkeletonBlock
          key={`skeleton-row-${rows}-${rowNumber + 1}`}
          className={rowClassName ?? "h-3"}
        />
      ))}
    </div>
  );
}

export function SkeletonSection({ title }: Readonly<{ title: string }>) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-6">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{title}</p>
      <div className="mt-3">
        <SkeletonStack rows={4} />
      </div>
    </section>
  );
}

export function SkeletonGrid({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}
