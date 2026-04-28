import { beforeEach, describe, expect, it, vi } from "vitest";
import { createJsonRequest, sameOriginHeaders } from "./route-test-utils";

const mocks = vi.hoisted(() => {
  const cookieStore = {
    get: vi.fn(),
  };

  return {
    cookieStore,
    cookies: vi.fn(),
    getSessionUser: vi.fn(),
    verifyPassword: vi.fn(),
    updateUserProfile: vi.fn(),
    updateUserPassword: vi.fn(),
    deleteUserSessions: vi.fn(),
    deleteUserAccount: vi.fn(),
    isValidEmail: vi.fn(),
    createPasswordResetToken: vi.fn(),
    verifyPasswordResetToken: vi.fn(),
    getPasswordDigest: vi.fn(),
    prisma: {
      user: {
        findUnique: vi.fn(),
      },
      session: {
        deleteMany: vi.fn(),
      },
    },
  };
});

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

vi.mock("../../lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("../../lib/session", () => ({
  getSessionUser: mocks.getSessionUser,
}));

vi.mock("../../lib/auth", () => ({
  deleteUserAccount: mocks.deleteUserAccount,
  deleteUserSessions: mocks.deleteUserSessions,
  getSessionClearCookieOptions: vi.fn(() => ({
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: false,
  })),
  getSessionCookieName: vi.fn(() => "session-token"),
  isValidEmail: mocks.isValidEmail,
  updateUserProfile: mocks.updateUserProfile,
  updateUserPassword: mocks.updateUserPassword,
  verifyPassword: mocks.verifyPassword,
}));

vi.mock("../../lib/passwordRecovery", () => ({
  createPasswordResetToken: mocks.createPasswordResetToken,
  getPasswordDigest: mocks.getPasswordDigest,
  verifyPasswordResetToken: mocks.verifyPasswordResetToken,
}));

import { DELETE as deleteAccount } from "../../app/api/auth/account/route";
import { PATCH as updatePassword } from "../../app/api/auth/account/password/route";
import { PATCH as updateProfile } from "../../app/api/auth/account/profile/route";
import { POST as requestPasswordRecovery } from "../../app/api/auth/password-recovery/route";
import { POST as resetPassword } from "../../app/api/auth/password-reset/route";

const currentUser = {
  id: "user-1",
  email: "alice@example.com",
  name: "Alice",
  createdAt: new Date("2026-04-19T00:00:00.000Z"),
};

function resetCommonMocks() {
  mocks.cookies.mockReset();
  mocks.cookies.mockResolvedValue(mocks.cookieStore);
  mocks.cookieStore.get.mockReset();
  mocks.getSessionUser.mockReset();
  mocks.verifyPassword.mockReset();
  mocks.updateUserProfile.mockReset();
  mocks.updateUserPassword.mockReset();
  mocks.deleteUserSessions.mockReset();
  mocks.deleteUserAccount.mockReset();
  mocks.isValidEmail.mockReset();
  mocks.createPasswordResetToken.mockReset();
  mocks.verifyPasswordResetToken.mockReset();
  mocks.getPasswordDigest.mockReset();
  mocks.prisma.user.findUnique.mockReset();
  mocks.prisma.session.deleteMany.mockReset();
}

describe("auth account and password routes", () => {
  beforeEach(() => {
    resetCommonMocks();
  });

  it("deletes the account and clears the session cookie on a valid confirmation", async () => {
    mocks.getSessionUser.mockResolvedValue(currentUser);
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: currentUser.id,
      passwordHash: "hash-1",
    });
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.deleteUserSessions.mockResolvedValue(undefined);
    mocks.deleteUserAccount.mockResolvedValue(undefined);

    const response = await deleteAccount(
      createJsonRequest(
        "/api/auth/account",
        "DELETE",
        {
          currentPassword: "correct-horse-battery-staple",
          confirmEmail: "ALICE@example.com",
        },
        sameOriginHeaders(),
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: { ok: true } });
    expect(mocks.deleteUserSessions).toHaveBeenCalledWith(currentUser.id);
    expect(mocks.deleteUserAccount).toHaveBeenCalledWith(currentUser.id);
    expect(response.headers.get("set-cookie") ?? "").toContain("session-token=");
  });

  it("rejects account deletion when the confirmation email does not match exactly", async () => {
    mocks.getSessionUser.mockResolvedValue(currentUser);

    const response = await deleteAccount(
      createJsonRequest(
        "/api/auth/account",
        "DELETE",
        {
          currentPassword: "correct-horse-battery-staple",
          confirmEmail: "not-alice@example.com",
        },
        sameOriginHeaders(),
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Type your email address exactly to confirm deletion.",
    });
    expect(mocks.prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("updates a profile name without requiring a password change", async () => {
    mocks.getSessionUser.mockResolvedValue(currentUser);
    mocks.updateUserProfile.mockResolvedValue({
      id: currentUser.id,
      email: currentUser.email,
      name: "Alicia",
      createdAt: currentUser.createdAt,
    });

    const response = await updateProfile(
      createJsonRequest(
        "/api/auth/account/profile",
        "PATCH",
        {
          name: "  Alicia  ",
        },
        sameOriginHeaders(),
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        id: currentUser.id,
        email: currentUser.email,
        name: "Alicia",
        createdAt: currentUser.createdAt.toISOString(),
      },
    });
    expect(mocks.updateUserProfile).toHaveBeenCalledWith(currentUser.id, {
      name: "Alicia",
      email: currentUser.email,
    });
  });

  it("requires the current password before an email change", async () => {
    mocks.getSessionUser.mockResolvedValue(currentUser);
    mocks.isValidEmail.mockReturnValue(true);

    const response = await updateProfile(
      createJsonRequest(
        "/api/auth/account/profile",
        "PATCH",
        {
          email: "new-alice@example.com",
        },
        sameOriginHeaders(),
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Current password is required to change email.",
    });
    expect(mocks.updateUserProfile).not.toHaveBeenCalled();
  });

  it("rejects a duplicate email when the current password is valid", async () => {
    mocks.getSessionUser.mockResolvedValue(currentUser);
    mocks.isValidEmail.mockReturnValue(true);
    mocks.prisma.user.findUnique
      .mockResolvedValueOnce({
        id: currentUser.id,
        passwordHash: "hash-1",
      })
      .mockResolvedValueOnce({
        id: "user-2",
        email: "new-alice@example.com",
      });
    mocks.verifyPassword.mockResolvedValue(true);

    const response = await updateProfile(
      createJsonRequest(
        "/api/auth/account/profile",
        "PATCH",
        {
          email: "new-alice@example.com",
          currentPassword: "correct-horse-battery-staple",
        },
        sameOriginHeaders(),
      ),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "An account with that email already exists.",
    });
    expect(mocks.updateUserProfile).not.toHaveBeenCalled();
  });

  it("changes the password and preserves the current session token", async () => {
    mocks.cookies.mockResolvedValue(mocks.cookieStore);
    mocks.cookieStore.get.mockReturnValue({ value: "session-token-123" });
    mocks.getSessionUser.mockResolvedValue(currentUser);
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: currentUser.id,
      passwordHash: "hash-1",
    });
    mocks.verifyPassword.mockResolvedValue(true);
    mocks.updateUserPassword.mockResolvedValue({
      id: currentUser.id,
    });
    mocks.prisma.session.deleteMany.mockResolvedValue({ count: 2 });

    const response = await updatePassword(
      createJsonRequest(
        "/api/auth/account/password",
        "PATCH",
        {
          currentPassword: "correct-horse-battery-staple",
          newPassword: "super-secret-password",
        },
        sameOriginHeaders(),
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: { ok: true } });
    expect(mocks.updateUserPassword).toHaveBeenCalledWith(currentUser.id, "super-secret-password");
    expect(mocks.prisma.session.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: currentUser.id,
        token: { not: "session-token-123" },
      },
    });
  });

  it("rejects weak password updates before touching the database", async () => {
    mocks.getSessionUser.mockResolvedValue(currentUser);

    const response = await updatePassword(
      createJsonRequest(
        "/api/auth/account/password",
        "PATCH",
        {
          currentPassword: "correct-horse-battery-staple",
          newPassword: "short",
        },
        sameOriginHeaders(),
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Password must be at least 8 characters.",
    });
    expect(mocks.prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns a non-disclosing recovery response for unknown emails", async () => {
    mocks.isValidEmail.mockReturnValue(true);
    mocks.prisma.user.findUnique.mockResolvedValue(null);

    const response = await requestPasswordRecovery(
      createJsonRequest(
        "/api/auth/password-recovery",
        "POST",
        { email: "missing@example.com" },
        sameOriginHeaders(),
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        message: "If that email address exists, a reset link is ready.",
        resetLink: null,
      },
    });
    expect(mocks.createPasswordResetToken).not.toHaveBeenCalled();
  });

  it("creates a recovery link for a valid account", async () => {
    mocks.isValidEmail.mockReturnValue(true);
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: currentUser.id,
      email: currentUser.email,
      passwordHash: "hash-1",
    });
    mocks.createPasswordResetToken.mockReturnValue("token-abc+123");

    const response = await requestPasswordRecovery(
      createJsonRequest(
        "/api/auth/password-recovery",
        "POST",
        { email: "ALICE@example.com" },
        sameOriginHeaders(),
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: {
        message: "Recovery link generated.",
        resetLink: "/reset-password?token=token-abc%2B123",
      },
    });
    expect(mocks.createPasswordResetToken).toHaveBeenCalledWith({
      userId: currentUser.id,
      email: currentUser.email,
      passwordHash: "hash-1",
    });
  });

  it("rejects malformed password reset tokens", async () => {
    mocks.verifyPasswordResetToken.mockReturnValue(null);

    const response = await resetPassword(
      createJsonRequest(
        "/api/auth/password-reset",
        "POST",
        {
          token: "malformed",
          newPassword: "new-password-123",
        },
        sameOriginHeaders(),
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "The reset link is invalid or expired.",
    });
    expect(mocks.updateUserPassword).not.toHaveBeenCalled();
  });

  it("resets the password and deletes the other sessions for a valid token", async () => {
    mocks.cookies.mockResolvedValue(mocks.cookieStore);
    mocks.cookieStore.get.mockReturnValue({ value: "session-token-123" });
    mocks.verifyPasswordResetToken.mockReturnValue({
      userId: currentUser.id,
      email: currentUser.email,
      passwordDigest: "digest-1",
      expiresAt: Date.now() + 60_000,
    });
    mocks.prisma.user.findUnique.mockResolvedValue({
      id: currentUser.id,
      email: currentUser.email,
      passwordHash: "hash-1",
    });
    mocks.getPasswordDigest.mockReturnValue("digest-1");
    mocks.updateUserPassword.mockResolvedValue({
      id: currentUser.id,
    });
    mocks.prisma.session.deleteMany.mockResolvedValue({ count: 1 });

    const response = await resetPassword(
      createJsonRequest(
        "/api/auth/password-reset",
        "POST",
        {
          token: "valid.token",
          newPassword: "new-password-123",
        },
        sameOriginHeaders(),
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: { ok: true } });
    expect(mocks.updateUserPassword).toHaveBeenCalledWith(currentUser.id, "new-password-123");
    expect(mocks.prisma.session.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: currentUser.id,
        token: { not: "session-token-123" },
      },
    });
  });
});
