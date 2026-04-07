import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { LogoutButton } from "@/components/LogoutButton";
import { MonitoringWidget } from "@/components/MonitoringWidget";
import { RecentSimulationRunsWidget } from "@/components/RecentSimulationRunsWidget";

export default async function DashboardPage() {
  const user = await getSessionUser();

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-zinc-400">
            Signed in as <span className="text-zinc-200">{user?.email}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/account"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500"
          >
            Account settings
          </Link>
          <LogoutButton />
        </div>
      </header>
      <p className="text-zinc-400">
        Portfolio snapshot, metrics, and recent simulations will be shown here.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/strategies"
          className="inline-flex rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500"
        >
          View strategy history
        </Link>
        <Link
          href="/login?switch=1"
          className="inline-flex rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-100 transition hover:border-amber-300"
        >
          Switch account
        </Link>
      </div>

      <RecentSimulationRunsWidget take={5} />
      <MonitoringWidget days={30} />
    </>
  );
}
