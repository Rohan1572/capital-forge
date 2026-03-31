-- Add persisted simulation audit metadata for strategies and runs
ALTER TABLE "SimulationRun"
ADD COLUMN "assumptionsVersion" TEXT,
ADD COLUMN "assumptions" JSONB,
ADD COLUMN "seed" INTEGER,
ADD COLUMN "shockId" TEXT,
ADD COLUMN "shockModifiers" JSONB;

ALTER TABLE "Strategy"
ADD COLUMN "assumptionsVersion" TEXT,
ADD COLUMN "assumptions" JSONB,
ADD COLUMN "seed" INTEGER,
ADD COLUMN "shockId" TEXT,
ADD COLUMN "shockModifiers" JSONB;
