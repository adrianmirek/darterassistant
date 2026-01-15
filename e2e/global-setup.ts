import { chromium, FullConfig } from "@playwright/test";

/**
 * Global setup that runs once before all tests
 * Unregisters any service workers to ensure Playwright route mocking works
 */
async function globalSetup(config: FullConfig) {
  const baseURL = config.use?.baseURL || "http://localhost:3000";

  console.log("Global setup: Unregistering service workers...");

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the app
    await page.goto(baseURL);

    // Mark session as test environment to prevent service worker registration
    await page.evaluate(() => {
      sessionStorage.setItem("playwright-test", "true");
    });

    // Unregister all existing service workers
    await page.evaluate(() => {
      return navigator.serviceWorker.getRegistrations().then((registrations) => {
        console.log(`Found ${registrations.length} service worker(s) to unregister`);
        return Promise.all(registrations.map((r) => r.unregister()));
      });
    });

    console.log("Global setup: Service workers unregistered and test mode enabled");
  } catch (error) {
    console.error("Global setup: Error in global setup:", error);
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;
