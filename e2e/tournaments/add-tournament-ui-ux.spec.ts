import { test, expect } from "@playwright/test";
import { AddTournamentPage } from "../utils/page-objects/AddTournamentPage";

/**
 * E2E tests for Add Tournament - UI/UX scenarios
 * Covers test scenarios 10, 13 from test plan (responsive design, loading states)
 */
test.describe("Add Tournament - UI/UX", () => {
  let tournamentPage: AddTournamentPage;

  test.beforeEach(async ({ page }) => {
    tournamentPage = new AddTournamentPage(page);
    await tournamentPage.goto();
  });

  test("Scenario 10: Responsive design - Mobile view", async ({ page }) => {
    // Arrange - Set mobile viewport iPhone SE
    await page.setViewportSize({ width: 375, height: 667 });
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await tournamentPage.fillBasicInfo({
      name: "Mobile Test",
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
        averageScore: 70 + i * 2,
        firstNineAvg: 75 + i * 2,
        checkoutPercentage: 35 + i,
      });

      if (i < 3) {
        await tournamentPage.clickNewMatch();
        await tournamentPage.waitForToast(/match.*saved/i);
      } else {
        await tournamentPage.clickNext();
      }
    }

    // Assert - Step 3: Table should be HIDDEN on mobile
    const tableVisible = await tournamentPage.reviewMatchesTable.isVisible();
    expect(tableVisible).toBe(false);

    // Assert - Card view should be VISIBLE on mobile
    const cardsVisible = await tournamentPage.reviewMatchesCards.isVisible();
    expect(cardsVisible).toBe(true);

    // Verify - Each match displays as a card
    const cards = await tournamentPage.reviewMatchesCards.locator(".match-card").count();
    expect(cards).toBe(3);

    // Act - Resize to desktop width
    await page.setViewportSize({ width: 1280, height: 800 });

    // Wait for responsive layout to adjust
    await page.waitForTimeout(300);

    // Assert - Table is now VISIBLE
    const tableVisibleDesktop = await tournamentPage.reviewMatchesTable.isVisible();
    expect(tableVisibleDesktop).toBe(true);

    // Assert - Cards are now HIDDEN
    const cardsVisibleDesktop = await tournamentPage.reviewMatchesCards.isVisible();
    expect(cardsVisibleDesktop).toBe(false);
  });

  test("Scenario 13: Loading states", async ({ page }) => {
    // Verify initial load - tournament types dropdown
    const tournamentTypeSelect = tournamentPage.tournamentTypeSelect;

    // Note: This test depends on implementation details
    // Check if "Loading tournament types..." text appears (may be transient)
    // Or check that dropdown is disabled during load

    // After load, dropdown should enable and show options
    await expect(tournamentTypeSelect).toBeEnabled({ timeout: 5000 });

    // Click to verify options are loaded
    await tournamentTypeSelect.click();
    const options = page.locator('[role="option"]');
    await expect(options).toHaveCount(2, { timeout: 2000 }); // "Leagues + SKO", "SKO"

    // Close dropdown
    await page.keyboard.press("Escape");

    // Navigate to Step 2
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await tournamentPage.fillBasicInfo({
      name: "Loading Test",
      date: yesterday.toISOString().split("T")[0],
      tournamentTypeId: "1",
    });
    await tournamentPage.clickNext();

    // Verify - Match types dropdown loads
    const matchTypeSelect = tournamentPage.matchTypeSelect;
    await expect(matchTypeSelect).toBeEnabled({ timeout: 5000 });

    // Click to verify match type options are loaded
    await matchTypeSelect.click();
    const matchOptions = page.locator('[role="option"]');
    // Should have match types like "501", "701", "Cricket", etc.
    const matchOptionsCount = await matchOptions.count();
    expect(matchOptionsCount).toBeGreaterThan(0);
  });

  test("Form fields have proper labels and accessibility", async ({ page }) => {
    // Verify Step 1 accessibility
    await expect(page.locator('label:has-text("Tournament Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Date")')).toBeVisible();
    await expect(page.locator('label:has-text("Tournament Type")')).toBeVisible();

    // Navigate to Step 2
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await tournamentPage.fillBasicInfo({
      name: "Accessibility Test",
      date: yesterday.toISOString().split("T")[0],
      tournamentTypeId: "1",
    });
    await tournamentPage.clickNext();

    // Verify Step 2 accessibility
    await expect(page.locator('label:has-text("Match Type")')).toBeVisible();
    await expect(page.locator('label:has-text("Opponent Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Result")')).toBeVisible();
    await expect(page.locator('label:has-text("Average Score")')).toBeVisible();
  });

  /* TODO AI
  test("Stepper navigation shows current step", async ({ page }) => {
    // Locate the stepper container
    const progressNav = page.getByRole('navigation', { name: 'Progress' });
    const activeClass = /bg-primary text-primary-foreground/;

    // Verify - Step 1 ("Basic Info") is active initially
    // We find the listitem that contains the text 'Basic Info'
    const step1 = progressNav.getByRole('listitem').filter({ hasText: 'Basic Info' }).locator('div.rounded-full'); // Targets the circle specifically;
    await expect(step1).toHaveClass(activeClass);

    // Navigate to Step 2
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    await tournamentPage.fillBasicInfo({
      name: "Stepper Test",
      date: yesterday.toISOString().split("T")[0],
      tournamentTypeId: "1",
    });
    await tournamentPage.clickNext();

    // Verify - Step 2 ("Metrics") is now active
    const step2 = progressNav.getByRole('listitem').filter({ hasText: 'Metrics' });
    await expect(step1).toHaveAttribute("data-current", "true");

    // Add a match and go to Step 3
    await tournamentPage.fillMatchMetrics({
      matchTypeId: "1",
      playerScore: 0,
      opponentScore: 3,
      averageScore: 75.0,
      firstNineAvg: 78.0,
      checkoutPercentage: 38.0,
    });
    await tournamentPage.clickNext();

    // Verify - Step 3 ("Review") is now active
    const step3 = progressNav.getByRole('listitem').filter({ hasText: 'Review' });
    await expect(step3).toHaveAttribute("data-current", "true");
  });
  */

  test("Form buttons have proper states", async () => {
    // Step 1 - Back button should not exist
    await expect(tournamentPage.backButton).toBeDisabled();

    // Next button should be visible and enabled
    await expect(tournamentPage.nextButton).toBeVisible();
    await expect(tournamentPage.nextButton).toBeEnabled();

    // Navigate to Step 2
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await tournamentPage.fillBasicInfo({
      name: "Button States Test",
      date: yesterday.toISOString().split("T")[0],
      tournamentTypeId: "1",
    });
    await tournamentPage.clickNext();

    // Step 2 - Both Back and Next should be visible
    await expect(tournamentPage.backButton).toBeVisible();
    await expect(tournamentPage.nextButton).toBeVisible();

    // New Match button should be visible
    await expect(tournamentPage.newMatchButton).toBeVisible();

    // Add a match and go to Step 3
    await tournamentPage.fillMatchMetrics({
      matchTypeId: "1",
      playerScore: 0,
      opponentScore: 3,
      averageScore: 75.0,
      firstNineAvg: 78.0,
      checkoutPercentage: 38.0,
    });
    await tournamentPage.clickNext();

    // Step 3 - Submit button should be visible
    await expect(tournamentPage.submitButton).toBeVisible();
    await expect(tournamentPage.submitButton).toBeEnabled();

    // Add Match button should be visible
    await expect(tournamentPage.addMatchFromReviewButton).toBeVisible();
  });
  test("Form inputs accept keyboard navigation", async ({ page }) => {
    // Test Tab navigation through form fields
    await tournamentPage.tournamentNameInput.focus();
    // Tab to next field
    await page.keyboard.press("Tab");
    // 3. Assert focus using the built-in locator assertion
    // Based on your snapshot, the next element is: button "Tournament Date"
    await expect(page.getByRole("button", { name: "Tournament Date" })).toBeFocused();
    // 4. Tab again to the next field (Tournament Type)
    await page.keyboard.press("Tab");
    await expect(page.getByRole("combobox", { name: "Tournament Type" })).toBeFocused();
  });
  test("Numeric inputs only accept numbers", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await tournamentPage.fillBasicInfo({
      name: "Numeric Test",
      date: yesterday.toISOString().split("T")[0],
      tournamentTypeId: "1",
    });
    await tournamentPage.clickNext();

    // Try to enter text in numeric field
    await tournamentPage.averageScoreInput.pressSequentially("abc");

    // Value should be empty or 0 (numeric input rejects text)
    const value = await tournamentPage.averageScoreInput.inputValue();
    expect(value).toBe("");
  });
});
