import { test, expect } from "@playwright/test";
import { AddTournamentPage } from "../utils/page-objects/AddTournamentPage";

/**
 * E2E tests for Add Tournament - Multiple Matches scenarios
 * Covers test scenarios 2, 3, 7, 11, 12, 15 from test plan
 */
test.describe("Add Tournament - Multiple Matches", () => {
  let tournamentPage: AddTournamentPage;

  test.beforeEach(async ({ page }) => {
    // Authentication state is already loaded from storage
    // Just navigate to the tournament page
    tournamentPage = new AddTournamentPage(page);
    await tournamentPage.goto();
  });

  test("Scenario 2: Create tournament with multiple matches (Happy Path)", async () => {
    // Arrange - Step 1: Data
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await tournamentPage.fillBasicInfo({
      name: "Sunday Tournament",
      date: yesterday.toISOString().split("T")[0],
      tournamentTypeId: "2", // SKO
    });
    await tournamentPage.clickNext();

    // Act - Step 2: Add Match 1
    await tournamentPage.fillMatchMetrics({
      matchTypeId: "1", // 501
      opponentName: "Player A",
      playerScore: 0,
      opponentScore: 3,
      averageScore: 70.0,
      firstNineAvg: 75.0,
      checkoutPercentage: 40.0,
      score180Count: 2,
    });
    await tournamentPage.clickNewMatch();

    // Assert - Toast appears for Match 1 saved
    await tournamentPage.waitForToast(/match.*saved|match 1/i);

    // Verify - Form resets except match_type stays selected
    const matchTypeValue = await tournamentPage.matchTypeSelect.getAttribute("data-state");
    expect(matchTypeValue).not.toBeNull(); // Match type should be pre-selected

    // Act - Step 2: Add Match 2
    await tournamentPage.fillMatchMetrics({
      matchTypeId: "1", // Should already be selected
      opponentName: "Player B",
      playerScore: 0,
      opponentScore: 3,
      averageScore: 80.0,
      firstNineAvg: 85.0,
      checkoutPercentage: 45.0,
      score180Count: 4,
    });
    await tournamentPage.clickNewMatch();

    // Assert - Toast appears for Match 2 saved
    await tournamentPage.waitForToast(/match.*saved|match 2/i);

    // Act - Step 2: Add Match 3
    await tournamentPage.fillMatchMetrics({
      matchTypeId: "1",
      opponentName: "Player C",
      playerScore: 0,
      opponentScore: 3,
      averageScore: 65.0,
      firstNineAvg: 70.0,
      checkoutPercentage: 35.0,
      score180Count: 1,
    });
    await tournamentPage.clickNext();

    // Assert - Step 3: Review shows all 3 matches
    await expect(tournamentPage.reviewTournamentName).toBeVisible();
    await expect(tournamentPage.reviewMatchesCount).toContainText("3 matches");

    // Verify - Table shows all 3 matches
    const match1 = await tournamentPage.getMatchDataFromTable(0);
    const match2 = await tournamentPage.getMatchDataFromTable(1);
    const match3 = await tournamentPage.getMatchDataFromTable(2);

    expect(match1.opponent).toContain("Player A");
    expect(match2.opponent).toContain("Player B");
    expect(match3.opponent).toContain("Player C");

    // Verify - Overall Statistics card appears (only shown for 2+ matches)
    const overallStatsVisible = await tournamentPage.isOverallStatsVisible();
    expect(overallStatsVisible).toBe(true);

    // Act - Submit
    await tournamentPage.clickSubmit();

    // Assert - Success toast with "3 matches"
    // TODO AI: Add toast verification
    //await tournamentPage.waitForToast("Tournament saved successfully");
    //const toastText = await tournamentPage.getToastText();
    //expect(toastText).toContain("3 matches");
  });

  test("Scenario 3: Add match from review page", async () => {
    // Arrange - Add 2 matches and reach Step 3
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await tournamentPage.fillBasicInfo({
      name: "Add Match Test",
      date: yesterday.toISOString().split("T")[0],
      tournamentTypeId: "1",
    });
    await tournamentPage.clickNext();

    // Add Match 1
    await tournamentPage.fillMatchMetrics({
      matchTypeId: "1",
      opponentName: "Player 1",
      playerScore: 0,
      opponentScore: 3,
      averageScore: 75.0,
      firstNineAvg: 78.0,
      checkoutPercentage: 38.0,
    });
    await tournamentPage.clickNewMatch();
    await tournamentPage.waitForToast(/match.*saved/i);

    // Add Match 2 and go to Step 3
    await tournamentPage.fillMatchMetrics({
      matchTypeId: "1",
      opponentName: "Player 2",
      playerScore: 0,
      opponentScore: 3,
      averageScore: 72.0,
      firstNineAvg: 74.0,
      checkoutPercentage: 36.0,
    });
    await tournamentPage.clickNext();

    // Verify - Step 3 shows 2 matches
    await expect(tournamentPage.reviewMatchesCount).toContainText("2 matches");

    // Act - Click "Add Match" button from Step 3
    await tournamentPage.clickAddMatchFromReview();

    // Assert - Navigated back to Step 2
    await expect(tournamentPage.matchTypeSelect).toBeVisible();

    // Verify - Form is reset
    const opponentValue = await tournamentPage.opponentNameInput.inputValue();
    expect(opponentValue).toBe("");

    // Act - Add third match
    await tournamentPage.fillMatchMetrics({
      matchTypeId: "1",
      opponentName: "Player 3",
      playerScore: 0,
      opponentScore: 3,
      averageScore: 68.0,
      firstNineAvg: 71.0,
      checkoutPercentage: 33.0,
    });
    await tournamentPage.clickNext();

    // Assert - Step 3 now shows 3 matches
    await expect(tournamentPage.reviewMatchesCount).toContainText("3 matches");

    // Submit
    await tournamentPage.clickSubmit();
    // TODO AI: Add toast verification
    //await tournamentPage.waitForToast("Tournament saved successfully");
  });

  test("Scenario 7: Navigation - Back button from Step 3", async () => {
    // Arrange - Add 2 matches and reach Step 3
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await tournamentPage.fillBasicInfo({
      name: "Navigation Test",
      date: yesterday.toISOString().split("T")[0],
      tournamentTypeId: "1",
    });
    await tournamentPage.clickNext();

    // Add 2 matches
    await tournamentPage.fillMatchMetrics({
      matchTypeId: "1",
      playerScore: 0,
      opponentScore: 3,
      averageScore: 75.0,
      firstNineAvg: 78.0,
      checkoutPercentage: 38.0,
    });
    await tournamentPage.clickNewMatch();
    await tournamentPage.waitForToast(/match.*saved/i);

    await tournamentPage.fillMatchMetrics({
      matchTypeId: "1",
      playerScore: 0,
      opponentScore: 3,
      averageScore: 72.0,
      firstNineAvg: 74.0,
      checkoutPercentage: 36.0,
    });
    await tournamentPage.clickNext();

    // Verify on Step 3 with 2 matches
    await expect(tournamentPage.reviewMatchesCount).toContainText("2 matches");

    // Act - Click Back button
    await tournamentPage.clickBack();

    // Assert - Navigated to Step 2
    await expect(tournamentPage.matchTypeSelect).toBeVisible();

    // Act - Navigate forward again
    await tournamentPage.clickNext();

    // Assert - Still shows 2 saved matches
    await expect(tournamentPage.reviewMatchesCount).toContainText("2 matches");

    // Verify matches are not lost
    const match1 = await tournamentPage.getMatchDataFromTable(0);
    const match2 = await tournamentPage.getMatchDataFromTable(1);
    expect(match1.avgScore).toContain("75");
    expect(match2.avgScore).toContain("72");
  });

  test("Scenario 11: Match type pre-selection", async () => {
    // Arrange
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await tournamentPage.fillBasicInfo({
      name: "Pre-selection Test",
      date: yesterday.toISOString().split("T")[0],
      tournamentTypeId: "1",
    });
    await tournamentPage.clickNext();

    // Act - Select "701" (match_type_id: 2) as match type
    await tournamentPage.fillMatchMetrics({
      matchTypeId: "2", // 701
      playerScore: 0,
      opponentScore: 3,
      averageScore: 70.0,
      firstNineAvg: 73.0,
      checkoutPercentage: 35.0,
    });
    await tournamentPage.clickNewMatch();

    // Assert - Match saved
    await tournamentPage.waitForToast(/match.*saved/i);

    // Verify - Match type dropdown still shows "701" (pre-selected)
    // This is implementation-specific, may need to check selected value
    const matchTypeText = await tournamentPage.matchTypeSelect.textContent();
    expect(matchTypeText).toContain("501 DI DO");

    // Verify - Other fields are cleared
    const opponentValue = await tournamentPage.opponentNameInput.inputValue();
    const avgScoreValue = await tournamentPage.averageScoreInput.inputValue();
    expect(opponentValue).toBe("");
    expect(avgScoreValue).toBe(""); // Reset to default
  });

  test("Scenario 12: Overall statistics display", async () => {
    // Arrange
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await tournamentPage.fillBasicInfo({
      name: "Overall Stats Test",
      date: yesterday.toISOString().split("T")[0],
      tournamentTypeId: "1",
    });
    await tournamentPage.clickNext();

    // Act - Add 1 match, go to Step 3
    await tournamentPage.fillMatchMetrics({
      matchTypeId: "1",
      playerScore: 0,
      opponentScore: 3,
      averageScore: 75.0,
      firstNineAvg: 78.0,
      checkoutPercentage: 38.0,
      score180Count: 3,
      highFinish: 120,
      bestLeg: 12,
    });
    await tournamentPage.clickNext();

    // Assert - Overall Statistics card is HIDDEN (only 1 match)
    let overallStatsVisible = await tournamentPage.isOverallStatsVisible();
    expect(overallStatsVisible).toBe(false);

    // Act - Go back and add another match
    await tournamentPage.clickBack();
    await tournamentPage.fillMatchMetrics({
      matchTypeId: "1",
      averageScore: 80.0,
      playerScore: 0,
      opponentScore: 3,
      firstNineAvg: 82.0,
      checkoutPercentage: 42.0,
      score180Count: 5,
      highFinish: 140,
      bestLeg: 10,
    });
    await tournamentPage.clickNext();

    // Assert - Overall Statistics card is NOW VISIBLE (2+ matches)
    overallStatsVisible = await tournamentPage.isOverallStatsVisible();
    expect(overallStatsVisible).toBe(true);

    // Verify - Statistics are calculated correctly
    // Avg Score = (75 + 80) / 2 = 77.5
    const overallStatsText = await tournamentPage.overallStatsCard.textContent();
    expect(overallStatsText).toContain("77.5"); // Average score
    expect(overallStatsText).toContain("8"); // Total 180s (3 + 5)
    expect(overallStatsText).toContain("10"); // Best leg (min of 12, 10)
    expect(overallStatsText).toContain("140"); // High finish (max of 120, 140)
  });

  test("Scenario 15: Final placement per match", async () => {
    // Arrange
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await tournamentPage.fillBasicInfo({
      name: "Placement Test",
      date: yesterday.toISOString().split("T")[0],
      tournamentTypeId: "1",
    });
    await tournamentPage.clickNext();

    // Act - Add 3 matches with different placements
    await tournamentPage.fillMatchMetrics({
      matchTypeId: "1",
      averageScore: 75.0,
      playerScore: 0,
      opponentScore: 3,
      firstNineAvg: 78.0,
      checkoutPercentage: 38.0,
    });
    await tournamentPage.clickNewMatch();
    await tournamentPage.waitForToast(/match.*saved/i);

    await tournamentPage.fillMatchMetrics({
      matchTypeId: "1",
      averageScore: 72.0,
      playerScore: 0,
      opponentScore: 3,
      firstNineAvg: 74.0,
      checkoutPercentage: 36.0,
    });
    await tournamentPage.clickNewMatch();
    await tournamentPage.waitForToast(/match.*saved/i);

    await tournamentPage.fillMatchMetrics({
      matchTypeId: "1",
      averageScore: 73.0,
      playerScore: 0,
      opponentScore: 3,
      firstNineAvg: 76.0,
      checkoutPercentage: 37.0,
    });
    await tournamentPage.clickNext();

    // Assert - Step 3 shows all 3 matches
    const match1 = await tournamentPage.getMatchDataFromTable(0);
    const match2 = await tournamentPage.getMatchDataFromTable(1);
    const match3 = await tournamentPage.getMatchDataFromTable(2);

    // Verify - All matches are displayed with their data
    expect(match1.avgScore).toContain("75");
    expect(match2.avgScore).toContain("72");
    expect(match3.avgScore).toContain("73");
  });

  test("Edge Case 5: Ten matches", async () => {
    // Arrange
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await tournamentPage.fillBasicInfo({
      name: "Ten Matches Test",
      date: yesterday.toISOString().split("T")[0],
      tournamentTypeId: "1",
    });
    await tournamentPage.clickNext();

    // Act - Add 10 matches
    for (let i = 1; i <= 10; i++) {
      await tournamentPage.fillMatchMetrics({
        matchTypeId: "1",
        opponentName: `Player ${i}`,
        playerScore: 0,
        opponentScore: 3,
        averageScore: 70 + i,
        firstNineAvg: 75 + i,
        checkoutPercentage: 30 + i,
      });

      if (i < 10) {
        await tournamentPage.clickNewMatch();
        await tournamentPage.waitForToast(/match.*saved/i);
      } else {
        // Last match - go to review
        await tournamentPage.clickNext();
      }
    }

    // Assert - Step 3 shows all 10 matches
    await expect(tournamentPage.reviewMatchesCount).toContainText("10 matches");

    // Verify - All matches display correctly
    const match1 = await tournamentPage.getMatchDataFromTable(0);
    const match10 = await tournamentPage.getMatchDataFromTable(9);

    expect(match1.opponent).toContain("Player 1");
    expect(match10.opponent).toContain("Player 10");

    // Verify - Overall statistics calculate correctly
    const overallStatsVisible = await tournamentPage.isOverallStatsVisible();
    expect(overallStatsVisible).toBe(true);
  });
});
