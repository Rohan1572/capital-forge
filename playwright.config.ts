import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const isCI = Boolean(process.env.CI);

const npmRun = (script: string) =>
  process.platform === "win32" ? `npm.cmd run ${script}` : `npm run ${script}`;

export default defineConfig({
  testDir: "./tests/e2e",

  // E2E specs register unique accounts per run, so they can run in parallel.
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },

  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],

  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    // CI runs the production build so e2e validates what actually ships.
    command: isCI ? npmRun("start") : npmRun("dev"),
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
    env: {
      ...process.env,
      NODE_ENV: isCI ? "production" : "development",
    },
  },
});
