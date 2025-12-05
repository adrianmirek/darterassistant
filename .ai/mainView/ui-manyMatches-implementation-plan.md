# Frontend Implementation Plan: Many Matches Support

## Overview

This document provides a comprehensive frontend implementation plan for supporting multiple matches per tournament. This enables users to add multiple match results within a single tournament before final submission.

## User Flow Summary

1. **Step1 (Basic Info)**: User enters tournament name, date, and tournament_type
2. **Step2 (Metrics)**: User enters match-specific data (now includes match_type, opponent, and metrics)
   - User can click "New Match" to save current match and add another (stays on Step2)
   - User can click "Next" to proceed to Step3 after entering at least one match
3. **Step3 (Review)**: User reviews all tournament data and all matches
   - User can click "Add Match" to return to Step2 and add more matches
   - User can click "Submit" to save to database, call OpenRouter, and return to Step1

---

## Data Model Changes

### Form State Structure

The form needs to manage multiple matches. Update the form view model:

**File**: `src/components/forms/AddTournamentForm.tsx`

```typescript
// Current view model (single match)
export interface AddTournamentFormViewModel {
  name: string;
  date: Date;
  match_type_id: string;
  final_placement: number;
  average_score: number;
  first_nine_avg: number;
  checkout_percentage: number;
  score_60_count: number;
  score_100_count: number;
  score_140_count: number;
  score_180_count: number;
  high_finish: number;
  best_leg: number;
  worst_leg: number;
}

// NEW: Single match data structure
export interface MatchDataViewModel {
  match_type_id: string;
  opponent_name: string; // Maps to full_name in API
  final_placement: number;
  average_score: number;
  first_nine_avg: number;
  checkout_percentage: number;
  score_60_count: number;
  score_100_count: number;
  score_140_count: number;
  score_180_count: number;
  high_finish: number;
  best_leg: number;
  worst_leg: number;
}

// NEW: Updated form view model with multiple matches
export interface AddTournamentFormViewModel {
  // Tournament-level fields (Step1)
  name: string;
  date: Date;
  tournament_type_id: string; // NEW

  // Current match being edited (Step2)
  current_match: MatchDataViewModel;

  // Array of completed matches
  matches: MatchDataViewModel[];
}
```

### Form State Management

**State Variables Needed**:
```typescript
const [currentStep, setCurrentStep] = useState(0);
const [savedMatches, setSavedMatches] = useState<MatchDataViewModel[]>([]);
const [isSubmitting, setIsSubmitting] = useState(false);
const [tournamentTypes, setTournamentTypes] = useState<TournamentTypeDTO[]>([]);
const [isLoadingTournamentTypes, setIsLoadingTournamentTypes] = useState(false);
const [tournamentTypesError, setTournamentTypesError] = useState<string | null>(null);
```

---

## Implementation Tasks

### Task 1: Update Type Definitions

**File**: `src/components/forms/AddTournamentForm.tsx`

**Changes**:
1. Add `MatchDataViewModel` interface
2. Update `AddTournamentFormViewModel` to include:
   - `tournament_type_id: string`
   - `current_match: MatchDataViewModel`
   - Remove all match-specific fields from root level
3. Update form default values structure

**New Default Values**:
```typescript
const defaultMatchValues: MatchDataViewModel = {
  match_type_id: "",
  opponent_name: "",
  final_placement: 1,
  average_score: 0,
  first_nine_avg: 0,
  checkout_percentage: 0,
  score_60_count: 0,
  score_100_count: 0,
  score_140_count: 0,
  score_180_count: 0,
  high_finish: 0,
  best_leg: 9,
  worst_leg: 9,
};

const form = useForm<AddTournamentFormViewModel>({
  resolver: zodResolver(addTournamentSchema),
  defaultValues: {
    name: "",
    date: new Date(),
    tournament_type_id: "",
    current_match: defaultMatchValues,
    matches: [],
  },
});
```

**Validation Schema Update**:
```typescript
// NEW: Match-level validation schema
const matchDataSchema = z.object({
  match_type_id: z.string().min(1, "Match type is required"),
  opponent_name: z.string().max(255).optional(),
  final_placement: z.number().int().min(1),
  average_score: z.number().nonnegative(),
  first_nine_avg: z.number().nonnegative(),
  checkout_percentage: z.number().min(0).max(100),
  score_60_count: z.number().int().min(0),
  score_100_count: z.number().int().min(0),
  score_140_count: z.number().int().min(0),
  score_180_count: z.number().int().min(0),
  high_finish: z.number().int().min(0).max(170),
  best_leg: z.number().int().min(9),
  worst_leg: z.number().int().min(9),
});

// Updated form-level validation schema
const addTournamentSchema = z.object({
  name: z.string().min(1, "Tournament name is required").max(255),
  date: z.date(),
  tournament_type_id: z.string().min(1, "Tournament type is required"),
  current_match: matchDataSchema,
  matches: z.array(matchDataSchema),
});
```

---

### Task 2: Fetch Tournament Types

**File**: `src/components/forms/AddTournamentForm.tsx`

**Add API call to fetch tournament types** (similar to match types):

```typescript
// Inside AddTournamentForm component
useEffect(() => {
  const fetchTournamentTypes = async () => {
    setIsLoadingTournamentTypes(true);
    setTournamentTypesError(null);

    try {
      const response = await fetch("/api/tournament-types");
      if (!response.ok) {
        throw new Error("Failed to fetch tournament types");
      }
      const data: TournamentTypeDTO[] = await response.json();
      setTournamentTypes(data);
    } catch (error) {
      console.error("Error fetching tournament types:", error);
      setTournamentTypesError("Failed to load tournament types. Please try again.");
    } finally {
      setIsLoadingTournamentTypes(false);
    }
  };

  fetchTournamentTypes();
}, []);
```

---

### Task 3: Update Step1_BasicInfo Component

**File**: `src/components/forms/Step1_BasicInfo.tsx`

**Changes**:
1. ✅ Keep `name` field
2. ✅ Keep `date` field
3. ✅ **REMOVE** `match_type_id` field
4. ✅ **ADD** `tournament_type_id` field

**Props Interface Update**:
```typescript
interface Step1_BasicInfoProps {
  tournamentTypes: TournamentTypeDTO[];
  isLoadingTournamentTypes: boolean;
  tournamentTypesError: string | null;
}
```

**New Tournament Type Field** (copy pattern from old match_type):
```typescript
<FormField
  control={form.control}
  name="tournament_type_id"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Tournament Type</FormLabel>
      {tournamentTypesError ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {tournamentTypesError}
        </div>
      ) : (
        <Select 
          onValueChange={field.onChange} 
          defaultValue={field.value} 
          disabled={isLoadingTournamentTypes}
        >
          <FormControl>
            <SelectTrigger>
              <SelectValue
                placeholder={
                  isLoadingTournamentTypes 
                    ? "Loading tournament types..." 
                    : "Select a tournament type"
                }
              />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {tournamentTypes.map((type) => (
              <SelectItem key={type.id} value={type.id.toString()}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <FormMessage />
    </FormItem>
  )}
/>
```

---

### Task 4: Update Step2_Metrics Component

**File**: `src/components/forms/Step2_Metrics.tsx`

**Major Changes**:
1. ✅ **ADD** `match_type_id` field (moved from Step1)
2. ✅ **ADD** `opponent_name` field (new)
3. ✅ **ADD** "New Match" button
4. ✅ Update all field paths to use `current_match.{field_name}`

**Props Interface**:
```typescript
interface Step2_MetricsProps {
  matchTypes: MatchTypeDTO[];
  isLoadingMatchTypes: boolean;
  matchTypesError: string | null;
  onSaveMatch: () => void; // Callback to save current match
}
```

**Component Structure**:
```typescript
export default function Step2_Metrics({
  matchTypes,
  isLoadingMatchTypes,
  matchTypesError,
  onSaveMatch,
}: Step2_MetricsProps) {
  const form = useFormContext<AddTournamentFormViewModel>();

  return (
    <div className="space-y-6">
      {/* Match Type Field - Moved from Step1 */}
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="current_match.match_type_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Match Type</FormLabel>
              {matchTypesError ? (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {matchTypesError}
                </div>
              ) : (
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value} 
                  disabled={isLoadingMatchTypes}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isLoadingMatchTypes 
                            ? "Loading match types..." 
                            : "Select a match type"
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {matchTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* NEW: Opponent Name Field */}
        <FormField
          control={form.control}
          name="current_match.opponent_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Opponent Name (Optional)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter opponent name" 
                  maxLength={255}
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Leave blank if not applicable
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Final Placement Field */}
        <FormField
          control={form.control}
          name="current_match.final_placement"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Final Placement</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="1"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                />
              </FormControl>
              <FormDescription>Your final position in this match</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Performance Metrics Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Performance Metrics</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="current_match.average_score"
            render={({ field }) => (
              {/* ... rest of field implementation */}
            )}
          />
          {/* ... other metric fields with current_match. prefix */}
        </div>
      </div>

      {/* Score Counts Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Score Counts</h3>
        {/* ... all fields with current_match. prefix */}
      </div>

      {/* Leg Performance Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Leg Performance</h3>
        {/* ... all fields with current_match. prefix */}
      </div>

      {/* NEW: New Match Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button 
          type="button" 
          variant="secondary"
          onClick={onSaveMatch}
        >
          New Match
        </Button>
      </div>
    </div>
  );
}
```

**Important**: All field names must be updated from `name="field_name"` to `name="current_match.field_name"`:
- `average_score` → `current_match.average_score`
- `first_nine_avg` → `current_match.first_nine_avg`
- `checkout_percentage` → `current_match.checkout_percentage`
- etc.

---

### Task 5: Update FormControls Component

**File**: `src/components/forms/FormControls.tsx`

**Changes**:
1. ✅ Add `onAddMatch` callback prop
2. ✅ Add "Add Match" button on Step3
3. ✅ Update button logic

**Props Interface Update**:
```typescript
interface FormControlsProps {
  currentStep: number;
  totalSteps: number;
  isSubmitting: boolean;
  canProceedToReview: boolean; // NEW: Validation flag for Step2 -> Step3
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onAddMatch?: () => void; // NEW: Only used on Step3
}
```

**Updated Component**:
```typescript
export default function FormControls({
  currentStep,
  totalSteps,
  isSubmitting,
  canProceedToReview,
  onBack,
  onNext,
  onSubmit,
  onAddMatch,
}: FormControlsProps) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const isSecondStep = currentStep === 1;

  return (
    <div className="flex justify-between gap-4 pt-6 border-t">
      <Button 
        type="button" 
        variant="outline" 
        onClick={onBack} 
        disabled={isFirstStep || isSubmitting}
      >
        Back
      </Button>

      <div className="flex gap-4">
        {/* Add Match button - only visible on Step3 (Review) */}
        {isLastStep && onAddMatch && (
          <Button 
            type="button" 
            variant="secondary" 
            onClick={onAddMatch} 
            disabled={isSubmitting}
          >
            Add Match
          </Button>
        )}

        {/* Submit button - only visible on Step3 */}
        {isLastStep ? (
          <Button 
            type="submit" 
            onClick={onSubmit} 
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
        ) : (
          /* Next button - visible on Step1 and Step2 */
          <Button 
            type="button" 
            onClick={onNext} 
            disabled={isSubmitting || (isSecondStep && !canProceedToReview)}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
```

---

### Task 6: Update Step3_Review Component

**File**: `src/components/forms/Step3_Review.tsx`

**Major Changes**:
1. ✅ Display tournament-level info (name, date, tournament_type)
2. ✅ Display all saved matches in a table format
3. ✅ Remove single-match metrics display
4. ✅ Add summary statistics (optional enhancement)

**Props Interface**:
```typescript
interface Step3_ReviewProps {
  matchTypes: MatchTypeDTO[];
  tournamentTypes: TournamentTypeDTO[];
  matches: MatchDataViewModel[];
}
```

**Component Implementation**:
```typescript
export default function Step3_Review({ 
  matchTypes, 
  tournamentTypes,
  matches 
}: Step3_ReviewProps) {
  const form = useFormContext<AddTournamentFormViewModel>();
  const values = form.getValues();

  const selectedTournamentType = tournamentTypes.find(
    (type) => type.id.toString() === values.tournament_type_id
  );

  // Helper function to get match type name
  const getMatchTypeName = (matchTypeId: string) => {
    const matchType = matchTypes.find((type) => type.id.toString() === matchTypeId);
    return matchType?.name || "Unknown";
  };

  return (
    <div className="space-y-6">
      {/* Tournament Information Card */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Tournament Information</h3>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-sm font-medium text-muted-foreground">Tournament Name</dt>
            <dd className="text-sm font-semibold">{values.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm font-medium text-muted-foreground">Date</dt>
            <dd className="text-sm font-semibold">
              {values.date ? format(values.date, "PPP") : "-"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm font-medium text-muted-foreground">Tournament Type</dt>
            <dd className="text-sm font-semibold">
              {selectedTournamentType?.name || "-"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Matches Table Card */}
      <div className="rounded-lg border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Matches</h3>
          <span className="text-sm text-muted-foreground">
            {matches.length} {matches.length === 1 ? "match" : "matches"}
          </span>
        </div>

        {matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matches added yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-3 font-medium text-muted-foreground">#</th>
                  <th className="pb-3 font-medium text-muted-foreground">Match Type</th>
                  <th className="pb-3 font-medium text-muted-foreground">Opponent</th>
                  <th className="pb-3 font-medium text-muted-foreground">Placement</th>
                  <th className="pb-3 font-medium text-muted-foreground text-right">Avg</th>
                  <th className="pb-3 font-medium text-muted-foreground text-right">1st 9</th>
                  <th className="pb-3 font-medium text-muted-foreground text-right">CO%</th>
                  <th className="pb-3 font-medium text-muted-foreground text-right">180s</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {matches.map((match, index) => (
                  <tr key={index} className="hover:bg-muted/50">
                    <td className="py-3 text-muted-foreground">{index + 1}</td>
                    <td className="py-3 font-medium">
                      {getMatchTypeName(match.match_type_id)}
                    </td>
                    <td className="py-3">
                      {match.opponent_name || <span className="text-muted-foreground">-</span>}
                    </td>
                    <td className="py-3">{match.final_placement}</td>
                    <td className="py-3 text-right font-mono">
                      {match.average_score.toFixed(2)}
                    </td>
                    <td className="py-3 text-right font-mono">
                      {match.first_nine_avg.toFixed(2)}
                    </td>
                    <td className="py-3 text-right font-mono">
                      {match.checkout_percentage.toFixed(1)}%
                    </td>
                    <td className="py-3 text-right font-mono">
                      {match.score_180_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Optional: Summary Statistics Card */}
      {matches.length > 1 && (
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Overall Statistics</h3>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Avg Score</dt>
              <dd className="mt-1 text-2xl font-bold">
                {(
                  matches.reduce((sum, m) => sum + m.average_score, 0) / matches.length
                ).toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Total 180s</dt>
              <dd className="mt-1 text-2xl font-bold">
                {matches.reduce((sum, m) => sum + m.score_180_count, 0)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Best Leg</dt>
              <dd className="mt-1 text-2xl font-bold">
                {Math.min(...matches.map((m) => m.best_leg))} darts
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">High Finish</dt>
              <dd className="mt-1 text-2xl font-bold">
                {Math.max(...matches.map((m) => m.high_finish))}
              </dd>
            </div>
          </dl>
        </div>
      )}

      {/* Info Banner */}
      <div className="rounded-lg bg-muted p-4">
        <p className="text-sm text-muted-foreground">
          Review your tournament and all matches above. You can add more matches or submit to save.
        </p>
      </div>
    </div>
  );
}
```

**Alternative: Expandable Match Cards** (User-friendly for mobile):
```typescript
{/* Alternative to table: Match cards */}
<div className="space-y-3">
  {matches.map((match, index) => (
    <div 
      key={index} 
      className="rounded-lg border bg-muted/50 p-4 hover:bg-muted transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold">Match {index + 1}</h4>
          <p className="text-sm text-muted-foreground">
            {getMatchTypeName(match.match_type_id)}
          </p>
        </div>
        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
          Placement: {match.final_placement}
        </span>
      </div>
      
      {match.opponent_name && (
        <p className="text-sm mb-3">
          <span className="text-muted-foreground">vs</span>{" "}
          <span className="font-medium">{match.opponent_name}</span>
        </p>
      )}

      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Avg</dt>
          <dd className="font-mono font-semibold">{match.average_score.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">1st 9</dt>
          <dd className="font-mono font-semibold">{match.first_nine_avg.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">CO%</dt>
          <dd className="font-mono font-semibold">{match.checkout_percentage.toFixed(1)}%</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">180s</dt>
          <dd className="font-mono font-semibold">{match.score_180_count}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Best Leg</dt>
          <dd className="font-mono font-semibold">{match.best_leg}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">High Finish</dt>
          <dd className="font-mono font-semibold">{match.high_finish || "-"}</dd>
        </div>
      </dl>
    </div>
  ))}
</div>
```

**Recommendation**: Use **responsive design** - show table on larger screens (`hidden sm:block`) and cards on mobile (`block sm:hidden`).

---

### Task 7: Update AddTournamentForm Logic

**File**: `src/components/forms/AddTournamentForm.tsx`

**Key Logic Updates**:

#### 7.1 Handle "New Match" Button Click

```typescript
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
  setSavedMatches([...currentMatches, currentMatch]);

  // Remember the match_type_id
  const lastMatchTypeId = currentMatch.match_type_id;

  // Reset current_match fields (except match_type_id)
  form.setValue("current_match", {
    ...defaultMatchValues,
    match_type_id: lastMatchTypeId, // Pre-select same match type
  });

  // Clear validation errors
  form.clearErrors("current_match");

  // Stay on Step2 (currentStep remains 1)
  // Optional: Show toast notification
  console.log("Match saved! Add another or proceed to review.");
};
```

#### 7.2 Handle "Next" Button from Step2 to Step3

```typescript
/**
 * Validates current match and moves to Step3
 * If current match has data, automatically save it
 */
const handleNextFromStep2 = async () => {
  // Check if current match has any data entered
  const currentMatch = form.getValues("current_match");
  const hasMatchData = currentMatch.match_type_id !== "" || 
                       currentMatch.average_score > 0 ||
                       currentMatch.opponent_name !== "";

  if (hasMatchData) {
    // Validate current match
    const isValid = await form.trigger("current_match");
    
    if (!isValid) {
      return; // Show validation errors
    }

    // Save current match to array if not already saved
    const currentMatches = form.getValues("matches");
    const isDuplicate = currentMatches.some(
      (m) => JSON.stringify(m) === JSON.stringify(currentMatch)
    );

    if (!isDuplicate) {
      form.setValue("matches", [...currentMatches, currentMatch]);
      setSavedMatches([...currentMatches, currentMatch]);
    }
  }

  // Check if at least one match exists
  const allMatches = form.getValues("matches");
  if (allMatches.length === 0) {
    // Show error: must have at least 1 match
    alert("Please add at least one match before proceeding to review.");
    return;
  }

  // Proceed to Step3
  setCurrentStep(2);
};
```

#### 7.3 Handle "Add Match" Button from Step3

```typescript
/**
 * Navigates back to Step2 to add another match
 * Current match form should be reset with last match_type_id pre-selected
 */
const handleAddMatchFromStep3 = () => {
  const savedMatches = form.getValues("matches");
  const lastMatchTypeId = savedMatches.length > 0 
    ? savedMatches[savedMatches.length - 1].match_type_id 
    : "";

  // Reset current match with pre-selected match type
  form.setValue("current_match", {
    ...defaultMatchValues,
    match_type_id: lastMatchTypeId,
  });

  // Navigate to Step2
  setCurrentStep(1);
};
```

#### 7.4 Handle Form Submission

```typescript
/**
 * Submits tournament with all matches to API
 * Calls OpenRouter with all match data
 * Navigates back to Step1 on success
 */
const handleSubmit = async (values: AddTournamentFormViewModel) => {
  setIsSubmitting(true);

  try {
    // Get all saved matches
    const allMatches = values.matches;

    if (allMatches.length === 0) {
      alert("Cannot submit tournament without matches.");
      return;
    }

    // Transform data for API
    const tournamentData = {
      name: values.name,
      date: format(values.date, "yyyy-MM-dd"),
      tournament_type_id: parseInt(values.tournament_type_id, 10),
      matches: allMatches.map((match) => ({
        match_type_id: parseInt(match.match_type_id, 10),
        opponent_id: null, // Not using opponent_id for now
        full_name: match.opponent_name || null,
        final_placement: match.final_placement,
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

    // POST to API
    const response = await fetch("/api/tournaments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tournamentData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create tournament");
    }

    const result = await response.json();
    console.log("Tournament created:", result);

    // Optional: Display AI feedback if available
    if (result.feedback) {
      alert(`Success! AI Feedback: ${result.feedback}`);
    }

    // Reset form and navigate to Step1
    form.reset({
      name: "",
      date: new Date(),
      tournament_type_id: "",
      current_match: defaultMatchValues,
      matches: [],
    });
    setSavedMatches([]);
    setCurrentStep(0);

    // Optional: Navigate to tournament list or detail page
    // window.location.href = `/tournaments/${result.id}`;

  } catch (error) {
    console.error("Error creating tournament:", error);
    alert((error as Error).message);
  } finally {
    setIsSubmitting(false);
  }
};
```

#### 7.5 Update Step Navigation Logic

```typescript
const handleNext = async () => {
  if (currentStep === 0) {
    // Step1 -> Step2: Validate Step1 fields
    const isValid = await form.trigger(["name", "date", "tournament_type_id"]);
    if (isValid) {
      setCurrentStep(1);
    }
  } else if (currentStep === 1) {
    // Step2 -> Step3: Use special handler
    await handleNextFromStep2();
  }
};

const handleBack = () => {
  if (currentStep > 0) {
    setCurrentStep(currentStep - 1);
  }
};
```

#### 7.6 Compute `canProceedToReview` Flag

```typescript
// Check if user can proceed from Step2 to Step3
const canProceedToReview = useMemo(() => {
  const matches = form.getValues("matches");
  return matches.length > 0; // At least 1 match saved
}, [form.watch("matches")]);
```

---

### Task 8: Update API Request Structure

**File**: `src/components/forms/AddTournamentForm.tsx`

**API Payload Structure** (matches new backend schema):

```typescript
interface CreateTournamentWithMatchesPayload {
  name: string;
  date: string; // YYYY-MM-DD format
  tournament_type_id: number;
  matches: {
    match_type_id: number;
    opponent_id: string | null;
    full_name: string | null;
    final_placement: number;
    average_score: number;
    first_nine_avg: number;
    checkout_percentage: number;
    score_60_count: number;
    score_100_count: number;
    score_140_count: number;
    score_180_count: number;
    high_finish: number;
    best_leg: number;
    worst_leg: number;
  }[];
}
```

**Note**: Backend API endpoint (`/api/tournaments`) needs to be updated to accept `matches` array instead of single `result` object.

---

### Task 9: Update OpenRouter Integration

**File**: Backend service that calls OpenRouter (likely in `src/pages/api/tournaments/index.ts`)

**Changes Needed**:

#### 9.1 Prepare Multi-Match Data for OpenRouter

```typescript
/**
 * Formats tournament with multiple matches for OpenRouter analysis
 */
function formatTournamentForAnalysis(tournament: {
  name: string;
  date: string;
  tournament_type_name: string;
  matches: MatchData[];
}): string {
  let prompt = `Analyze this darts tournament:\n\n`;
  prompt += `Tournament: ${tournament.name}\n`;
  prompt += `Date: ${tournament.date}\n`;
  prompt += `Type: ${tournament.tournament_type_name}\n`;
  prompt += `Total Matches: ${tournament.matches.length}\n\n`;

  prompt += `Match Details:\n`;
  tournament.matches.forEach((match, index) => {
    prompt += `\nMatch ${index + 1}:\n`;
    prompt += `- Match Type: ${match.match_type_name}\n`;
    if (match.opponent_name) {
      prompt += `- Opponent: ${match.opponent_name}\n`;
    }
    prompt += `- Placement: ${match.final_placement}\n`;
    prompt += `- Average Score: ${match.average_score}\n`;
    prompt += `- First Nine Average: ${match.first_nine_avg}\n`;
    prompt += `- Checkout %: ${match.checkout_percentage}%\n`;
    prompt += `- 180s: ${match.score_180_count}\n`;
    prompt += `- Best Leg: ${match.best_leg} darts\n`;
    prompt += `- High Finish: ${match.high_finish}\n`;
  });

  // Add overall statistics
  const avgScore = tournament.matches.reduce((sum, m) => sum + m.average_score, 0) / tournament.matches.length;
  const total180s = tournament.matches.reduce((sum, m) => sum + m.score_180_count, 0);
  const bestLeg = Math.min(...tournament.matches.map((m) => m.best_leg));

  prompt += `\nOverall Statistics:\n`;
  prompt += `- Average Score (all matches): ${avgScore.toFixed(2)}\n`;
  prompt += `- Total 180s: ${total180s}\n`;
  prompt += `- Best Leg: ${bestLeg} darts\n`;

  prompt += `\nProvide motivational feedback on this performance.`;

  return prompt;
}
```

#### 9.2 Update OpenRouter Call

```typescript
// In tournament creation endpoint
const messages: ChatMessage[] = [
  {
    role: "user",
    content: formatTournamentForAnalysis({
      name: tournament.name,
      date: tournament.date,
      tournament_type_name: tournamentTypeName,
      matches: matchesWithDetails, // Array of all matches with resolved names
    }),
  },
];

const response = await openRouterService.sendChat(messages);
const feedback = response.choices[0].message.content;
```

**Alternative: Structured JSON Input**

```typescript
// Send structured data for more consistent analysis
const messages: ChatMessage[] = [
  {
    role: "system",
    content: "You are a darts coach providing motivational feedback based on tournament performance data.",
  },
  {
    role: "user",
    content: JSON.stringify({
      instruction: "Analyze this darts tournament and provide motivational feedback",
      tournament: {
        name: tournament.name,
        date: tournament.date,
        type: tournamentTypeName,
        matches: tournament.matches.map((m, i) => ({
          match_number: i + 1,
          match_type: matchTypeNames[m.match_type_id],
          opponent: m.full_name,
          placement: m.final_placement,
          metrics: {
            average_score: m.average_score,
            first_nine_avg: m.first_nine_avg,
            checkout_percentage: m.checkout_percentage,
            score_180_count: m.score_180_count,
            best_leg: m.best_leg,
            high_finish: m.high_finish,
          },
        })),
      },
    }),
  },
];
```

---

### Task 10: Update Backend API Endpoint

**File**: `src/pages/api/tournaments/index.ts`

**Changes**:

#### 10.1 Update Request Schema Validation

```typescript
// Update Zod schema to accept multiple matches
const createTournamentWithMatchesSchema = z.object({
  name: z.string().min(1).max(255),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tournament_type_id: z.number().int().positive().optional(),
  matches: z.array(
    z.object({
      match_type_id: z.number().int().positive(),
      opponent_id: z.string().uuid().nullable().optional(),
      full_name: z.string().max(255).nullable().optional(),
      final_placement: z.number().int().min(1),
      average_score: z.number().nonnegative(),
      first_nine_avg: z.number().nonnegative(),
      checkout_percentage: z.number().min(0).max(100),
      score_60_count: z.number().int().min(0),
      score_100_count: z.number().int().min(0),
      score_140_count: z.number().int().min(0),
      score_180_count: z.number().int().min(0),
      high_finish: z.number().int().min(0).max(170),
      best_leg: z.number().int().min(9),
      worst_leg: z.number().int().min(9),
    })
  ).min(1, "At least one match is required"),
});
```

#### 10.2 Update Service Call

```typescript
// Create tournament
const { data: tournament, error: tournamentError } = await supabase
  .from("tournaments")
  .insert({
    user_id: userId,
    name: validatedData.name,
    date: validatedData.date,
    tournament_type_id: validatedData.tournament_type_id || 1,
  })
  .select("id, created_at")
  .single();

if (tournamentError || !tournament) {
  throw new Error("Failed to create tournament");
}

// Insert all matches
const matchInserts = validatedData.matches.map((match) => ({
  tournament_id: tournament.id,
  match_type_id: match.match_type_id,
  opponent_id: match.opponent_id || null,
  full_name: match.full_name || null,
  final_placement: match.final_placement,
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
}));

const { error: matchesError } = await supabase
  .from("tournament_match_results")
  .insert(matchInserts);

if (matchesError) {
  // Rollback: delete tournament if matches fail
  await supabase.from("tournaments").delete().eq("id", tournament.id);
  throw new Error("Failed to create match results");
}

// Call OpenRouter with all match data
const feedback = await generateFeedbackForTournament(tournament.id, validatedData.matches);
```

---

## Implementation Order

1. ✅ **Update Type Definitions** (`AddTournamentForm.tsx`)
   - Add `MatchDataViewModel` interface
   - Update `AddTournamentFormViewModel`
   - Update validation schemas

2. ✅ **Fetch Tournament Types** (`AddTournamentForm.tsx`)
   - Add API call to `/api/tournament-types`
   - Add state management

3. ✅ **Update Step1_BasicInfo**
   - Remove `match_type_id` field
   - Add `tournament_type_id` field
   - Update props interface

4. ✅ **Update Step2_Metrics**
   - Add `match_type_id` field (from Step1)
   - Add `opponent_name` field
   - Update all field paths to `current_match.*`
   - Add "New Match" button

5. ✅ **Update FormControls**
   - Add `onAddMatch` prop
   - Add "Add Match" button on Step3
   - Update button logic

6. ✅ **Update Step3_Review**
   - Display tournament info
   - Display matches table/cards
   - Add summary statistics

7. ✅ **Update Form Logic** (`AddTournamentForm.tsx`)
   - Implement `handleNewMatch`
   - Implement `handleNextFromStep2`
   - Implement `handleAddMatchFromStep3`
   - Update `handleSubmit` for multiple matches
   - Update navigation logic

8. ✅ **Update Backend API** (`src/pages/api/tournaments/index.ts`)
   - Update validation schema
   - Handle multiple match inserts
   - Update OpenRouter integration

9. ✅ **Test End-to-End**
   - Test adding single match
   - Test adding multiple matches
   - Test validation
   - Test form submission
   - Test OpenRouter feedback

---

## Validation Rules

### Step1 Validation
- `name`: Required, min 1 char, max 255 chars
- `date`: Required, valid date
- `tournament_type_id`: Required

### Step2 Validation (per match)
- `match_type_id`: Required
- `opponent_name`: Optional, max 255 chars
- `final_placement`: Required, integer >= 1
- `average_score`: Required, >= 0
- `first_nine_avg`: Required, >= 0
- `checkout_percentage`: Required, 0-100
- `score_60_count`: Required, integer >= 0
- `score_100_count`: Required, integer >= 0
- `score_140_count`: Required, integer >= 0
- `score_180_count`: Required, integer >= 0
- `high_finish`: Required, integer 0-170
- `best_leg`: Required, integer >= 9
- `worst_leg`: Required, integer >= 9

### Form-Level Validation
- Must have at least 1 match in `matches` array before proceeding to Step3

---

## Edge Cases & Error Handling

### 1. User Clicks "Next" on Step2 Without Saving Match
**Behavior**: Automatically save current match if it has data, then proceed to Step3

### 2. User Clicks "New Match" With Invalid Data
**Behavior**: Show validation errors, don't clear form, don't add to matches array

### 3. User Clicks "Back" from Step3 to Step2
**Behavior**: Navigate to Step2 with current_match cleared (or last match loaded for editing - future enhancement)

### 4. API Fails During Submission
**Behavior**: Show error message, keep user on Step3, allow retry

### 5. OpenRouter Fails
**Behavior**: Still save tournament to database, show success message without feedback

### 6. User Refreshes Page Mid-Flow
**Behavior**: All form data is lost (no persistence). Consider adding localStorage backup in future.

---

## UI/UX Enhancements

### Step2 Improvements
- Show count of saved matches: `"Matches saved: 3"`
- Add visual feedback when match is saved (toast notification)
- Consider showing list of saved matches in Step2 (collapsed view)

### Step3 Improvements
- Add expand/collapse for match details
- Add sorting capability for matches table
- Add basic statistics dashboard
- Responsive design: table on desktop, cards on mobile

### Loading States
- Show spinner when fetching tournament types
- Show spinner when fetching match types
- Show spinner during form submission
- Disable buttons during async operations

### Error States
- Inline validation errors on fields
- Summary error messages at form level
- Retry buttons for failed API calls

---

## Testing Checklist

### Unit Tests
- [ ] Form validation schemas work correctly
- [ ] `handleNewMatch` adds match to array
- [ ] `handleNextFromStep2` validates before proceeding
- [ ] Field path updates (`current_match.*`) work correctly

### Integration Tests
- [ ] Can complete full flow: Step1 → Step2 (add 1 match) → Step3 → Submit
- [ ] Can add multiple matches: Step1 → Step2 (add 3 matches) → Step3 → Submit
- [ ] Can add match from Step3: Step3 → Add Match → Step2 → add match → Step3
- [ ] Validation prevents invalid data submission
- [ ] API receives correct payload structure

### E2E Tests
- [ ] Full tournament creation flow
- [ ] OpenRouter feedback is displayed
- [ ] User is navigated to correct page after submission
- [ ] Error messages display correctly

---

## Future Enhancements (Out of Scope)

1. **Edit/Delete Matches**: Allow editing or deleting saved matches before submission
2. **Match Reordering**: Drag-and-drop to reorder matches
3. **Form Persistence**: Save form state to localStorage
4. **Bulk Import**: Import matches from CSV/Excel
5. **Match Templates**: Save common match configurations
6. **Opponent Autocomplete**: Search existing users for opponent_id
7. **Statistics Dashboard**: Advanced analytics on Step3

---

## Dependencies

### New NPM Packages
None required - using existing dependencies:
- `react-hook-form`
- `zod`
- `date-fns`
- `lucide-react`
- `@shadcn/ui` components

### API Endpoints Required
- ✅ `GET /api/tournament-types` (already planned in backend)
- ✅ `GET /api/match-types` (already exists)
- ✅ `POST /api/tournaments` (needs update to accept `matches` array)

---

## Files Changed Summary

### New Files
None

### Modified Files
1. `src/components/forms/AddTournamentForm.tsx` (major changes)
2. `src/components/forms/Step1_BasicInfo.tsx` (field changes)
3. `src/components/forms/Step2_Metrics.tsx` (major changes)
4. `src/components/forms/Step3_Review.tsx` (complete redesign)
5. `src/components/forms/FormControls.tsx` (add button)
6. `src/pages/api/tournaments/index.ts` (backend - accept multiple matches)
7. `src/types.ts` (no changes needed - already updated)

---

## Implementation Time Estimate

- Task 1-3 (Type updates, API calls, Step1): **2 hours**
- Task 4 (Step2 updates): **3 hours**
- Task 5 (FormControls): **1 hour**
- Task 6 (Step3 redesign): **3 hours**
- Task 7 (Form logic): **4 hours**
- Task 8-10 (API/Backend updates): **3 hours**
- Testing & bug fixes: **4 hours**

**Total: ~20 hours** (2.5 days for a single developer)

---

## Questions for Future Clarification

1. Should we persist form state to localStorage to prevent data loss on refresh?
2. Do we want to allow editing/deleting matches before submission?
3. Should Step3 show a "print" or "export" option for tournament summary?
4. Do we want to add match notes/comments field?
5. Should we add a confirmation dialog before "Submit"?

---

**End of Implementation Plan**

This plan is ready for implementation by a frontend developer. All requirements, edge cases, and implementation details are documented.

