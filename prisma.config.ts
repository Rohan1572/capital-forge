import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 no longer loads `.env` automatically and the schema omits `url`, so
 * the CLI needs the connection string from here. The Next.js runtime is
 * unaffected: `lib/prisma.ts` reads `process.env.DATABASE_URL` directly.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
