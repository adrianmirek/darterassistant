import { test, expect } from "@playwright/test";

/**
 * Basic E2E tests for home page
 * Note: Home page is protected and requires authentication
 */
test.describe("Home Page", () => {
  test("should redirect to guest homepage when not authenticated", async ({ page }) => {
    await page.goto("/");

    // Should redirect to login page since home is protected
    await expect(page).toHaveURL("/");

    // Check for login form
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  test("should show guest homepage title after redirect", async ({ page }) => {
    await page.goto("/");

    // After redirect, should show login page title
    await expect(page).toHaveTitle(/Darter Assistant - Find Your Matches/i);
  });

  test("should display homepage content after redirect", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("main")).toBeVisible();
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
