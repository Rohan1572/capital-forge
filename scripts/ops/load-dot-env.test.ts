import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { loadDotEnv, parseDotEnv } from "./load-dot-env.mjs";

const ENV_KEY = "CAPITAL_FORGE_LOAD_DOT_ENV_TEST";

/** Writes a throwaway `.env` and returns its file URL. */
function writeTempEnv(contents: string) {
  const dir = mkdtempSync(path.join(tmpdir(), "capital-forge-dotenv-"));
  const file = path.join(dir, ".env");
  writeFileSync(file, contents, "utf8");
  return pathToFileURL(file);
}

afterEach(() => {
  delete process.env[ENV_KEY];
});

describe("parseDotEnv", () => {
  it("parses key/value pairs", () => {
    expect(parseDotEnv("DATABASE_URL=postgres://localhost/db")).toEqual({
      DATABASE_URL: "postgres://localhost/db",
    });
  });

  it("strips matching surrounding double and single quotes", () => {
    expect(parseDotEnv("A=\"one\"\nB='two'")).toEqual({ A: "one", B: "two" });
  });

  it("keeps a value that merely starts with a quote", () => {
    expect(parseDotEnv('A="unterminated')).toEqual({ A: '"unterminated' });
  });

  it("ignores comments, blank lines, and lines without a separator", () => {
    const parsed = parseDotEnv("# a comment\n\n   \nnot a pair\n  # indented comment\nB=2");
    expect(parsed).toEqual({ B: "2" });
  });

  it("handles CRLF line endings", () => {
    expect(parseDotEnv("A=1\r\nB=2\r\n")).toEqual({ A: "1", B: "2" });
  });

  it("preserves an empty value and any interior equals sign", () => {
    expect(parseDotEnv("A=\nB=postgres://u:p@h/db?sslmode=require&x=1")).toEqual({
      A: "",
      B: "postgres://u:p@h/db?sslmode=require&x=1",
    });
  });

  it("trims surrounding whitespace but not whitespace inside the value", () => {
    expect(parseDotEnv("  A  =  hello world  ")).toEqual({ A: "hello world" });
  });
});

describe("loadDotEnv", () => {
  it("populates process.env from the given file", () => {
    loadDotEnv(writeTempEnv(`${ENV_KEY}=from-file`));
    expect(process.env[ENV_KEY]).toBe("from-file");
  });

  it("never overwrites a variable that is already set", () => {
    process.env[ENV_KEY] = "from-shell";
    loadDotEnv(writeTempEnv(`${ENV_KEY}=from-file`));
    expect(process.env[ENV_KEY]).toBe("from-shell");
  });

  it("returns undefined when the file does not exist", () => {
    const missing = pathToFileURL(path.join(tmpdir(), "capital-forge-does-not-exist.env"));
    expect(loadDotEnv(missing)).toBeUndefined();
  });
});
