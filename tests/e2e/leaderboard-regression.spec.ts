import { expect, test } from "@playwright/test";

type LeaderboardPayload = {
  data: Array<{
    id: string;
    name: string;
    allocation: Record<string, number>;
    metrics: {
      expectedReturn: number;
      sharpeRatio: number;
      maxDrawdown: number;
      valueAtRisk5: number;
      conditionalValueAtRisk95: number;
    };
    createdAt: string;
    rank: number;
  }>;
  month: string;
  season: {
    activeMonth: string;
    currentMonth: string;
  };
  activeShock: {
    id: string;
    title: string;
  } | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

function buildLeaderboardPayload(
  month: string,
  shock: { id: string; title: string },
): LeaderboardPayload {
  const rankLabel = month === "2026-03" ? "March Runner" : "April Runner";

  return {
    data: [
      {
        id: `${month}-strategy`,
        name: rankLabel,
        allocation: { Equity: 35, Bonds: 35, Cash: 30 },
        metrics: {
          expectedReturn: month === "2026-03" ? 0.14 : 0.16,
          sharpeRatio: month === "2026-03" ? 1.25 : 1.4,
          maxDrawdown: month === "2026-03" ? 0.11 : 0.09,
          valueAtRisk5: month === "2026-03" ? -0.08 : -0.06,
          conditionalValueAtRisk95: month === "2026-03" ? -0.12 : -0.1,
        },
        createdAt: `${month}-02T12:00:00.000Z`,
        rank: 1,
      },
    ],
    month,
    season: {
      activeMonth: "2026-04",
      currentMonth: "2026-04",
    },
    activeShock: shock,
    pagination: {
      page: 1,
      pageSize: 25,
      total: 1,
      totalPages: 1,
    },
  };
}

test("leaderboard month navigation and shock context remain visible", async ({ page, baseURL }) => {
  const appUrl = baseURL ?? "http://localhost:3000";
  const uniqueId = Date.now();
  const email = `leaderboard-${uniqueId}@example.com`;
  const password = "Password123!";

  const registerResponse = await page.request.post("/api/auth/register", {
    headers: {
      origin: appUrl,
      "content-type": "application/json",
    },
    data: {
      email,
      password,
      name: "Leaderboard User",
    },
  });
  expect(registerResponse.ok()).toBeTruthy();

  await page.route("**/api/shocks/active", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          shock: {
            id: "shock-apr-2026",
            title: "April Shock",
            description: "April shock context for leaderboard testing.",
          },
        },
      }),
    });
  });

  await page.route("**/api/leaderboard**", async (route) => {
    const url = new URL(route.request().url());
    const month = url.searchParams.get("month") ?? "2026-04";
    const shock =
      month === "2026-03"
        ? { id: "shock-mar-2026", title: "March Shock" }
        : { id: "shock-apr-2026", title: "April Shock" };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(buildLeaderboardPayload(month, shock)),
    });
  });

  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  const loginResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/auth/login") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Sign in" }).click();
  expect((await loginResponse).status()).toBe(200);

  await page.goto("/leaderboard");
  await expect(page.getByRole("heading", { name: "Leaderboard" })).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByLabel("Month")).toHaveValue("2026-04");
  await expect(page.getByText("Current cycle: 2026-04", { exact: true })).toBeVisible();
  const viewingMonthCard = page
    .getByText("Viewing Month", { exact: true })
    .locator("xpath=ancestor::div[contains(@class,'rounded-lg')][1]");
  const shockContextCard = page
    .getByText("Shock Context", { exact: true })
    .locator("xpath=ancestor::div[contains(@class,'rounded-lg')][1]");
  await expect(viewingMonthCard).toContainText("April 2026");
  await expect(shockContextCard).toContainText("April Shock");
  await expect(shockContextCard).toContainText("Shock ID shock-apr-2026");
  await expect(page.getByRole("row").filter({ hasText: "April Runner" }).first()).toContainText(
    "#1",
  );

  await page.getByRole("button", { name: "Previous month" }).click();
  await expect(page.getByLabel("Month")).toHaveValue("2026-03");
  await expect(page.getByText("Current cycle: 2026-04", { exact: true })).toBeVisible();
  await expect(viewingMonthCard).toContainText("March 2026");
  await expect(shockContextCard).toContainText("March Shock");
  await expect(shockContextCard).toContainText("Shock ID shock-mar-2026");
  await expect(page.getByRole("row").filter({ hasText: "March Runner" }).first()).toContainText(
    "#1",
  );

  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page.getByLabel("Month")).toHaveValue("2026-04");
  await expect(viewingMonthCard).toContainText("April 2026");
  await expect(shockContextCard).toContainText("April Shock");
});
