import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@/test/utils/test-utils";
import { FormProvider, useForm } from "react-hook-form";
import userEvent from "@testing-library/user-event";
import Step3_Review from "@/components/forms/Step3_Review";
import type { MatchTypeDTO, TournamentTypeDTO } from "@/types";
import type { AddTournamentFormViewModel, MatchDataViewModel } from "@/components/forms/AddTournamentForm";

// Mock wrapper component to provide form context
function TestWrapper({ children, defaultValues }: { children: React.ReactNode; defaultValues?: Partial<AddTournamentFormViewModel> }) {
  const form = useForm<AddTournamentFormViewModel>({
    defaultValues: {
      name: "Test Tournament",
      date: new Date("2024-01-15"),
      tournament_type_id: "1",
      final_place: 3,
      current_match: {
        match_type_id: "",
        opponent_name: "",
        player_score: 0,
        opponent_score: 0,
        average_score: 0,
        first_nine_avg: 0,
        checkout_percentage: 0,
        score_60_count: 0,
        score_100_count: 0,
        score_140_count: 0,
        score_180_count: 0,
        high_finish: 0,
        best_leg: 21,
        worst_leg: 33,
      },
      matches: [],
      ...defaultValues,
    },
  });

  return <FormProvider {...form}>{children}</FormProvider>;
}

describe("Step3_Review", () => {
  const mockMatchTypes: MatchTypeDTO[] = [
    { id: 1, name: "Singles 501" },
    { id: 2, name: "Doubles 501" },
    { id: 3, name: "Singles Cricket" },
  ];

  const mockTournamentTypes: TournamentTypeDTO[] = [
    { id: 1, name: "League Match" },
    { id: 2, name: "Championship" },
    { id: 3, name: "Friendly" },
  ];

  const mockMatches: MatchDataViewModel[] = [
    {
      match_type_id: "1",
      opponent_name: "John Doe",
      player_score: 3,
      opponent_score: 2,
      average_score: 75.5,
      first_nine_avg: 80.0,
      checkout_percentage: 35.5,
      score_60_count: 5,
      score_100_count: 3,
      score_140_count: 2,
      score_180_count: 1,
      high_finish: 120,
      best_leg: 15,
      worst_leg: 30,
    },
    {
      match_type_id: "2",
      opponent_name: "Jane Smith",
      player_score: 2,
      opponent_score: 3,
      average_score: 68.2,
      first_nine_avg: 72.5,
      checkout_percentage: 28.0,
      score_60_count: 4,
      score_100_count: 2,
      score_140_count: 1,
      score_180_count: 0,
      high_finish: 90,
      best_leg: 18,
      worst_leg: 35,
    },
  ];

  const mockOnRemoveMatch = vi.fn();

  const defaultProps = {
    matchTypes: mockMatchTypes,
    tournamentTypes: mockTournamentTypes,
    matches: [] as MatchDataViewModel[],
    onRemoveMatch: mockOnRemoveMatch,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Component Rendering", () => {
    it("should render tournament information section", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText("Tournament Information")).toBeInTheDocument();
    });

    it("should render matches section", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText("Matches")).toBeInTheDocument();
    });

    it("should render info banner", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText(/Review your tournament and all matches above/i)).toBeInTheDocument();
    });
  });

  describe("Tournament Information Display", () => {
    it("should display tournament name", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId("review-tournament-name")).toHaveTextContent("Test Tournament");
    });

    it("should display formatted tournament date", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} />
        </TestWrapper>
      );

      const dateElement = screen.getByTestId("review-tournament-date");
      expect(dateElement).toBeInTheDocument();
      // Date is formatted using date-fns format(date, 'PPP') which includes ordinal suffix
      expect(dateElement.textContent).toMatch(/January 15th, 2024/i);
    });

    it("should display tournament type name", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId("review-tournament-type")).toHaveTextContent("League Match");
    });

    it("should display final place when provided", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId("review-final-place")).toHaveTextContent("3");
    });

    it("should not display final place section when not provided", () => {
      render(
        <TestWrapper defaultValues={{ final_place: undefined }}>
          <Step3_Review {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.queryByTestId("review-final-place")).not.toBeInTheDocument();
    });

    it("should display dash when tournament type not found", () => {
      render(
        <TestWrapper defaultValues={{ tournament_type_id: "999" }}>
          <Step3_Review {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId("review-tournament-type")).toHaveTextContent("-");
    });

    it("should display dash when date is not provided", () => {
      render(
        <TestWrapper defaultValues={{ date: undefined as unknown as Date }}>
          <Step3_Review {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId("review-tournament-date")).toHaveTextContent("-");
    });
  });

  describe("Matches Display - No Matches", () => {
    it("should display no matches message when matches array is empty", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={[]} />
        </TestWrapper>
      );

      expect(screen.getByText("No matches added yet.")).toBeInTheDocument();
    });

    it("should display 0 matches count", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={[]} />
        </TestWrapper>
      );

      expect(screen.getByTestId("review-matches-count")).toHaveTextContent("0 matches");
    });

    it("should not render table when no matches", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={[]} />
        </TestWrapper>
      );

      expect(screen.queryByTestId("review-matches-table")).not.toBeInTheDocument();
    });

    it("should not render overall stats when no matches", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={[]} />
        </TestWrapper>
      );

      expect(screen.queryByTestId("overall-stats-card")).not.toBeInTheDocument();
    });
  });

  describe("Matches Display - With Matches", () => {
    it("should display correct match count for single match", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={[mockMatches[0]]} />
        </TestWrapper>
      );

      expect(screen.getByTestId("review-matches-count")).toHaveTextContent("1 match");
    });

    it("should display correct match count for multiple matches", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      expect(screen.getByTestId("review-matches-count")).toHaveTextContent("2 matches");
    });

    it("should render desktop table view", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      expect(screen.getByTestId("review-matches-table")).toBeInTheDocument();
    });

    it("should render mobile card view", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      expect(screen.getByTestId("review-matches-cards")).toBeInTheDocument();
    });
  });

  describe("Desktop Table View", () => {
    it("should render all table headers", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const table = screen.getByTestId("review-matches-table");
      expect(table).toHaveTextContent("#");
      expect(table).toHaveTextContent("Match Type");
      expect(table).toHaveTextContent("Opponent");
      expect(table).toHaveTextContent("Result");
      expect(table).toHaveTextContent("Avg");
      expect(table).toHaveTextContent("CO%");
      expect(table).toHaveTextContent("60+");
      expect(table).toHaveTextContent("100+");
      expect(table).toHaveTextContent("140+");
      expect(table).toHaveTextContent("180s");
      expect(table).toHaveTextContent("High Finish");
      expect(table).toHaveTextContent("Best Leg");
      expect(table).toHaveTextContent("Actions");
    });

    it("should display match type name correctly", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      // Match types appear in both desktop table and mobile card view
      expect(screen.getAllByText("Singles 501").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Doubles 501").length).toBeGreaterThan(0);
    });

    it("should display opponent names", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      // Opponent names appear in both desktop table and mobile card view
      expect(screen.getAllByText("John Doe").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Jane Smith").length).toBeGreaterThan(0);
    });

    it("should display match results in correct format", () => {
      const { container } = render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const table = screen.getByTestId("review-matches-table");
      expect(table).toHaveTextContent("3 : 2");
      expect(table).toHaveTextContent("2 : 3");
    });

    it("should display average scores with 2 decimal places", () => {
      const { container } = render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const table = screen.getByTestId("review-matches-table");
      expect(table).toHaveTextContent("75.50");
      expect(table).toHaveTextContent("68.20");
    });

    it("should display checkout percentage with 1 decimal place", () => {
      const { container } = render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const table = screen.getByTestId("review-matches-table");
      expect(table).toHaveTextContent("35.5%");
      expect(table).toHaveTextContent("28.0%");
    });

    it("should display score counts correctly", () => {
      const { container } = render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const table = screen.getByTestId("review-matches-table");
      // First match counts
      expect(table).toHaveTextContent("5"); // 60+
      expect(table).toHaveTextContent("3"); // 100+
      expect(table).toHaveTextContent("2"); // 140+
      expect(table).toHaveTextContent("1"); // 180s
    });

    it("should display high finish values", () => {
      const { container } = render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const table = screen.getByTestId("review-matches-table");
      expect(table).toHaveTextContent("120");
      expect(table).toHaveTextContent("90");
    });

    it("should display best leg values", () => {
      const { container } = render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const table = screen.getByTestId("review-matches-table");
      expect(table).toHaveTextContent("15");
      expect(table).toHaveTextContent("18");
    });

    it("should display dash for missing opponent name", () => {
      const matchWithoutOpponent = { ...mockMatches[0], opponent_name: "" };
      const { container } = render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={[matchWithoutOpponent]} />
        </TestWrapper>
      );

      const table = screen.getByTestId("review-matches-table");
      const cells = table.querySelectorAll("td");
      // Find cell with opponent name (should have dash)
      const opponentCell = Array.from(cells).find((cell) => cell.textContent === "-");
      expect(opponentCell).toBeInTheDocument();
    });

    it("should display dash for high finish of 0", () => {
      const matchWithNoHighFinish = { ...mockMatches[0], high_finish: 0 };
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={[matchWithNoHighFinish]} />
        </TestWrapper>
      );

      const table = screen.getByTestId("review-matches-table");
      const cells = table.querySelectorAll("td");
      // High finish column should show dash
      const highFinishDash = Array.from(cells).some((cell) => cell.textContent === "-");
      expect(highFinishDash).toBe(true);
    });

    it("should render remove button for each match", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      // Multiple buttons exist (desktop + mobile) for each match
      expect(screen.getAllByTestId("remove-match-0").length).toBeGreaterThan(0);
      expect(screen.getAllByTestId("remove-match-1").length).toBeGreaterThan(0);
    });

    it("should display correct match index numbers", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const table = screen.getByTestId("review-matches-table");
      const rows = table.querySelectorAll("tbody tr");
      expect(rows[0]).toHaveTextContent("1"); // First match index
      expect(rows[1]).toHaveTextContent("2"); // Second match index
    });
  });

  describe("Mobile Card View", () => {
    it("should render card for each match", () => {
      const { container } = render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const cards = container.querySelectorAll(".match-card");
      expect(cards).toHaveLength(2);
    });

    it("should display match number in card header", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      expect(screen.getByText("Match 1")).toBeInTheDocument();
      expect(screen.getByText("Match 2")).toBeInTheDocument();
    });

    it("should display match type in card", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const cardsContainer = screen.getByTestId("review-matches-cards");
      expect(cardsContainer).toHaveTextContent("Singles 501");
      expect(cardsContainer).toHaveTextContent("Doubles 501");
    });

    it("should display opponent name with vs prefix when available", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const cardsContainer = screen.getByTestId("review-matches-cards");
      expect(cardsContainer).toHaveTextContent("vs John Doe");
      expect(cardsContainer).toHaveTextContent("vs Jane Smith");
    });

    it("should display result in card", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const cardsContainer = screen.getByTestId("review-matches-cards");
      expect(cardsContainer).toHaveTextContent("Result:");
      expect(cardsContainer).toHaveTextContent("3 : 2");
      expect(cardsContainer).toHaveTextContent("2 : 3");
    });

    it("should display key metrics in card grid", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const cardsContainer = screen.getByTestId("review-matches-cards");
      expect(cardsContainer).toHaveTextContent("Avg");
      expect(cardsContainer).toHaveTextContent("1st 9");
      expect(cardsContainer).toHaveTextContent("CO%");
      expect(cardsContainer).toHaveTextContent("180s");
      expect(cardsContainer).toHaveTextContent("Best Leg");
      expect(cardsContainer).toHaveTextContent("High Finish");
    });

    it("should include remove button in each card", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const cardsContainer = screen.getByTestId("review-matches-cards");
      const removeButtons = cardsContainer.querySelectorAll('button[data-testid^="remove-match-"]');
      expect(removeButtons).toHaveLength(2);
    });
  });

  describe("Remove Match Functionality", () => {
    it("should call onRemoveMatch with correct index when remove button clicked", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      // Multiple buttons exist (desktop + mobile), click the first one
      const removeButtons = screen.getAllByTestId("remove-match-0");
      await user.click(removeButtons[0]);

      expect(mockOnRemoveMatch).toHaveBeenCalledTimes(1);
      expect(mockOnRemoveMatch).toHaveBeenCalledWith(0);
    });

    it("should call onRemoveMatch for second match with correct index", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      // Multiple buttons exist (desktop + mobile), click the first one
      const removeButtons = screen.getAllByTestId("remove-match-1");
      await user.click(removeButtons[0]);

      expect(mockOnRemoveMatch).toHaveBeenCalledTimes(1);
      expect(mockOnRemoveMatch).toHaveBeenCalledWith(1);
    });

    it("should have proper aria-label for remove button", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      // Multiple buttons exist (desktop + mobile) with same aria-label
      expect(screen.getAllByLabelText("Remove match 1").length).toBeGreaterThan(0);
      expect(screen.getAllByLabelText("Remove match 2").length).toBeGreaterThan(0);
    });

    it("should render remove button with destructive styling", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      // Multiple buttons exist (desktop + mobile), check the first one
      const removeButtons = screen.getAllByTestId("remove-match-0");
      expect(removeButtons[0]).toHaveClass("text-destructive");
    });

    it("should render trash icon in remove button", () => {
      const { container } = render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      // Multiple buttons exist (desktop + mobile), check the first one
      const removeButtons = screen.getAllByTestId("remove-match-0");
      const icon = removeButtons[0].querySelector("svg");
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Overall Statistics", () => {
    it("should render overall stats when multiple matches exist", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      expect(screen.getByTestId("overall-stats-card")).toBeInTheDocument();
      expect(screen.getByText("Overall Statistics")).toBeInTheDocument();
    });

    it("should not render overall stats for single match", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={[mockMatches[0]]} />
        </TestWrapper>
      );

      expect(screen.queryByTestId("overall-stats-card")).not.toBeInTheDocument();
    });

    it("should calculate and display average score correctly", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const statsCard = screen.getByTestId("overall-stats-card");
      // (75.5 + 68.2) / 2 = 71.85
      expect(statsCard).toHaveTextContent("71.85");
    });

    it("should calculate and display average checkout percentage correctly", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const statsCard = screen.getByTestId("overall-stats-card");
      // (35.5 + 28.0) / 2 = 31.75 => 31.8%
      expect(statsCard).toHaveTextContent("31.8%");
    });

    it("should calculate total 60+ scores", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const statsCard = screen.getByTestId("overall-stats-card");
      // 5 + 4 = 9
      expect(statsCard).toHaveTextContent("9");
    });

    it("should calculate total 100+ scores", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const statsCard = screen.getByTestId("overall-stats-card");
      // 3 + 2 = 5
      expect(statsCard).toHaveTextContent("5");
    });

    it("should calculate total 140+ scores", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const statsCard = screen.getByTestId("overall-stats-card");
      // 2 + 1 = 3
      expect(statsCard).toHaveTextContent("3");
    });

    it("should calculate total 180s", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const statsCard = screen.getByTestId("overall-stats-card");
      // 1 + 0 = 1
      expect(statsCard).toHaveTextContent("1");
    });

    it("should display best leg across all matches", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const statsCard = screen.getByTestId("overall-stats-card");
      // Min of 15 and 18 = 15
      expect(statsCard).toHaveTextContent("15 darts");
    });

    it("should display highest finish across all matches", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const statsCard = screen.getByTestId("overall-stats-card");
      // Max of 120 and 90 = 120
      expect(statsCard).toHaveTextContent("120");
    });

    it("should have proper grid layout for stats", () => {
      const { container } = render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const statsCard = screen.getByTestId("overall-stats-card");
      const grid = statsCard.querySelector(".grid.grid-cols-2.sm\\:grid-cols-4");
      expect(grid).toBeInTheDocument();
    });
  });

  describe("Helper Functions", () => {
    it("should display Unknown for non-existent match type", () => {
      const matchWithInvalidType = { ...mockMatches[0], match_type_id: "999" };
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={[matchWithInvalidType]} />
        </TestWrapper>
      );

      // Both desktop table and mobile card view render "Unknown"
      const unknownElements = screen.getAllByText("Unknown");
      expect(unknownElements.length).toBeGreaterThan(0);
    });
  });

  describe("Accessibility", () => {
    it("should have proper heading hierarchy", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const h3Headings = screen.getAllByRole("heading", { level: 3 });
      expect(h3Headings.length).toBeGreaterThan(0);
    });

    it("should use semantic table structure", () => {
      render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const table = screen.getByTestId("review-matches-table");
      expect(table.querySelector("thead")).toBeInTheDocument();
      expect(table.querySelector("tbody")).toBeInTheDocument();
    });

    it("should use definition lists for tournament info", () => {
      const { container } = render(
        <TestWrapper>
          <Step3_Review {...defaultProps} />
        </TestWrapper>
      );

      const definitionLists = container.querySelectorAll("dl");
      expect(definitionLists.length).toBeGreaterThan(0);
    });
  });

  describe("Responsive Design", () => {
    it("should have hidden class for mobile card view on desktop", () => {
      const { container } = render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const mobileView = screen.getByTestId("review-matches-cards");
      expect(mobileView).toHaveClass("block", "sm:hidden");
    });

    it("should have hidden class for desktop table view on mobile", () => {
      const { container } = render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const desktopView = container.querySelector(".hidden.sm\\:block");
      expect(desktopView).toBeInTheDocument();
    });
  });

  describe("Styling and Layout", () => {
    it("should use card styling for sections", () => {
      const { container } = render(
        <TestWrapper>
          <Step3_Review {...defaultProps} />
        </TestWrapper>
      );

      const cards = container.querySelectorAll(".rounded-lg.border.bg-card");
      expect(cards.length).toBeGreaterThan(0);
    });

    it("should have hover effects on table rows", () => {
      const { container } = render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const rows = container.querySelectorAll("tbody tr");
      rows.forEach((row) => {
        expect(row).toHaveClass("hover:bg-muted/50");
      });
    });

    it("should use monospace font for numeric values", () => {
      const { container } = render(
        <TestWrapper>
          <Step3_Review {...defaultProps} matches={mockMatches} />
        </TestWrapper>
      );

      const monoElements = container.querySelectorAll(".font-mono");
      expect(monoElements.length).toBeGreaterThan(0);
    });
  });
});

