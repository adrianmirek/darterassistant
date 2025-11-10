import { test as base } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Extended test fixture with custom utilities
 * Add custom fixtures and page objects here as needed
 */
export const test = base.extend({
  // Add custom fixtures here
  // Example: authenticated page
  // authenticatedPage: async ({ page }, use) => {
  //   // Perform authentication
  //   await page.goto('/auth/login');
  //   await page.fill('[name="email"]', 'test@example.com');
  //   await page.fill('[name="password"]', 'password123');
  //   await page.click('button[type="submit"]');
  //   await page.waitForURL('/');
  //   await use(page);
  // },
});

export { expect } from '@playwright/test';

/**
 * Helper function to create a new authenticated context
 */
export async function createAuthenticatedContext(page: Page, credentials: {
  email: string;
  password: string;
}) {
  await page.goto('/auth/login');
  await page.fill('[name="email"]', credentials.email);
  await page.fill('[name="password"]', credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
}

