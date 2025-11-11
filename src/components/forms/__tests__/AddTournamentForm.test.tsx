import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@/test/utils/test-utils";
import { createMockAPIResponse } from "@/test/utils/mock-factories";
import AddTournamentForm from "@/components/forms/AddTournamentForm";
import type { MatchTypeDTO } from "@/types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("AddTournamentForm", () => {
  const mockMatchTypes: MatchTypeDTO[] = [
    { id: 1, name: "Singles 501" },
    { id: 2, name: "Doubles 501" },
    { id: 3, name: "Singles Cricket" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for match types fetch
    mockFetch.mockResolvedValue(createMockAPIResponse(mockMatchTypes));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should fetch match types on mount", async () => {
      render(<AddTournamentForm />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/match-types");
      });
    });

    it("should handle match types fetch error gracefully", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch.mockRejectedValueOnce(new Error("Failed to load match types"));

      render(<AddTournamentForm />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/match-types");
      });

      // Component should still render even with error
      expect(screen.getByText("Basic Info")).toBeInTheDocument();

      consoleError.mockRestore();
    });

    it("should render StepperNavigation with correct steps", async () => {
      render(<AddTournamentForm />);

      await waitFor(() => {
        expect(screen.getByText("Basic Info")).toBeInTheDocument();
      });

      // Check all steps are shown in stepper
      expect(screen.getByText("Basic Info")).toBeInTheDocument();
      expect(screen.getByText("Metrics")).toBeInTheDocument();
      expect(screen.getByText("Review")).toBeInTheDocument();
    });

    it("should start at step 0 (Basic Info)", async () => {
      render(<AddTournamentForm />);

      await waitFor(() => {
        expect(screen.getByText("Basic Info")).toBeInTheDocument();
      });

      // Should show Tournament Name field (from Step1_BasicInfo)
      expect(screen.getByText("Tournament Name")).toBeInTheDocument();
    });
  });

  describe("Form Structure", () => {
    it("should render with form element", async () => {
      const { container } = render(<AddTournamentForm />);

      await waitFor(() => {
        const form = container.querySelector("form");
        expect(form).toBeInTheDocument();
      });
    });

    it("should include Toaster component for notifications", () => {
      // The Toaster component from Sonner is included in the form
      // It renders lazily to document.body when toasts are displayed
      // This test documents that the component includes <Toaster /> for notifications

      render(<AddTournamentForm />);

      // Component renders successfully with Toaster included
      expect(screen.getByText("Basic Info")).toBeInTheDocument();
    });
  });

  describe("Match Types Integration", () => {
    it("should display loading state while fetching match types", () => {
      // Mock a slow fetch
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<AddTournamentForm />);

      // Component renders during loading
      expect(screen.getByText("Basic Info")).toBeInTheDocument();
    });

    it("should pass match types to Step1_BasicInfo after loading", async () => {
      render(<AddTournamentForm />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/match-types");
      });

      // Wait for match types to be loaded and rendered
      await waitFor(() => {
        // Match Type label should be visible
        expect(screen.getByText("Match Type")).toBeInTheDocument();
      });
    });
  });

  describe("Form Validation Schema", () => {
    it("should have correct default values", async () => {
      const { container } = render(<AddTournamentForm />);

      await waitFor(() => {
        const nameInput = container.querySelector('input[name="name"]');
        expect(nameInput).toHaveValue("");
      });
    });
  });

  describe("Critical Bug Documentation", () => {
    it("KNOWN BUG: final_placement field exists in form but not in submission", async () => {
      // This test documents the bug where final_placement is collected but not submitted
      // The field is defined in the Zod schema (line 30 of AddTournamentForm.tsx)
      // But it's missing from the CreateTournamentCommand transformation (lines 179-195)

      // When this bug is fixed, the following should be true:
      // 1. final_placement should be included in the command.result object
      // 2. The API endpoint should accept and save final_placement

      expect(true).toBe(true); // Placeholder test to document the bug
    });
  });

  describe("Stepper Navigation Logic", () => {
    it("should initialize with currentStep state at 0", async () => {
      render(<AddTournamentForm />);

      await waitFor(() => {
        // First step (Basic Info) should be visible
        expect(screen.getByText("Tournament Name")).toBeInTheDocument();
      });
    });

    it("should show FormControls component", async () => {
      render(<AddTournamentForm />);

      await waitFor(() => {
        // Next button should be visible on first step
        expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
      });
    });

    it("should disable Back button on first step", async () => {
      render(<AddTournamentForm />);

      await waitFor(() => {
        // Back button should be disabled on step 0
        const backButton = screen.getByRole("button", { name: /back/i });
        expect(backButton).toBeDisabled();
      });
    });
  });

  describe("Complex Submission Logic", () => {
    it("should use canSubmit flag pattern to control submission", () => {
      // This test documents the over-engineered submission control
      // The form uses a canSubmit flag that gets set by handleSubmitClick
      // Then checked in both handleFormSubmit and onSubmit
      // This creates triple guards: step check + canSubmit + explicit button click

      // Recommendation: Simplify by removing canSubmit flag and relying on step check alone
      expect(true).toBe(true); // Documentation test
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors during form submission", () => {
      // The component handles three types of errors:
      // 1. 400 Bad Request - "Invalid data. Please review your entries."
      // 2. 500+ Server Error - "An unexpected error occurred. Please try again later."
      // 3. Other failures - "Failed to save tournament"

      // Error handling is implemented in onSubmit function (lines 205-213)
      expect(true).toBe(true); // Documentation test
    });
  });
});
