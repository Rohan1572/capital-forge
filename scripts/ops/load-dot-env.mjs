/**
 * Minimal `.env` loader for the operational scripts, so a gate run locally
 * sees the same values the Next.js runtime does.
 *
 * Reads `<repo>/.env` relative to this module rather than the current working
 * directory, so the gates behave the same when invoked from a subdirectory or
 * from CI. Existing environment variables always win: a value exported in the
 * shell (or set by CI) must not be overwritten by the file.
 *
 * Deliberately dependency-free. These scripts are launch gates that may run in
 * a minimal environment before `npm install`, so they cannot assume `dotenv`
 * is present. Mirrors the subset of `.env` syntax this project uses:
 * `KEY=value`, optional surrounding quotes, `#` comments, blank lines, and CRLF.
 */
import { readFileSync } from "node:fs";

const ENV_FILE_URL = new URL("../../.env", import.meta.url);

/**
 * @returns {Record<string, string>} the parsed key/value pairs from `.env`.
 * Returns an empty object when the file is missing or unreadable, which is the
 * normal case in CI where real values come from the environment.
 */
export function parseDotEnv(contents) {
  /** @type {Record<string, string>} */
  const parsed = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;

    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?$/.exec(trimmed);
    if (!match) continue;

    const key = match[1];
    let value = (match[2] ?? "").trim();

    // Strip a single matching pair of surrounding quotes. The closing quote is
    // only dropped when it is the final character, so a value that merely
    // starts with a quote is preserved.
    const isQuoted =
      value.length > 1 &&
      ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")));

    parsed[key] = isQuoted ? value.slice(1, -1) : value;
  }

  return parsed;
}

/**
 * Loads `.env` into `process.env` without overwriting variables that are
 * already set.
 *
 * @returns {string | undefined} the file path, or `undefined` when there is no
 * readable `.env` to load.
 */
export function loadDotEnv(envFileUrl = ENV_FILE_URL) {
  let contents;

  try {
    contents = readFileSync(envFileUrl, "utf8");
  } catch {
    return undefined;
  }

  for (const [key, value] of Object.entries(parseDotEnv(contents))) {
    process.env[key] ??= value;
  }

  return envFileUrl.pathname;
}
