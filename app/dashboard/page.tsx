import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { LogoutButton } from "@/components/LogoutButton";

export default async function DashboardPage() {
  const user = await getSessionUser();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-4 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-zinc-400">
            Signed in as <span className="text-zinc-200">{user?.email}</span>
          </p>
        </div>
        <LogoutButton />
      </header>
      <p className="text-zinc-400">
        Portfolio snapshot, metrics, and recent simulations will be shown here.
      </p>
      <div>
        <Link
          href="/strategies"
          className="inline-flex rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500"
        >
          View strategy history
        </Link>
      </div>
    </main>
  );
}
