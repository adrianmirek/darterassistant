import { test, expect } from "@playwright/test";

/**
 * Basic E2E tests for home page
 * Note: Home page is protected and requires authentication
 */
test.describe("Home Page", () => {
  test("should redirect to login when not authenticated", async ({ page }) => {
    await page.goto("/");

    // Should redirect to login page since home is protected
    await expect(page).toHaveURL("/auth/login");

    // Check for login form
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  test("should show login page title after redirect", async ({ page }) => {
    await page.goto("/");

    // After redirect, should show login page title
    await expect(page).toHaveTitle(/sign in.*darter assistant/i);
  });

  test("should display navigation on login page after redirect", async ({ page }) => {
    await page.goto("/");

    // After redirect to login, check for GuestNav navigation elements
    // Login page has links to register and forgot password
    const registerLink = page.locator('a[href="/auth/register"]');
    await expect(registerLink).toBeVisible();
  });

  test("should take screenshot", async ({ page }) => {
    // Skip screenshot tests in CI - they're platform-specific
    test.skip(!!process.env.CI, "Screenshot tests are skipped in CI");

    await page.goto("/");

    // Take a screenshot for visual regression testing
    await expect(page).toHaveScreenshot("home-page.png", {
      fullPage: true,
    });
  });

  test("should be responsive", async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    await expect(page.locator("main")).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator("main")).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator("main")).toBeVisible();
  });
});
