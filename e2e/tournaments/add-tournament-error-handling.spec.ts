import { test, expect } from "@playwright/test";
import { AddTournamentPage } from "../utils/page-objects/AddTournamentPage";

/**
 * E2E tests for Add Tournament - Error Handling scenarios
 * Covers test scenario 14 from test plan (API failures, network errors)
 */
test.describe("Add Tournament - Error Handling", () => {
  let tournamentPage: AddTournamentPage;

  test.beforeEach(async ({ page }) => {
    tournamentPage = new AddTournamentPage(page);

    // Navigate to the app first to establish context and set test flag
    await page.goto("/tournaments/new?test=true");

    // Mark session as test environment to prevent service worker registration
    await page.evaluate(() => {
      sessionStorage.setItem("playwright-test", "true");
    });

    // Unregister any service workers that might interfere with route mocking
    await page.evaluate(() => {
      return navigator.serviceWorker.getRegistrations().then((registrations) => {
        return Promise.all(registrations.map((r) => r.unregister()));
      });
    });

    // Wait for the form to be fully loaded and interactive
    await page.waitForSelector('[data-testid="tournament-name-input"]', { state: "visible", timeout: 10000 });
    await page.waitForSelector('[data-testid="tournament-type-select"]', { state: "visible", timeout: 10000 });
  });

  test("Scenario 14: Error handling - API failure", async ({ page }) => {
    // Arrange - Complete form with 3 matches
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await tournamentPage.fillBasicInfo({
      name: "API Failure Test",
      date: yesterday.toISOString().split("T")[0],
      tournamentTypeId: "1",
    });
    await tournamentPage.clickNext();

    // Add 3 matches
    for (let i = 1; i <= 3; i++) {
      await tournamentPage.fillMatchMetrics({
        matchTypeId: "1",
        opponentName: `Player ${i}`,
        playerScore: 0,
        opponentScore: 3,
        averageScore: 70 + i,
        firstNineAvg: 75 + i,
        checkoutPercentage: 35 + i,
        score180Count: 0,
        highFinish: 0,
        bestLeg: 9,
        worstLeg: 9,
      });

      if (i < 3) {
        await tournamentPage.clickNewMatch();
        //await tournamentPage.waitForToast(/match.*saved/i);
      } else {
        await tournamentPage.clickNext();
      }
    }

    // Act - Block API request to simulate failure
    await page.route("**/api/tournaments", (route) => {
      route.abort("failed");
    });

    // Click Submit
    await tournamentPage.clickSubmit();

    // Assert - Error toast appears
    await tournamentPage.waitForToast(/failed|error/i);
    const toastText = await tournamentPage.getToastText();
    expect(toastText).toMatch(/failed|error/i);

    // Verify - User stays on Step 3
    await expect(tournamentPage.reviewTournamentName).toBeVisible();
    await expect(page.url()).toContain("/tournaments/new");

    // Verify - Form data is NOT lost
    await expect(tournamentPage.reviewMatchesCount).toContainText("3 matches");

    // Clean up route
    await page.unroute("**/api/tournaments");

    // Verify - User can retry submission
    await tournamentPage.clickSubmit();
    // After unrouting, submission should succeed
    //TODO fix this successfully submission toast
    //await tournamentPage.waitForToast(/tournament saved successfully/i);
  });

  test("API returns 400 Bad Request", async ({ page }) => {
    // Arrange
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await tournamentPage.fillBasicInfo({
      name: "Bad Request Test",
      date: yesterday.toISOString().split("T")[0],
      tournamentTypeId: "1",
    });
    await tournamentPage.clickNext();

    await tournamentPage.fillMatchMetrics({
      matchTypeId: "1",
      playerScore: 0,
      opponentScore: 3,
      averageScore: 75.0,
      firstNineAvg: 78.0,
      checkoutPercentage: 38.0,
    });
    await tournamentPage.clickNext();

    // Act - Mock API to return 400
    await page.route("**/api/tournaments", (route) => {
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Validation failed",
          details: ["Invalid tournament data"],
        }),
      });
    });

    await tournamentPage.clickSubmit();

    // Assert - Error message shown
    await tournamentPage.waitForToast(/invalid|validation|failed/i);

    // Clean up
    await page.unroute("**/api/tournaments");
  });

  test("API returns 500 Server Error", async ({ page }) => {
    // Arrange
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Wait a bit for any animations/transitions to complete
    await page.waitForTimeout(500);

    await tournamentPage.fillBasicInfo({
      name: "Server Error Test",
      date: yesterday.toISOString().split("T")[0],
      tournamentTypeId: "1",
    });
    await tournamentPage.clickNext();

    await tournamentPage.fillMatchMetrics({
      matchTypeId: "1",
      playerScore: 0,
      opponentScore: 3,
      averageScore: 75.0,
      firstNineAvg: 78.0,
      checkoutPercentage: 38.0,
    });
    await tournamentPage.clickNext();

    // Act - Mock API to return 500
    await page.route("**/api/tournaments", (route) => {
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Internal server error",
        }),
      });
    });

    await tournamentPage.clickSubmit();

    // Assert - Generic error message shown
    await tournamentPage.waitForToast(/error|unexpected/i);

    // Clean up
    await page.unroute("**/api/tournaments");
  });

  test("Network timeout", async ({ page }) => {
    // Arrange
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await tournamentPage.fillBasicInfo({
      name: "Timeout Test",
      date: yesterday.toISOString().split("T")[0],
      tournamentTypeId: "1",
    });
    await tournamentPage.clickNext();

    await tournamentPage.fillMatchMetrics({
      matchTypeId: "1",
      playerScore: 0,
      opponentScore: 3,
      averageScore: 75.0,
      firstNineAvg: 78.0,
      checkoutPercentage: 38.0,
    });
    await tournamentPage.clickNext();

    // Act - Simulate network timeout
    await page.route("**/api/tournaments", async (route) => {
      // Delay indefinitely to simulate timeout
      await new Promise((resolve) => setTimeout(resolve, 60000));
      route.abort("timedout");
    });

    await tournamentPage.clickSubmit();

    // Assert - Error shown (may take a moment)
    //TODO fix this timeout error toast
    //await tournamentPage.waitForToast(/error|failed|timeout/i);

    // Clean up
    await page.unroute("**/api/tournaments");
  });

  test("Tournament types API fails to load", async ({ page }) => {
    // Arrange - Block tournament types API BEFORE the beforeEach navigation
    // We need to set this up early, so we do it here and reload
    await page.route("**/api/tournament-types", (route) => {
      route.abort("failed");
    });

    // Act - Reload page to trigger the API call with the route mock in place
    await page.reload();

    // Assert - Dropdown is replaced by an error message
    const tournamentTypeSelect = tournamentPage.tournamentTypeSelect;

    // 1. Verify the dropdown is NOT in the DOM (since it's unmounted on error)
    await expect(tournamentTypeSelect).not.toBeAttached();

    // 2. Verify the error text is visible to the user
    const fieldError = page.locator("form").getByText("Failed to fetch");
    await expect(fieldError).toBeVisible();

    // Clean up
    await page.unroute("**/api/tournament-types");
  });

  //TODO AI: Should be displayed 'failed to fetch match types' error message, in the same way as tournament types API fails to load
  /*test("Match types API fails to load", async ({ page }) => {
    // Complete Step 1 successfully
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await tournamentPage.fillBasicInfo({
      name: "Match Types Error Test",
      date: yesterday.toISOString().split("T")[0],
      tournamentTypeId: "1",
    });

    // Block match types API
    await page.route("/api/match-types", (route) => {
      route.abort("failed");
    });

    await tournamentPage.clickNext();

    // Assert - Error state shown for match types
    const matchTypeSelect = tournamentPage.matchTypeSelect;
    
    await expect(matchTypeSelect).toBeVisible();
    await expect(matchTypeSelect).toHaveText(/select a match type/i);

    // Clean up
    await page.unroute("/api/match-types");
  });*/

  test("Submit button disabled during submission", async ({ page }) => {
    // Arrange
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Wait a bit for any animations/transitions to complete
    await page.waitForTimeout(500);

    await tournamentPage.fillBasicInfo({
      name: "Submit Disabled Test",
      date: yesterday.toISOString().split("T")[0],
      tournamentTypeId: "1",
    });
    await tournamentPage.clickNext();

    await tournamentPage.fillMatchMetrics({
      matchTypeId: "1",
      playerScore: 0,
      opponentScore: 3,
      averageScore: 75.0,
      firstNineAvg: 78.0,
      checkoutPercentage: 38.0,
    });
    await tournamentPage.clickNext();

    // Mock slow API response
    await page.route("**/api/tournaments", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      route.continue();
    });

    // Act - Click submit
    const submitPromise = tournamentPage.clickSubmit();

    // Assert - Submit button should be disabled during submission
    await page.waitForTimeout(500); // Give it a moment to start submitting
    const isDisabled = await tournamentPage.submitButton.isDisabled();
    expect(isDisabled).toBe(true);

    // Wait for submission to complete
    await submitPromise;

    // Clean up
    await page.unroute("**/api/tournaments");
  });

  //TODO AI
  /*
  test("Form validation prevents submission with invalid foreign keys", async ({ page }) => {
    // Note: This is more of an API test, but we can verify client-side handling

    // Intercept the API call that fetches tournament types
  await page.route('/api/tournament-types', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: "1", name: "Leagues + SKO" },
        { id: "9999", name: "Corrupted Type" }]),
    });
  });

  await page.route('/api/tournaments', async (route) => {
    await route.fulfill({
      status: 400,
      body: JSON.stringify({ message: "Invalid tournament type selection" }),
    });
  });
    
    await tournamentPage.goto();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await tournamentPage.fillBasicInfo({
      name: "Invalid FK Test",
      date: yesterday.toISOString().split("T")[0],
      tournamentTypeId: "9999", // Invalid ID
    });
    await tournamentPage.clickNext();

    // If client-side validation exists, should prevent navigation
    // Or if we reach Step 2, API should reject on submission
    // 3. Assert that the server/client displays an error message
    await expect(page.getByText(/invalid selection/i)).toBeVisible();
  }); */

  test("Multiple rapid submissions prevented", async ({ page }) => {
    // Arrange - Step 1: Fill basic info
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await tournamentPage.fillBasicInfo({
      name: "Rapid Submit Test",
      date: yesterday.toISOString().split("T")[0],
      tournamentTypeId: "1",
    });
    await tournamentPage.clickNext();

    // Step 2: Fill match metrics
    await tournamentPage.fillMatchMetrics({
      matchTypeId: "1",
      playerScore: 0,
      opponentScore: 3,
      averageScore: 75.0,
      firstNineAvg: 78.0,
      checkoutPercentage: 38.0,
    });

    // Set up slow API mock BEFORE navigating to Step 3
    let submissionCount = 0;
    await page.route("**/api/tournaments", async (route) => {
      if (route.request().method() === "POST") {
        submissionCount++;
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await route.continue();
      } else {
        await route.continue();
      }
    });

    // Navigate to Step 3 (Review)
    await tournamentPage.clickNext();

    // Verify we're on Step 3 and submit button is visible
    await expect(tournamentPage.submitButton).toBeVisible();
    await expect(tournamentPage.submitButton).toBeEnabled();

    // Act - Click submit
    await tournamentPage.clickSubmit();

    // Assert - Button should become disabled immediately
    await expect(tournamentPage.submitButton).toBeDisabled({ timeout: 1000 });

    // Try rapid second and third clicks - should be prevented (button is disabled)
    // These should not trigger additional API calls
    const clickPromises = [
      tournamentPage.submitButton.click({ timeout: 500 }).catch(() => "prevented"),
      tournamentPage.submitButton.click({ timeout: 500 }).catch(() => "prevented"),
    ];
    await Promise.all(clickPromises);

    // Verify only one submission went through
    expect(submissionCount).toBe(1);

    // Clean up
    await page.unroute("**/api/tournaments");
  });
});
