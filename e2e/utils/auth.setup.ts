import { test as setup, expect } from "@playwright/test";
import { LoginPage } from "./page-objects/LoginPage";

const authFile = "playwright/.auth/user.json";

/**
 * Global authentication setup
 * Runs once before all tests to create authenticated session
 * Saves the storage state (cookies) to be reused by all tests
 */
setup("authenticate", async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();

  // Get test credentials from environment variables (.env.test)
  const testEmail = process.env.E2E_USERNAME || process.env.TEST_USER_EMAIL || "test@example.com";
  const testPassword = process.env.E2E_PASSWORD || process.env.TEST_USER_PASSWORD || "Test123!";

  console.log(`Authenticating with email: ${testEmail}`);

  // Perform login
  await loginPage.login(testEmail, testPassword);

  // Wait for successful login - should redirect away from /auth/login
  await page.waitForURL((url) => !url.pathname.includes("/auth/login"), {
    timeout: 15000,
  });

  // Verify we're logged in by checking we can access a protected route
  await page.goto("/tournaments");
  await expect(page).not.toHaveURL(/\/auth\/login/);

  console.log("Authentication successful, saving storage state...");

  // End of authentication steps - save storage state
  await page.context().storageState({ path: authFile });

  console.log(`Storage state saved to ${authFile}`);
});
