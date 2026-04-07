"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type SyntheticEvent } from "react";

type AccountUser = Readonly<{
  name: string | null;
  email: string;
  createdAt: string;
}>;

type ProfileResponse = {
  data?: {
    email?: string;
    name?: string | null;
  };
  error?: string;
};

type GenericResponse = {
  data?: {
    ok?: boolean;
  };
  error?: string;
};

export function AccountSettingsPanel({
  user,
}: Readonly<{
  user: AccountUser;
}>) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleProfileSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError(null);
    setProfileStatus(null);
    setIsSavingProfile(true);
    void submitProfile();
  };

  async function submitProfile() {
    try {
      const response = await fetch("/api/auth/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          email,
          currentPassword,
        }),
      });

      const payload = (await response.json().catch(() => null)) as ProfileResponse | null;

      if (!response.ok) {
        setProfileError(payload?.error ?? "Unable to save profile changes.");
        return;
      }

      setProfileStatus("Profile saved.");
      setCurrentPassword("");

      if (payload?.data?.email) {
        setEmail(payload.data.email);
      }
      if (payload?.data?.name !== undefined) {
        setName(payload.data.name ?? "");
      }

      router.refresh();
    } catch {
      setProfileError("Unable to reach the server. Please try again.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  const handlePasswordSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordStatus(null);
    setIsSavingPassword(true);
    void submitPassword();
  };

  async function submitPassword() {
    try {
      if (newPassword !== confirmNewPassword) {
        setPasswordError("New passwords do not match.");
        return;
      }

      const response = await fetch("/api/auth/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: passwordCurrent,
          newPassword,
        }),
      });

      const payload = (await response.json().catch(() => null)) as GenericResponse | null;

      if (!response.ok) {
        setPasswordError(payload?.error ?? "Unable to update the password.");
        return;
      }

      setPasswordStatus("Password updated.");
      setPasswordCurrent("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch {
      setPasswordError("Unable to reach the server. Please try again.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  const handleDeleteSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDeleteError(null);

    if (deleteConfirmation.trim().toLowerCase() !== user.email.toLowerCase()) {
      setDeleteError("Type your email address exactly to confirm deletion.");
      return;
    }

    setIsDeleting(true);
    void submitDelete();
  };

  async function submitDelete() {
    try {
      const response = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: deletePassword,
          confirmEmail: deleteConfirmation,
        }),
      });

      const payload = (await response.json().catch(() => null)) as GenericResponse | null;

      if (!response.ok) {
        setDeleteError(payload?.error ?? "Unable to delete the account.");
        return;
      }

      router.replace("/");
    } catch {
      setDeleteError("Unable to reach the server. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">Account settings</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Update your profile, change your password, or close your account.
            </p>
          </div>
          <Link
            href="/login?switch=1"
            className="rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500"
          >
            Switch account
          </Link>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Email</dt>
            <dd className="mt-2 text-sm text-zinc-100">{user.email}</dd>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Name</dt>
            <dd className="mt-2 text-sm text-zinc-100">{user.name?.trim() || "Not set"}</dd>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Member since</dt>
            <dd className="mt-2 text-sm text-zinc-100">
              {new Date(user.createdAt).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
        <h2 className="text-xl font-semibold text-zinc-50">Profile</h2>
        <p className="mt-1 text-sm text-zinc-400">Update your display name or email address.</p>

        <form onSubmit={handleProfileSubmit} className="mt-5 space-y-4">
          <label className="block text-sm text-zinc-200">
            <span>Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              type="text"
              autoComplete="name"
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-amber-400/60"
            />
          </label>
          <label className="block text-sm text-zinc-200">
            <span>Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-amber-400/60"
            />
          </label>
          <label className="block text-sm text-zinc-200">
            <span>Current password</span>
            <input
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-amber-400/60"
            />
          </label>

          {profileError ? (
            <p className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
              {profileError}
            </p>
          ) : null}
          {profileStatus ? (
            <p className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100">
              {profileStatus}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSavingProfile}
            className="rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingProfile ? "Saving..." : "Save profile"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
        <h2 className="text-xl font-semibold text-zinc-50">Password</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Change your password and sign out other sessions.
        </p>

        <form onSubmit={handlePasswordSubmit} className="mt-5 space-y-4">
          <label className="block text-sm text-zinc-200">
            <span>Current password</span>
            <input
              value={passwordCurrent}
              onChange={(event) => setPasswordCurrent(event.target.value)}
              type="password"
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-amber-400/60"
            />
          </label>
          <label className="block text-sm text-zinc-200">
            <span>New password</span>
            <input
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              minLength={8}
              autoComplete="new-password"
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-amber-400/60"
            />
          </label>
          <label className="block text-sm text-zinc-200">
            <span>Confirm new password</span>
            <input
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              type="password"
              minLength={8}
              autoComplete="new-password"
              className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-amber-400/60"
            />
          </label>

          {passwordError ? (
            <p className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
              {passwordError}
            </p>
          ) : null}
          {passwordStatus ? (
            <p className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100">
              {passwordStatus}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSavingPassword}
            className="rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-100 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSavingPassword ? "Updating..." : "Change password"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-rose-500/20 bg-rose-950/20 p-6">
        <h2 className="text-xl font-semibold text-rose-100">Delete account</h2>
        <p className="mt-1 text-sm text-rose-200/80">
          This permanently deletes your profile, sessions, and saved data.
        </p>

        <form onSubmit={handleDeleteSubmit} className="mt-5 space-y-4">
          <label className="block text-sm text-rose-100">
            <span>Confirm your email</span>
            <input
              value={deleteConfirmation}
              onChange={(event) => setDeleteConfirmation(event.target.value)}
              type="email"
              autoComplete="off"
              placeholder={user.email}
              className="mt-2 w-full rounded-xl border border-rose-500/30 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-rose-300"
            />
          </label>
          <label className="block text-sm text-rose-100">
            <span>Current password</span>
            <input
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              type="password"
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-rose-500/30 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-rose-300"
            />
          </label>

          {deleteError ? (
            <p className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-100">
              {deleteError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isDeleting}
            className="rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? "Deleting..." : "Delete account"}
          </button>
        </form>
      </section>
    </div>
  );
}
