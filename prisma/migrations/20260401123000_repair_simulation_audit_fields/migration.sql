-- Repair local database drift for simulation audit fields
ALTER TABLE "SimulationRun"
ADD COLUMN IF NOT EXISTS "assumptionsVersion" TEXT,
ADD COLUMN IF NOT EXISTS "assumptions" JSONB,
ADD COLUMN IF NOT EXISTS "seed" INTEGER,
ADD COLUMN IF NOT EXISTS "shockId" TEXT,
ADD COLUMN IF NOT EXISTS "shockModifiers" JSONB;

ALTER TABLE "Strategy"
ADD COLUMN IF NOT EXISTS "assumptionsVersion" TEXT,
ADD COLUMN IF NOT EXISTS "assumptions" JSONB,
ADD COLUMN IF NOT EXISTS "seed" INTEGER,
ADD COLUMN IF NOT EXISTS "shockId" TEXT,
ADD COLUMN IF NOT EXISTS "shockModifiers" JSONB,
ADD COLUMN IF NOT EXISTS "simulationResults" JSONB,
ADD COLUMN IF NOT EXISTS "simulationSeed" INTEGER,
ADD COLUMN IF NOT EXISTS "simulationMode" TEXT,
ADD COLUMN IF NOT EXISTS "simulationShock" JSONB;
