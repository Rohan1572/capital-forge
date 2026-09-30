/**
 * Verifies the operator secrets required in production are present.
 * `--strict` also fails on variables that otherwise only warn.
 */
import process from "node:process";

import { loadDotEnv } from "./load-dot-env.mjs";

const args = new Set(process.argv.slice(2));
const isStrict = args.has("--strict");
const isProduction = process.env.NODE_ENV === "production" || isStrict;

/** Placeholder values that must never reach a real deployment. */
const PLACEHOLDERS = new Set([
  "your-openai-api-key",
  "your-cron-secret",
  "your-admin-trigger-secret",
  "your-reset-token-secret",
]);

const REQUIRED = [
  "DATABASE_URL",
  "OPENAI_API_KEY",
  "CRON_SECRET",
  "ADMIN_TRIGGER_SECRET",
  "RESET_TOKEN_SECRET",
];

const OPTIONAL = [
  { name: "OPENAI_MODEL", fallback: "gpt-4.1-mini" },
  { name: "OPENAI_STORE_RESPONSES", fallback: "false" },
  { name: "AI_INPUT_COST_PER_1M_TOKENS", fallback: "0" },
  { name: "AI_OUTPUT_COST_PER_1M_TOKENS", fallback: "0" },
  { name: "RISK_FREE_RATE", fallback: "0.02" },
  { name: "NEXT_PUBLIC_RISK_FREE_RATE", fallback: "0.02" },
];

const failures = [];
const warnings = [];

// Real environment variables always take precedence over `.env`, so an operator
// can override a value inline without editing the file.
loadDotEnv();

for (const name of REQUIRED) {
  const value = process.env[name]?.trim();

  if (!value) {
    failures.push(`${name} is not set.`);
    continue;
  }

  if (PLACEHOLDERS.has(value)) {
    failures.push(`${name} is still set to its placeholder value.`);
  }
}

if (process.env.RISK_FREE_RATE && process.env.NEXT_PUBLIC_RISK_FREE_RATE) {
  if (process.env.RISK_FREE_RATE !== process.env.NEXT_PUBLIC_RISK_FREE_RATE) {
    warnings.push(
      "RISK_FREE_RATE and NEXT_PUBLIC_RISK_FREE_RATE differ; Sharpe ratios may drift between server and client.",
    );
  }
}

for (const { name, fallback } of OPTIONAL) {
  if (!process.env[name]?.trim()) {
    const message = `${name} is not set; defaulting to "${fallback}".`;
    if (isProduction) failures.push(message);
    else warnings.push(message);
  }
}

for (const warning of warnings) {
  console.warn(`warn: ${warning}`);
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`error: ${failure}`);
  }
  console.error(`\nPreflight failed with ${failures.length} error(s).`);
  process.exit(1);
}

console.log(`Preflight passed with ${warnings.length} warning(s).`);
