import { test as base, type Page } from "@playwright/test";
import { LoginPage } from "./page-objects/LoginPage";

/**
 * Authentication fixture for E2E tests
 * Extends base test with authenticated context
 */

interface AuthFixtures {
  authenticatedPage: Page;
}

/**
 * Test credentials for E2E tests
 * Note: These should be created in your test database
 * Configure in .env.test file
 */
export const testUser = {
  email: process.env.TEST_USER_EMAIL || "test@example.com",
  password: process.env.TEST_USER_PASSWORD || "Test123!",
};

/**
 * Extended test with authenticated user fixture
 * Use this for tests that require authentication
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login page
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Perform login
    await loginPage.login(testUser.email, testUser.password);

    // Wait for redirect to home page (successful login)
    await page.waitForURL("/", { timeout: 10000 });

    // Use the authenticated page in tests
    await use(page);
  },
});

export { expect } from "@playwright/test";

/**
 * Helper function to create a test user in Supabase
 * Call this in global setup if needed
 */
export async function createTestUser() {
  // Implementation would use Supabase Admin API to create test user
  // This is optional and depends on your test setup strategy
}

/**
 * Helper function to clean up test data
 * Call this in global teardown
 */
export async function cleanupTestData() {
  // Implementation would clean up tournaments created during tests
  // This is handled by global-teardown.ts
}
