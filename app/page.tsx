import Link from "next/link";

export default function Home() {
  const routes = [
    { href: "/login", label: "Sign in" },
    { href: "/register", label: "Create account" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/simulate", label: "Simulate" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/strategy/demo", label: "Strategy Detail" },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-16 text-zinc-50">
      <main className="w-full max-w-2xl rounded-xl border border-zinc-800 bg-zinc-900/80 p-8">
        <h1 className="text-3xl font-semibold tracking-tight">CapitalForge</h1>
        <p className="mt-3 text-zinc-300">
          Base project scaffold with App Router, strict TypeScript, TailwindCSS, and linting.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 transition hover:border-zinc-500"
            >
              {route.label}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
