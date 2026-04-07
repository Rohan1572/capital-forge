import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { AppNav } from "@/components/AppNav";
import { AppGuide } from "@/components/AppGuide";

type ShellUser = {
  name: string | null;
  email: string;
} | null;

type AppShellProps = Readonly<{
  user: ShellUser;
  children: ReactNode;
}>;

function getUserLabel(user: ShellUser) {
  if (!user) return "Guest";
  return user.name?.trim() || user.email;
}

export function AppShell({ user, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.08),_transparent_45%)]" />
      <header className="border-b border-zinc-900/80 bg-zinc-950/70 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
              CapitalForge
            </Link>
            <AppNav />
          </div>
          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                <div className="hidden text-xs text-zinc-400 sm:block">
                  Signed in as <span className="text-zinc-200">{getUserLabel(user)}</span>
                </div>
                <Link
                  href="/account"
                  className="rounded-lg border border-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:text-zinc-100"
                >
                  Account
                </Link>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-600"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full border border-amber-400/60 bg-amber-400/10 px-3 py-1.5 text-xs font-medium text-amber-100 transition hover:border-amber-300"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl px-6 pb-16 pt-10">
        <main className="flex flex-col gap-8">{children}</main>
      </div>
      <AppGuide />
    </div>
  );
}
