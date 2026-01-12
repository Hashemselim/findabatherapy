import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Find A BA Therapy
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use */
  reporter: [["html", { open: "never" }], ["list"]],
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    /* Collect trace when retrying the failed test */
    trace: "on-first-retry",
    /* Take screenshot on failure */
    screenshot: "only-on-failure",
    /* Video on failure */
    video: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    // Setup project for authentication - creates test account
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },

    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Use saved auth state from setup
        storageState: "./e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },

    /* Test against mobile viewports */
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 5"],
        // Use saved auth state from setup
        storageState: "./e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],

  /* Run local dev server before starting the tests */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true, // Always reuse if server is already running
    timeout: 120000,
  },
});
