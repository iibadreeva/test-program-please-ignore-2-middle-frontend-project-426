import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "http://localhost:3000";
const reuseExistingServer = !process.env.CI;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Local convenience: start Next only when BASE_URL is not provided by CI/Hexlet.
  ...(process.env.BASE_URL
    ? {}
    : {
        webServer: {
          command: "npm run dev",
          url: `${baseURL}/api/health`,
          reuseExistingServer,
          timeout: 120_000,
        },
      }),
});
