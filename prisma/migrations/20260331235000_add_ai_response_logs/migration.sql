-- Store AI response metadata for strategy-linked runs
CREATE TABLE "AiResponseLog" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT,
    "kind" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiResponseLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiResponseLog_strategyId_idx" ON "AiResponseLog"("strategyId");
CREATE INDEX "AiResponseLog_kind_idx" ON "AiResponseLog"("kind");
CREATE INDEX "AiResponseLog_createdAt_idx" ON "AiResponseLog"("createdAt");
