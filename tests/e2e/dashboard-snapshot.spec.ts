import { expect, test, type Page } from "@playwright/test";

async function registerAndLogin(page: Page, baseURL: string, email: string) {
  const password = "Password123!";

  let registerResponse = null as null | { ok: () => boolean };
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    registerResponse = await page.request.post("/api/auth/register", {
      headers: {
        origin: baseURL,
        "content-type": "application/json",
      },
      data: {
        email,
        password,
        name: "Dashboard User",
      },
    });

    if (registerResponse.ok()) {
      break;
    }

    if (attempt < 3) {
      await page.waitForTimeout(1000);
    }
  }

  expect(registerResponse?.ok()).toBeTruthy();
  await page.context().clearCookies();

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
}

async function gotoDashboardWithRetry(page: Page) {
  const attempts = 2;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const dashboardHeading = page.getByRole("heading", { name: "Dashboard" });

    try {
      await expect(dashboardHeading).toBeVisible();
      return;
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }

      await page.waitForTimeout(1000);
    }
  }
}

test("renders the dashboard snapshot sections when saved data exists", async ({
  page,
  baseURL,
}) => {
  const uniqueId = Date.now();
  const email = `dashboard-populated-${uniqueId}@example.com`;
  await registerAndLogin(page, baseURL ?? "http://localhost:3000", email);

  const strategyResult = await page.evaluate(async () => {
    const response = await fetch("/api/strategies", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        allocation: {
          equity: 30,
          startups: 20,
          bonds: 20,
          gold: 10,
          crypto: 10,
          cash: 10,
        },
        metrics: {
          expectedReturn: 0.14,
          standardDeviation: 0.09,
          sharpeRatio: 1.24,
          maxDrawdown: 0.12,
          valueAtRisk5: -0.08,
          conditionalValueAtRisk95: -0.11,
          probabilityOfLossOver30: 0.04,
        },
        assumptionsVersion: "v3.2",
        seed: 42,
        simulationMode: "baseline",
      }),
    });

    return {
      status: response.status,
      body: await response.text(),
    };
  });
  expect(strategyResult.status).toBe(201);

  await gotoDashboardWithRetry(page);

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Portfolio Snapshot" })).toBeVisible();
  await expect(page.getByText("Current Portfolio")).toBeVisible();
  await expect(page.getByText("Recent Performance", { exact: true })).toBeVisible();
  await expect(page.getByText("Recent Activity", { exact: true })).toBeVisible();
  await expect(page.getByText("equity 30%")).toBeVisible();
  await expect(page.getByText("baseline strategy run")).toBeVisible();
  await expect(page.getByText("Seed 42", { exact: true })).toBeVisible();
  await expect(page.getByText("No runs saved yet")).toHaveCount(0);
});

test("shows the empty dashboard snapshot when no strategy is saved", async ({ page, baseURL }) => {
  const uniqueId = Date.now();
  const email = `dashboard-empty-${uniqueId}@example.com`;
  await registerAndLogin(page, baseURL ?? "http://localhost:3000", email);

  await gotoDashboardWithRetry(page);

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No portfolio snapshot yet" })).toBeVisible();
  await expect(
    page.getByText(
      "Save a simulation to surface your latest allocation, performance metrics, and activity here.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "No runs saved yet" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Run your first simulation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse strategy history" })).toBeVisible();
  await expect(page.locator("article").filter({ hasText: "Current Portfolio" })).toHaveCount(0);
  await expect(page.locator("article").filter({ hasText: "Recent Performance" })).toHaveCount(0);
  await expect(page.locator("article").filter({ hasText: "Recent Activity" })).toHaveCount(0);
});
