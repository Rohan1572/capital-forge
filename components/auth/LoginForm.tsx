"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type SyntheticEvent } from "react";
import { AuthFormShell } from "./AuthFormShell";

export function LoginForm({
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
    void submitLogin(event.currentTarget);
  };

  async function submitLogin(form: HTMLFormElement) {
    try {
      const formData = new FormData(form);
      const emailValue = formData.get("email");
      const passwordValue = formData.get("password");
      const email = typeof emailValue === "string" ? emailValue.trim() : "";
      const password = typeof passwordValue === "string" ? passwordValue : "";

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Login failed.");
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
      title={isSwitchAccount ? "Switch accounts" : "Sign in"}
      description={
        isSwitchAccount
          ? "Use a different CapitalForge account to replace the current session."
          : "Access your CapitalForge dashboard."
      }
    >
      {isSwitchAccount ? (
        <p className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
          You are already signed in. Enter another account below to switch sessions.
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
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
            autoComplete="current-password"
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-amber-400/60"
          />
        </label>

        <div className="flex items-center justify-between gap-3 text-sm">
          <Link href="/forgot-password" className="text-zinc-400 transition hover:text-zinc-200">
            Forgot password?
          </Link>
          <Link
            href={isSwitchAccount ? "/register?switch=1" : "/register"}
            className="text-zinc-200 transition hover:text-white"
          >
            Create an account
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
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthFormShell>
  );
}
