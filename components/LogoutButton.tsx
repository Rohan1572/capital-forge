"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    if (isLoading) return;

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        setError("Unable to sign out right now.");
        return;
      }

      router.replace("/login");
    } catch {
      setError("Unable to sign out right now.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoading}
        className="rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-100 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-500"
      >
        {isLoading ? "Signing out..." : "Sign out"}
      </button>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
