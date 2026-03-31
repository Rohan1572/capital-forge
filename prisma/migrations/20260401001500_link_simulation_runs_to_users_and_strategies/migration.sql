-- Link simulation runs to users and strategies
ALTER TABLE "SimulationRun"
ADD COLUMN "userId" TEXT,
ADD COLUMN "strategyId" TEXT;

ALTER TABLE "SimulationRun"
ADD CONSTRAINT "SimulationRun_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SimulationRun"
ADD CONSTRAINT "SimulationRun_strategyId_fkey"
FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "SimulationRun_userId_createdAt_idx" ON "SimulationRun"("userId", "createdAt");
CREATE INDEX "SimulationRun_strategyId_idx" ON "SimulationRun"("strategyId");
