import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3001",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? {
          launchOptions: {
            executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
          },
        }
      : {}),
  },
  webServer: process.env.E2E_EXTERNAL_SERVER
    ? undefined
    : {
        command: "npm run dev -- --port 3001",
        url: "http://localhost:3001",
        reuseExistingServer: false,
        env: {
          NEXT_DIST_DIR: ".next-e2e",
          CONTACT_TRANSPORT: "mock",
          NEXT_PUBLIC_SITE_URL: "http://localhost:3001",
          CMS_DATA_DIR: process.env.CMS_DATA_DIR || `.data/e2e-${Date.now()}`,
          ADMIN_SETUP_TOKEN: "lea-e2e-only-setup-token-not-for-production-2026",
        },
        timeout: 120000,
      },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
});
