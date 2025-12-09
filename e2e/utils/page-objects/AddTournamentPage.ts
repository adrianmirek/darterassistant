import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object Model for Add Tournament Form
 * Follows the 3-step wizard pattern: Basic Info -> Metrics -> Review
 */
export class AddTournamentPage extends BasePage {
  // Step Navigation
  readonly stepperNavigation: Locator;

  // Step 1: Basic Info
  readonly tournamentNameInput: Locator;
  readonly tournamentDateInput: Locator;
  readonly tournamentTypeSelect: Locator;

  // Step 2: Metrics (Current Match)
  readonly matchTypeSelect: Locator;
  readonly opponentNameInput: Locator;
  readonly averageScoreInput: Locator;
  readonly firstNineAvgInput: Locator;
  readonly checkoutPercentageInput: Locator;
  readonly score60CountInput: Locator;
  readonly score100CountInput: Locator;
  readonly score140CountInput: Locator;
  readonly score180CountInput: Locator;
  readonly highFinishInput: Locator;
  readonly bestLegInput: Locator;
  readonly worstLegInput: Locator;

  // Step 2: Action Buttons
  readonly newMatchButton: Locator;

  // Step 3: Review
  readonly reviewTournamentName: Locator;
  readonly reviewTournamentDate: Locator;
  readonly reviewTournamentType: Locator;
  readonly reviewMatchesCount: Locator;
  readonly reviewMatchesTable: Locator;
  readonly reviewMatchesCards: Locator;
  readonly overallStatsCard: Locator;
  readonly addMatchFromReviewButton: Locator;

  // Form Controls
  readonly backButton: Locator;
  readonly nextButton: Locator;
  readonly submitButton: Locator;

  // Toast/Notifications
  readonly toastContainer: Locator;

  constructor(page: Page) {
    super(page);

    // Step Navigation
    this.stepperNavigation = page.getByTestId("stepper-navigation");

    // Step 1: Basic Info (using data-testid convention)
    this.tournamentNameInput = page.getByTestId("tournament-name-input");
    this.tournamentDateInput = page.getByTestId("tournament-date-input");
    this.tournamentTypeSelect = page.getByTestId("tournament-type-select");

    // Step 2: Metrics
    this.matchTypeSelect = page.getByTestId("match-type-select");
    this.opponentNameInput = page.getByTestId("opponent-name-input");
    this.averageScoreInput = page.getByTestId("average-score-input");
    this.firstNineAvgInput = page.getByTestId("first-nine-avg-input");
    this.checkoutPercentageInput = page.getByTestId("checkout-percentage-input");
    this.score60CountInput = page.getByTestId("score-60-count-input");
    this.score100CountInput = page.getByTestId("score-100-count-input");
    this.score140CountInput = page.getByTestId("score-140-count-input");
    this.score180CountInput = page.getByTestId("score-180-count-input");
    this.highFinishInput = page.getByTestId("high-finish-input");
    this.bestLegInput = page.getByTestId("best-leg-input");
    this.worstLegInput = page.getByTestId("worst-leg-input");

    // Step 2: Action Buttons
    this.newMatchButton = page.getByTestId("new-match-button");

    // Step 3: Review
    this.reviewTournamentName = page.getByTestId("review-tournament-name");
    this.reviewTournamentDate = page.getByTestId("review-tournament-date");
    this.reviewTournamentType = page.getByTestId("review-tournament-type");
    this.reviewMatchesCount = page.getByTestId("review-matches-count");
    this.reviewMatchesTable = page.getByTestId("review-matches-table");
    this.reviewMatchesCards = page.getByTestId("review-matches-cards");
    this.overallStatsCard = page.getByTestId("overall-stats-card");
    this.addMatchFromReviewButton = page.getByTestId("add-match-button");

    // Form Controls
    this.backButton = page.getByTestId("back-button");
    this.nextButton = page.getByTestId("next-button");
    this.submitButton = page.getByTestId("submit-button");

    // Toast
    this.toastContainer = page.locator("[data-sonner-toaster]");
  }

  /**
   * Navigate to Add Tournament page
   */
  async goto() {
    await super.goto("/tournaments/new");
    await this.waitForPageLoad();
  }

  /**
   * Fill Step 1: Basic Info
   */
  async fillBasicInfo(data: { name: string; date: string; tournamentTypeId: string }) {
    await this.tournamentNameInput.fill(data.name);
    await this.selectDate(data.date);
    await this.selectTournamentType(data.tournamentTypeId);
  }

  /**
   * Select date from the date picker (Popover + Calendar)
   */
  async selectDate(dateString: string) {
    // Click the date picker button to open the popover
    await this.tournamentDateInput.click();

    // Wait for calendar popover to appear
    await this.page.waitForSelector('[role="dialog"]', { state: "visible", timeout: 5000 });

    // Parse the date string (format: YYYY-MM-DD or YYYY-M-D)
    const date = new Date(dateString);
    const day = date.getDate();

    // Click on the date button in the calendar
    // Shadcn calendar uses button elements with the date number
    // Try to find the button with matching date text in the calendar grid
    const dateButton = this.page
      .locator(`[role="dialog"] [role="gridcell"]:not([data-disabled]) button`)
      .filter({ hasText: new RegExp(`^${day}$`) });
    await dateButton.first().click();

    // Close the popover by pressing Escape (Shadcn popover doesn't auto-close on calendar date selection)
    await this.page.keyboard.press("Escape");

    // Wait a moment for the popover to close
    await this.page.waitForTimeout(300);
  }

  /**
   * Select tournament type from dropdown
   */
  async selectTournamentType(value: string) {
    // Wait for the select to be enabled (data loaded)
    // The select is disabled while tournament types are loading
    await this.tournamentTypeSelect.waitFor({ state: "visible" });

    // Wait until enabled (Playwright will wait for it)
    await expect(this.tournamentTypeSelect).toBeEnabled({ timeout: 10000 });

    // For shadcn Select component, we need to click the trigger then select the option
    await this.tournamentTypeSelect.click();

    // Wait for the dropdown content to appear (Shadcn Select uses Radix UI which portals content)
    await this.page.waitForSelector('[role="listbox"]', { state: "visible", timeout: 5000 });

    // Map IDs to tournament type names
    const typeNames: Record<string, string> = {
      "1": "Leagues + SKO",
      "2": "SKO",
    };

    // Click the option by text content
    const typeName = typeNames[value] || value;
    await this.page.locator(`[role="option"]:has-text("${typeName}")`).click();
  }

  /**
   * Select match type from dropdown
   */
  async selectMatchType(value: string) {
    // Wait for the select to be enabled (match types loaded)
    await this.matchTypeSelect.waitFor({ state: "visible" });
    await expect(this.matchTypeSelect).toBeEnabled({ timeout: 10000 });

    await this.matchTypeSelect.click();

    // Wait for the dropdown content to appear (Shadcn Select uses Radix UI which portals content)
    await this.page.waitForSelector('[role="listbox"]', { state: "visible", timeout: 5000 });

    // Map IDs to match type names
    const matchNames: Record<string, string> = {
      "1": "singles",
      "2": "doubles",
    };

    // Click the option by text content
    const matchName = matchNames[value] || value;
    await this.page.locator(`[role="option"]:has-text("${matchName}")`).click();
  }

  /**
   * Fill Step 2: Match Metrics
   */
  async fillMatchMetrics(data: {
    matchTypeId: string;
    opponentName?: string;
    averageScore: number;
    firstNineAvg: number;
    checkoutPercentage: number;
    score60Count?: number;
    score100Count?: number;
    score140Count?: number;
    score180Count?: number;
    highFinish?: number;
    bestLeg?: number;
    worstLeg?: number;
  }) {
    await this.selectMatchType(data.matchTypeId);

    if (data.opponentName) {
      await this.opponentNameInput.fill(data.opponentName);
    }

    // Fill inputs and trigger blur to ensure React Hook Form detects changes
    await this.averageScoreInput.fill(data.averageScore.toString());
    await this.averageScoreInput.blur();

    await this.firstNineAvgInput.fill(data.firstNineAvg.toString());
    await this.firstNineAvgInput.blur();

    await this.checkoutPercentageInput.fill(data.checkoutPercentage.toString());
    await this.checkoutPercentageInput.blur();

    if (data.score60Count !== undefined) {
      await this.score60CountInput.fill(data.score60Count.toString());
    }
    if (data.score100Count !== undefined) {
      await this.score100CountInput.fill(data.score100Count.toString());
    }
    if (data.score140Count !== undefined) {
      await this.score140CountInput.fill(data.score140Count.toString());
    }
    if (data.score180Count !== undefined) {
      await this.score180CountInput.fill(data.score180Count.toString());
    }
    if (data.highFinish !== undefined) {
      await this.highFinishInput.fill(data.highFinish.toString());
    }
    if (data.bestLeg !== undefined) {
      await this.bestLegInput.fill(data.bestLeg.toString());
    }
    if (data.worstLeg !== undefined) {
      await this.worstLegInput.fill(data.worstLeg.toString());
    }

    // Wait for React Hook Form to process the changes and update form state
    await this.page.waitForTimeout(500);
  }

  /**
   * Click "New Match" button to save current match
   */
  async clickNewMatch() {
    await this.newMatchButton.click();
  }

  /**
   * Click "Next" button to proceed to next step
   */
  async clickNext() {
    await this.nextButton.click();
    // Wait for step transition to complete
    await this.page.waitForTimeout(500);
  }

  /**
   * Click "Back" button to return to previous step
   */
  async clickBack() {
    await this.backButton.click();
  }

  /**
   * Click "Submit" button on Step 3
   */
  async clickSubmit() {
    await this.submitButton.click();
  }

  /**
   * Click "Add Match" button on Step 3 Review
   */
  async clickAddMatchFromReview() {
    await this.addMatchFromReviewButton.click();
  }

  /**
   * Wait for toast message to appear
   */
  async waitForToast(text?: string | RegExp) {
    await this.toastContainer.waitFor({ state: "visible" });
    if (text) {
      await this.page.waitForFunction(
        (args) => {
          const toaster = document.querySelector("[data-sonner-toaster]");
          if (!toaster) return false;
          const content = toaster.textContent || "";
          return typeof args.text === "string" ? content.includes(args.text) : args.text.test(content);
        },
        { text }
      );
    }
  }

  /**
   * Get toast message text
   */
  async getToastText(): Promise<string> {
    return (await this.toastContainer.textContent()) || "";
  }

  /**
   * Get current step number (0-based)
   */
  async getCurrentStep(): Promise<number> {
    const activeStep = this.page.locator('[data-current="true"]');
    const stepText = await activeStep.textContent();
    const steps = ["Basic Info", "Metrics", "Review"];
    return steps.indexOf(stepText?.trim() || "");
  }

  /**
   * Get validation error for a specific field
   */
  getFieldError(fieldName: string): Locator {
    return this.page.locator(`[name="${fieldName}"]`).locator("..").locator('[data-slot="form-message"]');
  }

  /**
   * Get any validation error message
   */
  getAnyFieldError(): Locator {
    return this.page.locator('[data-slot="form-message"]').first();
  }

  /**
   * Get number of matches shown in Step 3 review
   */
  async getMatchesCount(): Promise<number> {
    const text = await this.reviewMatchesCount.textContent();
    const match = text?.match(/(\d+)\s+match/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get match data from review table (desktop view)
   * Table columns: # | Match Type | Opponent | Result | Avg | 1st 9 | CO% | 180s
   */
  async getMatchDataFromTable(matchIndex: number) {
    const row = this.reviewMatchesTable.locator("tbody tr").nth(matchIndex);
    return {
      matchType: await row.locator("td").nth(1).textContent(), // Column 1 (after #)
      opponent: await row.locator("td").nth(2).textContent(), // Column 2
      avgScore: await row.locator("td").nth(4).textContent(), // Column 4 (after Result)
      firstNineAvg: await row.locator("td").nth(5).textContent(), // Column 5
      checkoutPct: await row.locator("td").nth(6).textContent(), // Column 6
    };
  }

  /**
   * Get remove button for a specific match by index
   */
  getRemoveMatchButton(matchIndex: number): Locator {
    return this.page.getByTestId(`remove-match-${matchIndex}`);
  }

  /**
   * Remove a match by clicking its remove button
   */
  async removeMatch(matchIndex: number) {
    await this.getRemoveMatchButton(matchIndex).click();
  }

  /**
   * Check if overall statistics card is visible (only shown for 2+ matches)
   */
  async isOverallStatsVisible(): Promise<boolean> {
    return await this.overallStatsCard.isVisible();
  }

  /**
   * Complete full flow: Create tournament with single match
   */
  async createTournamentWithSingleMatch(data: {
    tournamentName: string;
    date: string;
    tournamentTypeId: string;
    matchTypeId: string;
    opponentName?: string;
    averageScore: number;
    firstNineAvg: number;
    checkoutPercentage: number;
    score180Count?: number;
    highFinish?: number;
    bestLeg?: number;
    worstLeg?: number;
  }) {
    // Step 1: Basic Info
    await this.fillBasicInfo({
      name: data.tournamentName,
      date: data.date,
      tournamentTypeId: data.tournamentTypeId,
    });
    await this.clickNext();

    // Step 2: Metrics
    await this.fillMatchMetrics({
      matchTypeId: data.matchTypeId,
      opponentName: data.opponentName,
      averageScore: data.averageScore,
      firstNineAvg: data.firstNineAvg,
      checkoutPercentage: data.checkoutPercentage,
      score180Count: data.score180Count,
      highFinish: data.highFinish,
      bestLeg: data.bestLeg,
      worstLeg: data.worstLeg,
    });
    await this.clickNext();

    // Step 3: Review & Submit
    await this.clickSubmit();
  }
}
