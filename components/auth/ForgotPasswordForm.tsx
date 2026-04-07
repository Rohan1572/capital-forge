"use client";

import Link from "next/link";
import { useState, type SyntheticEvent } from "react";
import { AuthFormShell } from "./AuthFormShell";

type RecoveryResponse = {
  data?: {
    message?: string;
    resetLink?: string | null;
  };
  error?: string;
};

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setResetLink(null);
    setIsSubmitting(true);
    void submitRecovery(event.currentTarget);
  };

  async function submitRecovery(form: HTMLFormElement) {
    try {
      const formData = new FormData(form);
      const emailValue = formData.get("email");
      const email = typeof emailValue === "string" ? emailValue.trim() : "";

      const response = await fetch("/api/auth/password-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json().catch(() => null)) as RecoveryResponse | null;

      if (!response.ok) {
        setError(payload?.error ?? "Unable to generate a recovery link.");
        return;
      }

      setMessage(payload?.data?.message ?? "Recovery instructions are ready.");
      setResetLink(payload?.data?.resetLink ?? null);
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthFormShell
      title="Recover password"
      description="Request a reset link for your CapitalForge account."
    >
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

        <div className="flex items-center justify-between gap-3 text-sm">
          <Link href="/login" className="text-zinc-400 transition hover:text-zinc-200">
            Back to sign in
          </Link>
          <Link href="/register" className="text-zinc-200 transition hover:text-white">
            Create account
          </Link>
        </div>

        {error ? (
          <p className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        {message ? (
          <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100">
            <p>{message}</p>
            {resetLink ? (
              <div className="space-y-2 rounded-lg border border-emerald-500/20 bg-zinc-950/70 p-3">
                <p className="text-xs uppercase tracking-wide text-emerald-200/80">Reset link</p>
                <Link href={resetLink} className="break-all text-emerald-100 underline">
                  {resetLink}
                </Link>
                <p className="text-xs text-emerald-100/80">
                  Email delivery is not wired yet, so use the link above to finish recovery.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {isSubmitting ? "Generating link..." : "Send reset link"}
        </button>
      </form>
    </AuthFormShell>
  );
}
