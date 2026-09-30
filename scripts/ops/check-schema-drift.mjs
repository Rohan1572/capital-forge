/**
 * Schema drift gate: fails if the live database no longer matches the schema.
 *
 * Uses `--from-config-datasource` rather than `--from-migrations` because the
 * latter replays migrations into a shadow database, creating and dropping
 * objects. This project has a single database, so that would destroy it.
 * `migrate diff` is read-only, so this check never mutates anything.
 *
 * Exit codes: 0 = no drift, 1 = could not run, 2 = drift detected.
 */
import { spawnSync } from "node:child_process";

import { loadDotEnv } from "./load-dot-env.mjs";

// `prisma migrate diff` is spawned with the inherited environment below, and
// Prisma 7 no longer loads `.env` on its own. Loading it here means a local run
// sees the same DATABASE_URL the app does.
loadDotEnv();

const result = spawnSync(
  "prisma",
  [
    "migrate",
    "diff",
    "--from-config-datasource",
    "--to-schema",
    "prisma/schema.prisma",
    "--exit-code",
  ],
  {
    stdio: "inherit",
    env: process.env,
    shell: true,
  },
);

if (result.error) {
  throw result.error;
}

if (result.status === 1) {
  console.error(
    "\nSchema drift check could not run. Verify that DATABASE_URL is set and the database is reachable.",
  );
  process.exit(1);
}

if (result.status === 2) {
  console.error(
    "\nSchema drift detected. Run `npm run prisma:migrate` to reconcile, or " +
      "inspect the database for changes made outside of Prisma Migrate.",
  );
  process.exit(2);
}

console.log("No schema drift detected.");
process.exit(0);
