import { Client } from "pg";

const databaseUrl = process.env.RESTORED_DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("RESTORED_DATABASE_URL or DATABASE_URL is required");
}

const requiredTables = [
  "User",
  "Session",
  "Strategy",
  "SimulationRun",
  "AiResponseLog",
  "ShockEvent",
  "AuditLog",
  "_prisma_migrations",
];

const requiredSimulationRunColumns = [
  "userId",
  "strategyId",
  "assumptionsVersion",
  "assumptions",
  "seed",
  "shockId",
  "shockModifiers",
];

const client = new Client({ connectionString: databaseUrl });

try {
  await client.connect();

  const tableResult = await client.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `,
  );
  const tables = new Set(tableResult.rows.map((row) => row.table_name));
  const missingTables = requiredTables.filter((table) => !tables.has(table));

  if (missingTables.length > 0) {
    throw new Error(`Missing tables: ${missingTables.join(", ")}`);
  }

  const columnResult = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'SimulationRun'
    `,
  );
  const columns = new Set(columnResult.rows.map((row) => row.column_name));
  const missingColumns = requiredSimulationRunColumns.filter((column) => !columns.has(column));

  if (missingColumns.length > 0) {
    throw new Error(`Missing SimulationRun columns: ${missingColumns.join(", ")}`);
  }

  const migrationResult = await client.query(
    'SELECT COUNT(*)::int AS count FROM "_prisma_migrations"',
  );
  const appliedMigrations = migrationResult.rows[0]?.count ?? 0;

  if (appliedMigrations <= 0) {
    throw new Error("No Prisma migrations were found in the restored database");
  }

  await client.query('SELECT 1 FROM "SimulationRun" LIMIT 1');

  console.log("Restored database validation passed.");
} finally {
  await client.end();
}
