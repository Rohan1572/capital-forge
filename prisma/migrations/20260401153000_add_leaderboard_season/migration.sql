-- Persist the active leaderboard season month.
CREATE TABLE "LeaderboardSeason" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "activeMonth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaderboardSeason_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeaderboardSeason_scope_key" ON "LeaderboardSeason"("scope");
