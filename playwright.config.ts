import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./e2e",

  // Run tests in files in parallel
  fullyParallel: false,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : 1,

  // Global teardown - cleans up database after all tests
  globalTeardown: "./e2e/global-teardown.ts",

  // Reporter configuration
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')
    baseURL: process.env.BASE_URL || "http://localhost:3000",

    // Collect trace when retrying the failed test
    trace: "on",

    // Screenshot on failure
    screenshot: "only-on-failure",

    // Video on failure
    video: "retain-on-failure",
    //snapshotSuffix: "",
  },

  // Configure projects for major browsers - Only Chromium as per guidelines
  projects: [
    // Setup project - runs authentication once before authenticated tests
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    // Unauthenticated tests (login, register, home guest page, etc.)
    {
      name: "chromium-unauthenticated",
      testMatch: ["**/e2e/auth/**/*.spec.ts", "**/e2e/home.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        // No storage state - these tests need to be unauthenticated
      },
    },
    // Authenticated tests (tournaments, dashboard, etc.)
    {
      name: "chromium-authenticated",
      testMatch: "**/e2e/tournaments/**/*.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        // Use signed-in state for authenticated tests
        storageState: "playwright/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
