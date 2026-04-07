import type { ReactNode } from "react";

export function AuthFormShell({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description: string;
  children: ReactNode;
}>) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">{title}</h1>
        <p className="text-sm text-zinc-400">{description}</p>
      </header>

      {children}
    </div>
  );
}
