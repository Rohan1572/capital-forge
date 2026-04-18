import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { LogoutButton } from "@/components/LogoutButton";
import { PortfolioSnapshotSection } from "@/components/PortfolioSnapshotSection";
import { MonitoringWidget } from "@/components/MonitoringWidget";
import { RecentSimulationRunsWidget } from "@/components/RecentSimulationRunsWidget";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const [strategies, latestRun, strategyCount, runCount] = await Promise.all([
    prisma.strategy.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 2,
    }),
    prisma.simulationRun.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.strategy.count({ where: { userId: user.id } }),
    prisma.simulationRun.count({ where: { userId: user.id } }),
  ]);

  const latestStrategy = strategies[0] ?? null;
  const previousStrategy = strategies[1] ?? null;

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="max-w-2xl text-zinc-400">
            Signed in as <span className="text-zinc-200">{user?.email}</span>. Your latest
            portfolio, performance, and activity live below.
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

      <PortfolioSnapshotSection
        latestStrategy={latestStrategy}
        previousStrategy={previousStrategy}
        latestRun={latestRun}
        strategyCount={strategyCount}
        runCount={runCount}
      />
      <RecentSimulationRunsWidget take={5} />
      <MonitoringWidget days={30} />
    </>
  );
}
