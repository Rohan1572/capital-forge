"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type SyntheticEvent } from "react";
import { AuthFormShell } from "./AuthFormShell";

export function RegisterForm({
  isSwitchAccount,
}: Readonly<{
  isSwitchAccount: boolean;
}>) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    void submitRegistration(event.currentTarget);
  };

  async function submitRegistration(form: HTMLFormElement) {
    try {
      const formData = new FormData(form);
      const nameValue = formData.get("name");
      const emailValue = formData.get("email");
      const passwordValue = formData.get("password");
      const name = typeof nameValue === "string" ? nameValue.trim() : "";
      const email = typeof emailValue === "string" ? emailValue.trim() : "";
      const password = typeof passwordValue === "string" ? passwordValue : "";

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Registration failed.");
        return;
      }

      router.replace("/dashboard");
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthFormShell
      title={isSwitchAccount ? "Create another account" : "Create account"}
      description={
        isSwitchAccount
          ? "Start a separate CapitalForge account without affecting the current session."
          : "Start simulating with CapitalForge."
      }
    >
      {isSwitchAccount ? (
        <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          You are already signed in. Creating a new account will replace the current session.
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm text-zinc-200">
          <span>Name</span>
          <input
            type="text"
            name="name"
            autoComplete="name"
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-amber-400/60"
          />
        </label>
        <label className="block text-sm text-zinc-200">
          <span>Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-amber-400/60"
          />
        </label>
        <label className="block text-sm text-zinc-200">
          <span>Password</span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-amber-400/60"
          />
        </label>

        <div className="flex items-center justify-between gap-3 text-sm">
          <Link
            href={isSwitchAccount ? "/login?switch=1" : "/login"}
            className="text-zinc-400 transition hover:text-zinc-200"
          >
            Already have an account?
          </Link>
          <Link href="/forgot-password" className="text-zinc-200 transition hover:text-white">
            Recover password
          </Link>
        </div>

        {error ? (
          <p className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthFormShell>
  );
}
