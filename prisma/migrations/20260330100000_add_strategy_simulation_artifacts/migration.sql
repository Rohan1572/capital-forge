-- Add persisted simulation artifacts for strategy detail charts
ALTER TABLE "Strategy"
ADD COLUMN "simulationResults" JSONB,
ADD COLUMN "simulationSeed" INTEGER,
ADD COLUMN "simulationMode" TEXT,
ADD COLUMN "simulationShock" JSONB;
