-- Add persisted simulation audit metadata for strategies and runs.
--
-- "assumptions" is intentionally omitted for SimulationRun: the initial
-- migration already creates that column, so re-adding it fails with 42701 and
-- the chain cannot be replayed onto a fresh database.
ALTER TABLE "SimulationRun"
ADD COLUMN "assumptionsVersion" TEXT,
ADD COLUMN "seed" INTEGER,
ADD COLUMN "shockId" TEXT,
ADD COLUMN "shockModifiers" JSONB;

ALTER TABLE "Strategy"
ADD COLUMN "assumptionsVersion" TEXT,
ADD COLUMN "assumptions" JSONB,
ADD COLUMN "seed" INTEGER,
ADD COLUMN "shockId" TEXT,
ADD COLUMN "shockModifiers" JSONB;
