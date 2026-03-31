import { spawnSync } from "node:child_process";

const result = spawnSync(
  "prisma",
  [
    "migrate",
    "diff",
    "--from-migrations",
    "prisma/migrations",
    "--to-schema-datamodel",
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

process.exit(result.status ?? 1);
