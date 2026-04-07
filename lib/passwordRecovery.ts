import crypto from "node:crypto";

const PASSWORD_RESET_TTL_MINUTES = 60;
const RESET_TOKEN_SECRET =
  process.env["RESET_TOKEN_SECRET"] ??
  process.env["RESET_SECRET"] ??
  process.env["SESSION_SECRET"] ??
  "capital-forge-reset-token-secret";

type PasswordResetTokenPayload = Readonly<{
  userId: string;
  email: string;
  passwordDigest: string;
  expiresAt: number;
}>;

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return crypto.createHmac("sha256", RESET_TOKEN_SECRET).update(value).digest("base64url");
}

export function getPasswordDigest(passwordHash: string) {
  return crypto.createHmac("sha256", RESET_TOKEN_SECRET).update(passwordHash).digest("base64url");
}

export function createPasswordResetToken(payload: {
  userId: string;
  email: string;
  passwordHash: string;
  ttlMinutes?: number;
}) {
  const expiresAt = Date.now() + (payload.ttlMinutes ?? PASSWORD_RESET_TTL_MINUTES) * 60_000;
  const tokenPayload: PasswordResetTokenPayload = {
    userId: payload.userId,
    email: payload.email,
    passwordDigest: getPasswordDigest(payload.passwordHash),
    expiresAt,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifyPasswordResetToken(token: string): PasswordResetTokenPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = sign(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const providedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) return null;

  if (!crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      base64UrlDecode(encodedPayload),
    ) as Partial<PasswordResetTokenPayload>;
    if (
      typeof payload.userId !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.passwordDigest !== "string" ||
      typeof payload.expiresAt !== "number"
    ) {
      return null;
    }

    if (payload.expiresAt < Date.now()) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      passwordDigest: payload.passwordDigest,
      expiresAt: payload.expiresAt,
    };
  } catch {
    return null;
  }
}
