"use client";

import { useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    void submitRegistration(event.currentTarget);
  }

  async function submitRegistration(form: HTMLFormElement) {
    const formData = new FormData(form);
    const nameValue = formData.get("name");
    const emailValue = formData.get("email");
    const passwordValue = formData.get("password");
    const name = typeof nameValue === "string" ? nameValue : "";
    const email = typeof emailValue === "string" ? emailValue : "";
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
      setIsSubmitting(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Create account</h1>
        <p className="text-sm text-zinc-400">Start simulating with CapitalForge.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm">
          <span>Name</span>
          <input
            type="text"
            name="name"
            autoComplete="name"
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
        </label>
        <label className="block text-sm">
          <span>Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
        </label>
        <label className="block text-sm">
          <span>Password</span>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
          />
        </label>

        {error ? (
          <p className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 transition disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="text-sm text-zinc-400">
        Already have an account?
        <Link href="/login" className="ml-1 text-zinc-100 hover:text-white">
          Sign in
        </Link>
      </p>
    </div>
  );
}
