import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form } from "@/components/ui/form";
import { Toaster, toast } from "sonner";
import StepperNavigation from "./StepperNavigation";
import Step1_BasicInfo from "./Step1_BasicInfo";
import Step2_Metrics from "./Step2_Metrics";
import Step3_Review from "./Step3_Review";
import FormControls from "./FormControls";
import type { MatchTypeDTO, TournamentTypeDTO, CreateTournamentResponseDTO } from "@/types";

// Match-level validation schema
const matchDataSchema = z.object({
  match_type_id: z.string().min(1, "Match type is required"),
  opponent_name: z.string().max(255).optional(),
  player_score: z.number().int().nonnegative("Player score cannot be negative"),
  opponent_score: z.number().int().nonnegative("Opponent score cannot be negative"),
  average_score: z.number().positive("Average score is required").max(180, "Average score cannot exceed 180"),
  first_nine_avg: z
    .number()
    .positive("First nine average is required")
    .max(180, "First nine average cannot exceed 180"),
  checkout_percentage: z
    .number()
    .min(0, "Checkout percentage cannot be negative")
    .max(100, "Checkout percentage cannot exceed 100"),
  score_60_count: z.number().int().nonnegative("Count cannot be negative"),
  score_100_count: z.number().int().nonnegative("Count cannot be negative"),
  score_140_count: z.number().int().nonnegative("Count cannot be negative"),
  score_180_count: z.number().int().nonnegative("Count cannot be negative"),
  high_finish: z
    .number()
    .int()
    .refine((val) => val === 0 || (val >= 2 && val <= 170), {
      message: "High finish must be 0 or between 2 and 170",
    }),
  best_leg: z.number().int().min(9, "Best leg must be at least 9 darts"),
  worst_leg: z.number().int().min(9, "Worst leg must be at least 9 darts"),
});

export type MatchDataViewModel = z.infer<typeof matchDataSchema>;

// Form-level validation schema
const addTournamentFormSchema = z.object({
  // Step 1: Basic Info
  name: z.string().min(3, "Tournament name must be at least 3 characters"),
  date: z
    .date({
      required_error: "Tournament date is required",
    })
    .refine((date) => date <= new Date(), {
      message: "Tournament date cannot be in the future",
    }),
  tournament_type_id: z.string().min(1, "Tournament type is required"),
  final_place: z.number().int().positive("Final place must be a positive number").optional().or(z.undefined()),

  // Step 2: Current match being edited
  current_match: matchDataSchema,

  // Array of completed matches
  matches: z.array(matchDataSchema),
});

export type AddTournamentFormViewModel = z.infer<typeof addTournamentFormSchema>;

const STEPS = ["Basic Info", "Metrics", "Review"];

// Default values for a new match
const defaultMatchValues: MatchDataViewModel = {
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
};

export default function AddTournamentForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [matchTypes, setMatchTypes] = useState<MatchTypeDTO[]>([]);
  const [isLoadingMatchTypes, setIsLoadingMatchTypes] = useState(true);
  const [matchTypesError, setMatchTypesError] = useState<string | null>(null);
  const [tournamentTypes, setTournamentTypes] = useState<TournamentTypeDTO[]>([]);
  const [isLoadingTournamentTypes, setIsLoadingTournamentTypes] = useState(true);
  const [tournamentTypesError, setTournamentTypesError] = useState<string | null>(null);

  const form = useForm<AddTournamentFormViewModel>({
    resolver: zodResolver(addTournamentFormSchema),
    defaultValues: {
      name: "",
      date: new Date(),
      tournament_type_id: "",
      final_place: undefined,
      current_match: defaultMatchValues,
      matches: [],
    },
  });

  // Fetch match types on mount
  useEffect(() => {
    const fetchMatchTypes = async () => {
      try {
        setIsLoadingMatchTypes(true);
        setMatchTypesError(null);

        const response = await fetch("/api/match-types");

        if (!response.ok) {
          throw new Error("Failed to load match types");
        }

        const data: MatchTypeDTO[] = await response.json();
        setMatchTypes(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        setMatchTypesError(errorMessage);
        toast.error("Failed to load match types", {
          description: errorMessage,
        });
      } finally {
        setIsLoadingMatchTypes(false);
      }
    };

    fetchMatchTypes();
  }, []);

  // Fetch tournament types on mount
  useEffect(() => {
    const fetchTournamentTypes = async () => {
      try {
        setIsLoadingTournamentTypes(true);
        setTournamentTypesError(null);

        const response = await fetch("/api/tournament-types");

        if (!response.ok) {
          throw new Error("Failed to load tournament types");
        }

        const data: TournamentTypeDTO[] = await response.json();
        setTournamentTypes(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
        setTournamentTypesError(errorMessage);
        toast.error("Failed to load tournament types", {
          description: errorMessage,
        });
      } finally {
        setIsLoadingTournamentTypes(false);
      }
    };

    fetchTournamentTypes();
  }, []);

  // Watch matches to enable form reactivity
  form.watch("matches");

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  /**
   * Validates and saves the current match to the matches array
   * Resets current_match form fields (except match_type_id)
   * Stays on Step2
   */
  const handleNewMatch = async () => {
    // Validate current match fields
    const isValid = await form.trigger("current_match");

    if (!isValid) {
      // Show validation errors, don't proceed
      return;
    }

    // Get current match data
    const currentMatch = form.getValues("current_match");

    // Add to saved matches array
    const currentMatches = form.getValues("matches");
    form.setValue("matches", [...currentMatches, currentMatch]);

    // Remember the match_type_id
    const lastMatchTypeId = currentMatch.match_type_id;

    // Reset current_match fields (except match_type_id)
    form.setValue("current_match", {
      ...defaultMatchValues,
      match_type_id: lastMatchTypeId, // Pre-select same match type
    });

    // Clear validation errors
    form.clearErrors("current_match");

    // Show success notification
    toast.success("Match saved!", {
      description: `Match ${currentMatches.length + 1} has been added. Add another or proceed to review.`,
    });
  };

  /**
   * Validates current match and moves to Step3
   * If current match has data, automatically save it
   */
  const handleNextFromStep2 = async () => {
    // Get current match and saved matches
    const currentMatch = form.getValues("current_match");
    const savedMatches = form.getValues("matches");

    // Check if current match has any data entered
    const hasMatchData =
      currentMatch.match_type_id !== "" ||
      currentMatch.average_score > 0 ||
      currentMatch.opponent_name !== "" ||
      currentMatch.player_score > 0 ||
      currentMatch.opponent_score > 0;

    // If there are no saved matches and no current match data, require user to fill the form
    if (savedMatches.length === 0 && !hasMatchData) {
      // Trigger validation to show required field errors
      await form.trigger("current_match");
      toast.error("No matches added", {
        description: "Please fill in the match details and click 'New Match' to add it.",
      });
      return;
    }

    // If user has entered data in current match, validate and save it
    if (hasMatchData) {
      const isValid = await form.trigger("current_match");

      if (!isValid) {
        return; // Show validation errors
      }

      // Save current match to array if not already saved
      const isDuplicate = savedMatches.some((m) => JSON.stringify(m) === JSON.stringify(currentMatch));

      if (!isDuplicate) {
        form.setValue("matches", [...savedMatches, currentMatch]);
      }
    }

    // Check if at least one match exists (after potentially adding current match)
    const allMatches = form.getValues("matches");
    if (allMatches.length === 0) {
      toast.error("No matches added", {
        description: "Please add at least one match before proceeding to review.",
      });
      return;
    }

    // Proceed to Step3
    setCurrentStep(2);
  };

  /**
   * Navigates back to Step2 to add another match
   * Current match form should be reset with last match_type_id pre-selected
   */
  const handleAddMatchFromStep3 = () => {
    const savedMatches = form.getValues("matches");
    const lastMatchTypeId = savedMatches.length > 0 ? savedMatches[savedMatches.length - 1].match_type_id : "";

    // Reset current match with pre-selected match type
    form.setValue("current_match", {
      ...defaultMatchValues,
      match_type_id: lastMatchTypeId,
    });

    // Navigate to Step2
    setCurrentStep(1);
  };

  /**
   * Removes a match from the matches array by index
   */
  const handleRemoveMatch = (index: number) => {
    const currentMatches = form.getValues("matches");

    // Remove the match at the specified index
    const updatedMatches = currentMatches.filter((_, i) => i !== index);
    form.setValue("matches", updatedMatches);

    // Show success notification
    toast.success("Match removed", {
      description: `Match ${index + 1} has been removed.`,
    });
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      // Step1 -> Step2: Validate Step1 fields
      const isValid = await form.trigger(["name", "date", "tournament_type_id", "final_place"]);
      if (isValid) {
        setCurrentStep(1);
      }
    } else if (currentStep === 1) {
      // Step2 -> Step3: Use special handler
      await handleNextFromStep2();
    }
  };

  const handleSubmitClick = () => {
    // Enable submission flag when Submit button is explicitly clicked
    setCanSubmit(true);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Only allow form submission if explicitly allowed via Submit button
    if (canSubmit && currentStep === STEPS.length - 1) {
      await form.handleSubmit(onSubmit)(e);
    }

    // Reset the flag after attempting submission
    setCanSubmit(false);
  };

  const onSubmit = async (data: AddTournamentFormViewModel) => {
    // Double-check: Only submit if we're on the final step (Review) and explicitly allowed
    if (currentStep !== STEPS.length - 1 || !canSubmit) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Get all saved matches
      const allMatches = data.matches;

      if (allMatches.length === 0) {
        toast.error("No matches to submit", {
          description: "Cannot submit tournament without matches.",
        });
        return;
      }

      // Transform data for API
      const tournamentData = {
        name: data.name,
        date: data.date.toISOString().split("T")[0], // Format as YYYY-MM-DD
        tournament_type_id: parseInt(data.tournament_type_id, 10),
        final_place: data.final_place,
        matches: allMatches.map((match) => ({
          match_type_id: parseInt(match.match_type_id, 10),
          opponent_name: match.opponent_name || null,
          player_score: match.player_score,
          opponent_score: match.opponent_score,
          average_score: match.average_score,
          first_nine_avg: match.first_nine_avg,
          checkout_percentage: match.checkout_percentage,
          score_60_count: match.score_60_count,
          score_100_count: match.score_100_count,
          score_140_count: match.score_140_count,
          score_180_count: match.score_180_count,
          high_finish: match.high_finish,
          best_leg: match.best_leg,
          worst_leg: match.worst_leg,
        })),
      };

      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tournamentData),
      });

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error("Invalid data. Please review your entries.");
        }
        if (response.status >= 500) {
          throw new Error("An unexpected error occurred. Please try again later.");
        }
        throw new Error("Failed to save tournament");
      }

      const result: CreateTournamentResponseDTO = await response.json();

      // Show success message
      toast.success("Tournament saved successfully!", {
        description: `Tournament "${data.name}" with ${allMatches.length} ${
          allMatches.length === 1 ? "match" : "matches"
        } has been recorded.`,
      });

      // Show AI feedback if available
      if (result.feedback) {
        setTimeout(() => {
          toast.info("Performance Analysis", {
            description: result.feedback,
            duration: 17000, // Display longer to allow reading
          });
        }, 500); // Delay to show after success message
      }

      // Reset form and navigate to Step1
      form.reset({
        name: "",
        date: new Date(),
        tournament_type_id: "",
        final_place: undefined,
        current_match: defaultMatchValues,
        matches: [],
      });
      setCurrentStep(0);

      // Redirect to dashboard after successful submission
      setTimeout(
        () => {
          window.location.href = "/";
        },
        result.feedback ? 17500 : 1500
      ); // Wait longer if feedback is shown
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      toast.error("Failed to save tournament", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-8">
        <div data-testid="stepper-navigation">
          <StepperNavigation currentStep={currentStep} steps={STEPS} />
        </div>

        <Form {...form}>
          <form onSubmit={handleFormSubmit} className="space-y-8">
            {currentStep === 0 && (
              <Step1_BasicInfo
                tournamentTypes={tournamentTypes}
                isLoadingTournamentTypes={isLoadingTournamentTypes}
                tournamentTypesError={tournamentTypesError}
              />
            )}

            {currentStep === 1 && (
              <Step2_Metrics
                matchTypes={matchTypes}
                isLoadingMatchTypes={isLoadingMatchTypes}
                matchTypesError={matchTypesError}
                onSaveMatch={handleNewMatch}
              />
            )}

            {currentStep === 2 && (
              <Step3_Review
                matchTypes={matchTypes}
                tournamentTypes={tournamentTypes}
                matches={form.watch("matches")}
                onRemoveMatch={handleRemoveMatch}
              />
            )}

            <FormControls
              currentStep={currentStep}
              totalSteps={STEPS.length}
              isSubmitting={isSubmitting}
              onBack={handleBack}
              onNext={handleNext}
              onSubmit={handleSubmitClick}
              onAddMatch={handleAddMatchFromStep3}
            />
          </form>
        </Form>
      </div>

      <Toaster richColors position="top-right" />
    </>
  );
}
