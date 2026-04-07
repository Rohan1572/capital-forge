"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type SyntheticEvent } from "react";
import { AuthFormShell } from "./AuthFormShell";

type ResetResponse = {
  data?: {
    ok?: boolean;
  };
  error?: string;
};

export function ResetPasswordForm({
  token,
}: Readonly<{
  token: string;
}>) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);
    void submitReset(event.currentTarget);
  };

  async function submitReset(form: HTMLFormElement) {
    try {
      const formData = new FormData(form);
      const passwordValue = formData.get("password");
      const confirmValue = formData.get("confirmPassword");
      const password = typeof passwordValue === "string" ? passwordValue : "";
      const confirmPassword = typeof confirmValue === "string" ? confirmValue : "";

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, newPassword: password }),
      });

      const payload = (await response.json().catch(() => null)) as ResetResponse | null;

      if (!response.ok) {
        setError(payload?.error ?? "Unable to reset the password.");
        return;
      }

      setMessage("Password updated successfully. You can sign in again now.");
      setTimeout(() => {
        router.replace("/login");
      }, 1200);
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthFormShell
      title="Reset password"
      description="Choose a new password for your CapitalForge account."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm text-zinc-200">
          <span>New password</span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-amber-400/60"
          />
        </label>
        <label className="block text-sm text-zinc-200">
          <span>Confirm new password</span>
          <input
            type="password"
            name="confirmPassword"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-amber-400/60"
          />
        </label>

        <div className="flex items-center justify-between gap-3 text-sm">
          <Link href="/forgot-password" className="text-zinc-400 transition hover:text-zinc-200">
            Request a new link
          </Link>
          <Link href="/login" className="text-zinc-200 transition hover:text-white">
            Back to sign in
          </Link>
        </div>

        {error ? (
          <p className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        {message ? (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {isSubmitting ? "Resetting password..." : "Reset password"}
        </button>
      </form>
    </AuthFormShell>
  );
}
