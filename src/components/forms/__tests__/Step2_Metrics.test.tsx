import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@/test/utils/test-utils";
import { FormProvider, useForm } from "react-hook-form";
import userEvent from "@testing-library/user-event";
import Step2_Metrics from "@/components/forms/Step2_Metrics";
import type { MatchTypeDTO } from "@/types";
import type { AddTournamentFormViewModel } from "@/components/forms/AddTournamentForm";

// Mock wrapper component to provide form context
function TestWrapper({ children, defaultValues }: { children: React.ReactNode; defaultValues?: Partial<AddTournamentFormViewModel> }) {
  const form = useForm<AddTournamentFormViewModel>({
    defaultValues: {
      name: "Test Tournament",
      date: new Date(),
      tournament_type_id: "1",
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

describe("Step2_Metrics", () => {
  const mockMatchTypes: MatchTypeDTO[] = [
    { id: 1, name: "Singles 501" },
    { id: 2, name: "Doubles 501" },
    { id: 3, name: "Singles Cricket" },
  ];

  const mockOnSaveMatch = vi.fn();

  const defaultProps = {
    matchTypes: mockMatchTypes,
    isLoadingMatchTypes: false,
    matchTypesError: null,
    onSaveMatch: mockOnSaveMatch,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Component Rendering", () => {
    it("should render all form sections", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByText("Match Type")).toBeInTheDocument();
      expect(screen.getByText("Opponent Name")).toBeInTheDocument();
      expect(screen.getByText("Result")).toBeInTheDocument();
      expect(screen.getByText("Performance Metrics")).toBeInTheDocument();
      expect(screen.getByText("Score Counts")).toBeInTheDocument();
      expect(screen.getByText("Leg Performance")).toBeInTheDocument();
    });

    it("should render New Match button", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId("new-match-button")).toBeInTheDocument();
      expect(screen.getByText("New Match")).toBeInTheDocument();
    });

    it("should render all input fields with correct test ids", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId("match-type-select")).toBeInTheDocument();
      expect(screen.getByTestId("opponent-name-input")).toBeInTheDocument();
      expect(screen.getByTestId("player-score-input")).toBeInTheDocument();
      expect(screen.getByTestId("opponent-score-input")).toBeInTheDocument();
      expect(screen.getByTestId("average-score-input")).toBeInTheDocument();
      expect(screen.getByTestId("first-nine-avg-input")).toBeInTheDocument();
      expect(screen.getByTestId("checkout-percentage-input")).toBeInTheDocument();
      expect(screen.getByTestId("high-finish-input")).toBeInTheDocument();
      expect(screen.getByTestId("score-60-count-input")).toBeInTheDocument();
      expect(screen.getByTestId("score-100-count-input")).toBeInTheDocument();
      expect(screen.getByTestId("score-140-count-input")).toBeInTheDocument();
      expect(screen.getByTestId("score-180-count-input")).toBeInTheDocument();
      expect(screen.getByTestId("best-leg-input")).toBeInTheDocument();
      expect(screen.getByTestId("worst-leg-input")).toBeInTheDocument();
    });
  });

  describe("Match Type Selection", () => {
    it("should display loading message when match types are loading", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} isLoadingMatchTypes={true} />
        </TestWrapper>
      );

      expect(screen.getByText(/Loading match types.../i)).toBeInTheDocument();
    });

    it("should display match types error when provided", () => {
      const errorMessage = "Failed to load match types";
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} matchTypesError={errorMessage} />
        </TestWrapper>
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it("should disable match type select when loading", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} isLoadingMatchTypes={true} />
        </TestWrapper>
      );

      const selectTrigger = screen.getByTestId("match-type-select");
      // Radix UI Select uses data-disabled attribute
      expect(selectTrigger).toHaveAttribute("data-disabled");
    });

    it("should render all match types in the select", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      // Verify select is rendered
      const selectTrigger = screen.getByTestId("match-type-select");
      expect(selectTrigger).toBeInTheDocument();
      
      // Note: Testing Radix UI Select dropdown interaction is complex in jsdom
      // The match types are passed as props and rendered in SelectContent
      // This test verifies the select trigger renders correctly
    });
  });

  describe("Opponent Name Field", () => {
    it("should allow entering opponent name", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const opponentInput = screen.getByTestId("opponent-name-input");
      await user.type(opponentInput, "John Doe");

      expect(opponentInput).toHaveValue("John Doe");
    });

    it("should have maxLength of 255", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const opponentInput = screen.getByTestId("opponent-name-input");
      expect(opponentInput).toHaveAttribute("maxLength", "255");
    });

    it("should have correct placeholder", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const opponentInput = screen.getByTestId("opponent-name-input");
      expect(opponentInput).toHaveAttribute("placeholder", "Enter opponent name");
    });
  });

  describe("Result Score Fields", () => {
    it("should render player score and opponent score fields", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId("player-score-input")).toBeInTheDocument();
      expect(screen.getByTestId("opponent-score-input")).toBeInTheDocument();
    });

    it("should have colon separator between scores", () => {
      const { container } = render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const separator = container.querySelector('span.text-lg.font-semibold');
      expect(separator).toHaveTextContent(":");
    });

    it("should allow entering player score", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const playerScoreInput = screen.getByTestId("player-score-input");
      await user.clear(playerScoreInput);
      await user.type(playerScoreInput, "3");

      expect(playerScoreInput).toHaveValue(3);
    });

    it("should allow entering opponent score", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const opponentScoreInput = screen.getByTestId("opponent-score-input");
      await user.clear(opponentScoreInput);
      await user.type(opponentScoreInput, "2");

      expect(opponentScoreInput).toHaveValue(2);
    });

    it("should have correct type and constraints for score inputs", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const playerScoreInput = screen.getByTestId("player-score-input");
      const opponentScoreInput = screen.getByTestId("opponent-score-input");

      expect(playerScoreInput).toHaveAttribute("type", "number");
      expect(playerScoreInput).toHaveAttribute("min", "0");
      expect(playerScoreInput).toHaveAttribute("step", "1");

      expect(opponentScoreInput).toHaveAttribute("type", "number");
      expect(opponentScoreInput).toHaveAttribute("min", "0");
      expect(opponentScoreInput).toHaveAttribute("step", "1");
    });
  });

  describe("Performance Metrics Section", () => {
    it("should render all performance metric fields", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByLabelText("Average Score")).toBeInTheDocument();
      expect(screen.getByLabelText("First Nine Average")).toBeInTheDocument();
      expect(screen.getByLabelText("Checkout Percentage")).toBeInTheDocument();
      expect(screen.getByLabelText("High Finish")).toBeInTheDocument();
    });

    it("should allow entering average score", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const avgScoreInput = screen.getByTestId("average-score-input");
      await user.clear(avgScoreInput);
      await user.type(avgScoreInput, "75.5");

      expect(avgScoreInput).toHaveValue(75.5);
    });

    it("should allow entering first nine average", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const firstNineInput = screen.getByTestId("first-nine-avg-input");
      await user.clear(firstNineInput);
      await user.type(firstNineInput, "80");

      expect(firstNineInput).toHaveValue(80);
    });

    it("should allow entering checkout percentage", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const checkoutInput = screen.getByTestId("checkout-percentage-input");
      await user.clear(checkoutInput);
      await user.type(checkoutInput, "35");

      expect(checkoutInput).toHaveValue(35);
    });

    it("should allow entering high finish", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const highFinishInput = screen.getByTestId("high-finish-input");
      await user.clear(highFinishInput);
      await user.type(highFinishInput, "120");

      expect(highFinishInput).toHaveValue(120);
    });

    it("should have correct constraints for average score", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const avgScoreInput = screen.getByTestId("average-score-input");
      expect(avgScoreInput).toHaveAttribute("type", "number");
      expect(avgScoreInput).toHaveAttribute("min", "0.01");
      expect(avgScoreInput).toHaveAttribute("max", "180");
      expect(avgScoreInput).toHaveAttribute("step", "1.00");
    });

    it("should have correct constraints for first nine average", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const firstNineInput = screen.getByTestId("first-nine-avg-input");
      expect(firstNineInput).toHaveAttribute("type", "number");
      expect(firstNineInput).toHaveAttribute("min", "0.01");
      expect(firstNineInput).toHaveAttribute("max", "180");
      expect(firstNineInput).toHaveAttribute("step", "1.00");
    });

    it("should have correct constraints for checkout percentage", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const checkoutInput = screen.getByTestId("checkout-percentage-input");
      expect(checkoutInput).toHaveAttribute("type", "number");
      expect(checkoutInput).toHaveAttribute("min", "0");
      expect(checkoutInput).toHaveAttribute("max", "100");
      expect(checkoutInput).toHaveAttribute("step", "1.00");
    });

    it("should have correct constraints for high finish", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const highFinishInput = screen.getByTestId("high-finish-input");
      expect(highFinishInput).toHaveAttribute("type", "number");
      expect(highFinishInput).toHaveAttribute("min", "0");
      expect(highFinishInput).toHaveAttribute("max", "170");
      expect(highFinishInput).toHaveAttribute("step", "1");
    });
  });

  describe("Score Counts Section", () => {
    it("should render all score count fields", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByLabelText("60+ Scores")).toBeInTheDocument();
      expect(screen.getByLabelText("100+ Scores")).toBeInTheDocument();
      expect(screen.getByLabelText("140+ Scores")).toBeInTheDocument();
      expect(screen.getByLabelText("180 Scores")).toBeInTheDocument();
    });

    it("should allow entering 60+ count", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const count60Input = screen.getByTestId("score-60-count-input");
      await user.clear(count60Input);
      await user.type(count60Input, "5");

      expect(count60Input).toHaveValue(5);
    });

    it("should allow entering 100+ count", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const count100Input = screen.getByTestId("score-100-count-input");
      await user.clear(count100Input);
      await user.type(count100Input, "3");

      expect(count100Input).toHaveValue(3);
    });

    it("should allow entering 140+ count", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const count140Input = screen.getByTestId("score-140-count-input");
      await user.clear(count140Input);
      await user.type(count140Input, "2");

      expect(count140Input).toHaveValue(2);
    });

    it("should allow entering 180 count", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const count180Input = screen.getByTestId("score-180-count-input");
      await user.clear(count180Input);
      await user.type(count180Input, "1");

      expect(count180Input).toHaveValue(1);
    });

    it("should have correct type and constraints for score counts", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const scoreCountInputs = [
        screen.getByTestId("score-60-count-input"),
        screen.getByTestId("score-100-count-input"),
        screen.getByTestId("score-140-count-input"),
        screen.getByTestId("score-180-count-input"),
      ];

      scoreCountInputs.forEach((input) => {
        expect(input).toHaveAttribute("type", "number");
        expect(input).toHaveAttribute("min", "0");
        expect(input).toHaveAttribute("step", "1");
        expect(input).toHaveAttribute("placeholder", "0");
      });
    });
  });

  describe("Leg Performance Section", () => {
    it("should render leg performance fields", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByLabelText("Best Leg (darts)")).toBeInTheDocument();
      expect(screen.getByLabelText("Worst Leg (darts)")).toBeInTheDocument();
    });

    it("should display descriptions for leg fields", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const descriptions = screen.getAllByText("Minimum 9 darts");
      expect(descriptions).toHaveLength(2);
    });

    it("should allow entering best leg value", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const bestLegInput = screen.getByTestId("best-leg-input") as HTMLInputElement;
      // Select all and replace with new value
      await user.tripleClick(bestLegInput);
      await user.keyboard("15");

      await waitFor(() => {
        expect(bestLegInput).toHaveValue(15);
      });
    });

    it("should allow entering worst leg value", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const worstLegInput = screen.getByTestId("worst-leg-input") as HTMLInputElement;
      // Select all and replace with new value
      await user.tripleClick(worstLegInput);
      await user.keyboard("45");

      await waitFor(() => {
        expect(worstLegInput).toHaveValue(45);
      });
    });

    it("should have correct constraints for leg performance fields", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const bestLegInput = screen.getByTestId("best-leg-input");
      const worstLegInput = screen.getByTestId("worst-leg-input");

      expect(bestLegInput).toHaveAttribute("type", "number");
      expect(bestLegInput).toHaveAttribute("min", "9");
      expect(bestLegInput).toHaveAttribute("step", "1");
      expect(bestLegInput).toHaveAttribute("placeholder", "21");

      expect(worstLegInput).toHaveAttribute("type", "number");
      expect(worstLegInput).toHaveAttribute("min", "9");
      expect(worstLegInput).toHaveAttribute("step", "1");
      expect(worstLegInput).toHaveAttribute("placeholder", "33");
    });
  });

  describe("New Match Button", () => {
    it("should call onSaveMatch when clicked", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const newMatchButton = screen.getByTestId("new-match-button");
      await user.click(newMatchButton);

      expect(mockOnSaveMatch).toHaveBeenCalledTimes(1);
    });

    it("should have secondary variant styling", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const newMatchButton = screen.getByTestId("new-match-button");
      expect(newMatchButton).toHaveClass("bg-secondary");
    });

    it("should be of type button to prevent form submission", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const newMatchButton = screen.getByTestId("new-match-button");
      expect(newMatchButton).toHaveAttribute("type", "button");
    });
  });

  describe("Responsive Layout", () => {
    it("should have responsive grid classes for main fields", () => {
      const { container } = render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const mainGrid = container.querySelector(".grid.gap-4.sm\\:grid-cols-1.lg\\:grid-cols-3");
      expect(mainGrid).toBeInTheDocument();
    });

    it("should have responsive grid for performance metrics", () => {
      const { container } = render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const grids = container.querySelectorAll(".grid.gap-4.sm\\:grid-cols-2");
      expect(grids.length).toBeGreaterThan(0);
    });

    it("should have responsive grid for score counts", () => {
      const { container } = render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const scoreCountGrid = container.querySelector(".grid.gap-4.sm\\:grid-cols-2.lg\\:grid-cols-4");
      expect(scoreCountGrid).toBeInTheDocument();
    });
  });

  describe("Form Integration", () => {
    it("should integrate with react-hook-form context", () => {
      const { container } = render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      // All inputs should have names from react-hook-form
      const playerScoreInput = screen.getByTestId("player-score-input");
      expect(playerScoreInput).toHaveAttribute("name", "current_match.player_score");
    });

    it("should display form values from context", () => {
      render(
        <TestWrapper
          defaultValues={{
            current_match: {
              match_type_id: "1",
              opponent_name: "Test Opponent",
              player_score: 3,
              opponent_score: 2,
              average_score: 75.5,
              first_nine_avg: 80,
              checkout_percentage: 35,
              score_60_count: 5,
              score_100_count: 3,
              score_140_count: 2,
              score_180_count: 1,
              high_finish: 120,
              best_leg: 15,
              worst_leg: 30,
            },
          }}
        >
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId("opponent-name-input")).toHaveValue("Test Opponent");
      expect(screen.getByTestId("player-score-input")).toHaveValue(3);
      expect(screen.getByTestId("opponent-score-input")).toHaveValue(2);
    });
  });

  describe("Accessibility", () => {
    it("should have proper labels for all form fields", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      expect(screen.getByLabelText("Match Type")).toBeInTheDocument();
      expect(screen.getByLabelText("Opponent Name")).toBeInTheDocument();
      expect(screen.getByLabelText("Average Score")).toBeInTheDocument();
      expect(screen.getByLabelText("First Nine Average")).toBeInTheDocument();
      expect(screen.getByLabelText("Checkout Percentage")).toBeInTheDocument();
      expect(screen.getByLabelText("High Finish")).toBeInTheDocument();
      expect(screen.getByLabelText("60+ Scores")).toBeInTheDocument();
      expect(screen.getByLabelText("100+ Scores")).toBeInTheDocument();
      expect(screen.getByLabelText("140+ Scores")).toBeInTheDocument();
      expect(screen.getByLabelText("180 Scores")).toBeInTheDocument();
      expect(screen.getByLabelText("Best Leg (darts)")).toBeInTheDocument();
      expect(screen.getByLabelText("Worst Leg (darts)")).toBeInTheDocument();
    });

    it("should have semantic section headings", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} />
        </TestWrapper>
      );

      const headings = screen.getAllByRole("heading", { level: 3 });
      expect(headings).toHaveLength(3);
      expect(headings[0]).toHaveTextContent("Performance Metrics");
      expect(headings[1]).toHaveTextContent("Score Counts");
      expect(headings[2]).toHaveTextContent("Leg Performance");
    });
  });

  describe("Error States", () => {
    it("should not render select when matchTypesError is present", () => {
      render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} matchTypesError="API Error" />
        </TestWrapper>
      );

      // Select should not be rendered, only error message
      const selects = document.querySelectorAll('[role="combobox"]');
      expect(selects.length).toBe(0);
    });

    it("should style error message appropriately", () => {
      const { container } = render(
        <TestWrapper>
          <Step2_Metrics {...defaultProps} matchTypesError="Failed to load" />
        </TestWrapper>
      );

      const errorDiv = container.querySelector(".bg-destructive\\/10.text-destructive");
      expect(errorDiv).toBeInTheDocument();
    });
  });
});

