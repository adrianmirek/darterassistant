# View Implementation Plan: Add Tournament

## 1. Overview
This document outlines the implementation plan for the "Add Tournament" view. This view allows authenticated users to record the results of a darts tournament they participated in. The interface will be a multi-step form to guide the user through entering tournament details, performance metrics, and leg information, ensuring a user-friendly experience while capturing comprehensive data.

## 2. View Routing
- **Path**: `/tournaments/new`
- **Access**: This is a protected route, accessible only to authenticated users.

## 3. Component Structure
The view will be composed of a main client-side React component that manages the form state and steps.

```
/src/pages/tournaments/new.astro
└── /src/components/forms/AddTournamentForm.tsx (client:load)
    ├── StepperNavigation.tsx (Visual indicator for steps)
    ├── form (React Hook Form Provider)
    │   ├── Step1_BasicInfo.tsx (Conditional render)
    │   │   ├── Input (Shadcn UI)
    │   │   ├── DatePicker (Custom/Shadcn UI)
    │   │   └── Select (Shadcn UI)
    │   ├── Step2_Metrics.tsx (Conditional render)
    │   │   └── Input (Shadcn UI, for all numeric metrics)
    │   ├── Step3_Review.tsx (Conditional render)
    │   │   └── DataSummary.tsx (Read-only display of entered data)
    │   └── FormControls.tsx
    │       ├── Button ("Back")
    │       └── Button ("Next" / "Submit")
    └── Toaster.tsx (For global success/error notifications)
```

## 4. Component Details

### AddTournamentForm.tsx
- **Component Description**: The primary stateful component that orchestrates the entire form. It manages the current step, form data using `react-hook-form`, and handles the final API submission.
- **Main Elements**: A `<form>` element wrapping the conditionally rendered step components and `FormControls`. It will also use a `FormProvider` from `react-hook-form`.
- **Handled Interactions**:
    - Fetches match types on initial render.
    - Manages step transitions (next/back).
    - Triggers validation for each step.
    - Handles the final form submission to the API.
- **Types**: `AddTournamentFormViewModel`, `MatchTypeDTO`, `CreateTournamentCommand`
- **Props**: None.

### StepperNavigation.tsx
- **Component Description**: A simple, presentational component that displays the three steps ("Basic Info", "Metrics", "Review") and highlights the current one.
- **Main Elements**: A container (`div` or `nav`) with styled elements (e.g., `div` or `span`) for each step.
- **Handled Interactions**: None.
- **Types**: None.
- **Props**:
    - `currentStep: number`
    - `steps: string[]`

### Step1_BasicInfo.tsx
- **Component Description**: Renders form fields for the first step: tournament name, date, and match type.
- **Main Elements**: `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` (from Shadcn UI) wrapping `Input`, `DatePicker`, and `Select` components.
- **Handled Interactions**: User input for the form fields.
- **Validation Conditions**:
    - `name`: Required, string, min 3 characters.
    - `date`: Required, must be a valid date, cannot be in the future.
    - `match_type_id`: Required.
- **Types**: Uses `react-hook-form`'s `useFormContext`.
- **Props**: None (relies on form context).

### Step2_Metrics.tsx
- **Component Description**: Renders numeric input fields for core performance metrics.
- **Main Elements**: A grid of `FormField` components wrapping `Input` elements with `type="number"`.
- **Handled Interactions**: User input for numeric scores and statistics.
- **Validation Conditions**:
    - All fields are required numbers.
    - `final_placement`: Must be an integer > 0.
    - `average_score`, `first_nine_avg`: Number between 0 and 180.
    - `checkout_percentage`: Number between 0 and 100.
    - `score_*_count`: Integer >= 0.
    - `high_finish`: Integer between 2 and 170 (or 0 if no high finish).
- **Types**: Uses `react-hook-form`'s `useFormContext`.
- **Props**: None.

### Step3_Review.tsx
- **Component Description**: Displays all the data entered in previous steps in a read-only format for final user confirmation.
- **Main Elements**: A series of label-value pairs to present the data.
- **Handled Interactions**: None.
- **Validation Conditions**: None.
- **Types**: Uses `react-hook-form`'s `useFormContext` to get values.
- **Props**: None.

### FormControls.tsx
- **Component Description**: Renders the "Back", "Next", and "Submit" buttons based on the current step.
- **Main Elements**: Two `Button` components.
- **Handled Interactions**:
    - `onClick` for "Back": Navigates to the previous step.
    - `onClick` for "Next": Triggers validation and navigates to the next step.
    - `type="submit"` for "Submit": Initiates the final form submission.
- **Types**: None.
- **Props**:
    - `currentStep: number`
    - `isSubmitting: boolean`
    - `onBack: () => void`

## 5. Types

### DTOs (from `src/types.ts`)
- `MatchTypeDTO`: For the list of match types fetched from `GET /api/match-types`.
- `CreateTournamentCommand`: The request body for `POST /api/tournaments`.
- `CreateTournamentResponseDTO`: The success response from `POST /api/tournaments`.

### ViewModel (New type for the form)
A Zod schema will be created to define the form's shape and validation rules. This will be inferred into a TypeScript type.

```typescript
// Zod schema will be used to infer this type
export type AddTournamentFormViewModel = {
  // Step 1
  name: string;
  date: Date;
  match_type_id: string; // From select, parsed to number on submit

  // Step 2
  final_placement: number;
  average_score: number;
  first_nine_avg: number;
  checkout_percentage: number;
  score_60_count: number;
  score_100_count: number;
  score_140_count: number;
  score_180_count: number;
  high_finish: number;

  // Step 2 (Additional fields from PRD, placed in step 2)
  best_leg: number;
  worst_leg: number;
};
```

## 6. State Management
- **UI State**: Local state (`useState`) within `AddTournamentForm.tsx` will manage the `currentStep`, loading states (`isSubmitting`, `isLoadingMatchTypes`), and API errors.
- **Form State**: Handled entirely by `react-hook-form` using the `useForm` hook. It will be initialized with default values and its state will be defined by the `AddTournamentFormViewModel`. A `ZodResolver` will connect our validation schema to the form.
- **Server Cache State**: For fetching match types, a simple `useEffect` fetch is sufficient. For a more robust solution, `SWR` or `TanStack Query` could be used but is not required for this view's initial implementation.

## 7. API Integration
1.  **Fetch Match Types**:
    - **Endpoint**: `GET /api/match-types`
    - **Trigger**: On initial component mount of `AddTournamentForm.tsx`.
    - **Response Type**: `MatchTypeDTO[]`
    - **Usage**: The response array is stored in state and used to populate the `Select` component in `Step1_BasicInfo`.

2.  **Create Tournament**:
    - **Endpoint**: `POST /api/tournaments`
    - **Trigger**: On form submission from the final step.
    - **Request Type**: `CreateTournamentCommand`
    - **Action**: The flat data from the `AddTournamentFormViewModel` must be transformed into the nested `CreateTournamentCommand` structure before sending.
    - **Response Type**: `CreateTournamentResponseDTO`

## 8. User Interactions
- **Form Filling**: Users type or select values for each field.
- **Step Navigation**:
    - Clicking "Next" validates the current step's fields. If valid, the view transitions to the next step. If invalid, error messages appear next to the respective fields.
    - Clicking "Back" moves to the previous step without validation.
- **Submission**: Clicking "Submit" on the final step disables the button, shows a loading indicator, and sends the data to the API.
- **Feedback**:
    - On success, a toast notification appears ("Tournament saved successfully!"), and the user is redirected to the dashboard (`/`).
    - On failure, an error toast appears with a relevant message.

## 9. Conditions and Validation
- **Conditional Rendering**: The components `Step1_BasicInfo`, `Step2_Metrics`, and `Step3_Review` are rendered based on the `currentStep` state variable.
- **Form Field Validation**:
    - **`name`**: Must be a non-empty string.
    - **`date`**: Must be a valid date and not in the future.
    - **`match_type_id`**: Must be selected.
    - **All numeric fields**: Must be valid numbers. `final_placement`, `score_*_count` must be non-negative integers. `average_score` and `first_nine_avg` must be within a realistic range (e.g., 0-180). `checkout_percentage` must be between 0-100. `high_finish` must be between 2-170 (inclusive) or 0. `best_leg`/`worst_leg` must be a positive integer (e.g., >= 9 for a 501 game).

## 10. Error Handling
- **API Fetch Error (Match Types)**: If `GET /api/match-types` fails, an error message will be displayed in place of the select input, and the form will be disabled until the data can be loaded.
- **Client-Side Validation Error**: Handled automatically by `react-hook-form` and `zod`, displaying inline error messages under each invalid field.
- **API Submission Error**:
    - `400 Bad Request`: A generic error toast is shown ("Invalid data. Please review your entries.").
    - `401 Unauthorized`: The Astro middleware should intercept this and redirect to `/login`.
    - `5xx Server Error`: A generic error toast is shown ("An unexpected error occurred. Please try again later.").
- **Network Error**: The `fetch` call will be wrapped in a `try...catch` block to handle network failures, displaying an appropriate error toast.

## 11. Implementation Steps
1.  **Create File Structure**: Create the new files: `src/pages/tournaments/new.astro` and `src/components/forms/AddTournamentForm.tsx`.
2.  **Setup Astro Page**: In `new.astro`, import and render the `AddTournamentForm` component with a `client:load` directive. Ensure the page uses the main `Layout` and is protected.
3.  **Implement `AddTournamentForm`**:
    - Set up the main component structure with `react-hook-form` (`useForm`, `FormProvider`).
    - Implement the stepper logic with a `useState` for `currentStep`.
4.  **Define Zod Schema**: Create a Zod schema that defines the fields and validation rules for the `AddTournamentFormViewModel`. Use the `ZodResolver` with `useForm`.
5.  **Build Step Components**: Create the three step components (`Step1_BasicInfo`, `Step2_Metrics`, `Step3_Review`). Use Shadcn UI form components and connect them to the `react-hook-form` context.
6.  **Fetch Match Types**: Add a `useEffect` in `AddTournamentForm` to call `GET /api/match-types` and store the result in state. Pass the data to the `Select` component in `Step1`.
7.  **Implement Form Controls**: Create the `FormControls` component to handle back/next/submit logic. The "Next" button should trigger `form.trigger()` for the fields in the current step.
8.  **Implement Submission Logic**:
    - Create an `onSubmit` function that will be passed to the `<form>` element.
    - Inside `onSubmit`, transform the flat form data into the nested `CreateTournamentCommand` DTO.
    - Make the `POST /api/tournaments` request.
9.  **Add User Feedback**:
    - Integrate a toaster library (like `sonner` which is part of Shadcn UI).
    - Display loading states on buttons during submission.
    - Show success/error toasts based on the API response.
    - Implement redirection on success using Astro's navigation utilities (`Astro.redirect` from server-side or `window.location` client-side).
10. **Styling and Final Touches**: Ensure the layout is responsive and follows the application's design system using Tailwind CSS. Add accessibility attributes where needed.
