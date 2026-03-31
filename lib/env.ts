function parseNumberEnv(name: string, value: string | undefined, fallback: number): number {
  if (value == null || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new TypeError(`${name} must be a finite number`);
  }

  return parsed;
}

export const RISK_FREE_RATE = parseNumberEnv(
  "RISK_FREE_RATE",
  process.env.NEXT_PUBLIC_RISK_FREE_RATE ?? process.env.RISK_FREE_RATE,
  0,
);
