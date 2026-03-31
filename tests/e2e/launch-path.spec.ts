import { expect, test } from "@playwright/test";

test("login, allocate, simulate, save, and view the leaderboard", async ({ page, baseURL }) => {
  const appUrl = baseURL ?? "http://localhost:3000";
  const uniqueId = Date.now();
  const email = `smoke-${uniqueId}@example.com`;
  const password = "Password123!";

  const registerResponse = await page.request.post("/api/auth/register", {
    headers: {
      origin: appUrl,
      "content-type": "application/json",
    },
    data: {
      email,
      password,
      name: "Smoke User",
    },
  });
  expect(registerResponse.ok()).toBeTruthy();

  await page.route("**/api/shocks/active", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { shock: null } }),
    });
  });

  await page.route("**/api/ai/risk", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          markdown: [
            "### Overall Assessment",
            "- The allocation is balanced enough for the launch smoke path.",
            "",
            "### Weaknesses",
            "- Concentration risk still exists in any simulated portfolio.",
            "",
            "### Allocation Improvements",
            "- Keep the allocation near 100% and watch the risk budget.",
            "",
            "### Downside Risks",
            "- Market shocks can quickly widen drawdown and tail loss.",
          ].join("\n"),
          meta: {
            model: "smoke-model",
            latencyMs: 12,
            estimatedCostUsd: 0,
          },
        },
      }),
    });
  });

  await page.route("**/api/ai/debate", async (route) => {
    const calls = [
      {
        role: "conservative",
        prompt: "smoke",
        response: [
          "Opening Statements",
          "- Preserve capital and avoid overexposure.",
          "",
          "Counter Arguments",
          "- A modest growth allocation still keeps diversification intact.",
          "",
          "Final Recommendation",
          "- Keep the portfolio balanced and proceed.",
        ].join("\n"),
      },
      {
        role: "growth",
        prompt: "smoke",
        response: [
          "Opening Statements",
          "- The growth sleeve can support upside without dominating the mix.",
          "",
          "Counter Arguments",
          "- The allocation is still diversified enough to stay credible.",
          "",
          "Final Recommendation",
          "- Run the portfolio and save the resulting strategy.",
        ].join("\n"),
      },
      {
        role: "risk",
        prompt: "smoke",
        response: [
          "Opening Statements",
          "- Tail risk remains the key thing to watch.",
          "",
          "Counter Arguments",
          "- The current mix is still reasonable for a smoke test.",
          "",
          "Final Recommendation",
          "- Save the strategy and inspect it on the leaderboard.",
        ].join("\n"),
      },
    ] as const;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          calls,
          sections: calls.map((call) => ({
            openingStatements: [call.response],
            counterArguments: [call.response],
            finalRecommendation: [call.response],
          })),
          meta: {
            model: "smoke-model",
            latencyMs: 12,
            estimatedCostUsd: 0,
            calls: calls.map((call) => ({
              role: call.role,
              model: "smoke-model",
              latencyMs: 12,
            })),
          },
        },
      }),
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

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click();

  await page.getByRole("link", { name: "Simulate" }).click();
  await expect(page.getByRole("heading", { name: "Portfolio Allocation" })).toBeVisible();

  await page.getByRole("spinbutton", { name: "Equity allocation" }).fill("35");
  await expect(page.getByText("Total allocation: 100%")).toBeVisible();

  const saveResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/strategies") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Run Simulation" }).click();
  expect((await saveResponse).status()).toBe(201);

  await expect(page.getByText("Strategy saved successfully")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open strategy detail" })).toBeVisible();

  await page.getByRole("link", { name: "Leaderboard" }).click();
  await expect(page.getByRole("heading", { name: "Leaderboard" })).toBeVisible();
  const smokeRow = page.getByRole("row").filter({ hasText: "Smoke User" }).first();
  await expect(smokeRow).toBeVisible();
  await expect(smokeRow.getByRole("button", { name: "Show details" })).toBeVisible();
});
