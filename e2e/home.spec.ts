import { test, expect } from './utils/fixtures';

/**
 * Basic E2E tests for home page
 */
test.describe('Home Page', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('/');
    
    // Verify page loaded
    await expect(page).toHaveURL('/');
    
    // Check for main content
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should have correct title', async ({ page }) => {
    await page.goto('/');
    
    // Verify page title (adjust based on your actual title)
    await expect(page).toHaveTitle(/darter assistant/i);
  });

  test('should display navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check for navigation elements
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('should take screenshot', async ({ page }) => {
    await page.goto('/');
    
    // Take a screenshot for visual regression testing
    await expect(page).toHaveScreenshot('home-page.png', {
      fullPage: true,
    });
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await expect(page.locator('main')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('main')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('main')).toBeVisible();
  });
});

