import { describe, expect, it, vi } from "vitest";
import {
  createPasswordResetToken,
  getPasswordDigest,
  verifyPasswordResetToken,
} from "./passwordRecovery";

describe("password recovery tokens", () => {
  it("creates and verifies a token payload", () => {
    const now = 1_700_000_000_000;
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now);

    try {
      const token = createPasswordResetToken({
        userId: "user_123",
        email: "investor@example.com",
        passwordHash: "salt:hash",
        ttlMinutes: 60,
      });

      const payload = verifyPasswordResetToken(token);
      expect(payload).toEqual({
        userId: "user_123",
        email: "investor@example.com",
        passwordDigest: getPasswordDigest("salt:hash"),
        expiresAt: now + 60 * 60_000,
      });
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("rejects expired or tampered tokens", () => {
    const now = 1_700_000_000_000;
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now);

    try {
      const token = createPasswordResetToken({
        userId: "user_123",
        email: "investor@example.com",
        passwordHash: "salt:hash",
        ttlMinutes: 60,
      });

      const [payloadPart] = token.split(".");
      expect(verifyPasswordResetToken(`${payloadPart}.broken`)).toBeNull();

      nowSpy.mockReturnValue(now + 61 * 60_000);
      expect(verifyPasswordResetToken(token)).toBeNull();
    } finally {
      nowSpy.mockRestore();
    }
  });
});
