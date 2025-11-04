import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form } from '@/components/ui/form';
import { Toaster, toast } from 'sonner';
import StepperNavigation from './StepperNavigation';
import Step1_BasicInfo from './Step1_BasicInfo';
import Step2_Metrics from './Step2_Metrics';
import Step3_Review from './Step3_Review';
import FormControls from './FormControls';
import type { 
  MatchTypeDTO, 
  CreateTournamentCommand, 
  CreateTournamentResponseDTO 
} from '@/types';

// Zod schema for form validation
const addTournamentFormSchema = z.object({
  // Step 1: Basic Info
  name: z.string().min(3, 'Tournament name must be at least 3 characters'),
  date: z.date({
    required_error: 'Tournament date is required',
  }).refine((date) => date <= new Date(), {
    message: 'Tournament date cannot be in the future',
  }),
  match_type_id: z.string().min(1, 'Match type is required'),

  // Step 2: Metrics
  final_placement: z.number().int().positive('Final placement must be a positive number'),
  average_score: z.number()
    .min(0, 'Average score cannot be negative')
    .max(180, 'Average score cannot exceed 180'),
  first_nine_avg: z.number()
    .min(0, 'First nine average cannot be negative')
    .max(180, 'First nine average cannot exceed 180'),
  checkout_percentage: z.number()
    .min(0, 'Checkout percentage cannot be negative')
    .max(100, 'Checkout percentage cannot exceed 100'),
  score_60_count: z.number().int().nonnegative('Count cannot be negative'),
  score_100_count: z.number().int().nonnegative('Count cannot be negative'),
  score_140_count: z.number().int().nonnegative('Count cannot be negative'),
  score_180_count: z.number().int().nonnegative('Count cannot be negative'),
  high_finish: z.number()
    .int()
    .refine((val) => val === 0 || (val >= 2 && val <= 170), {
      message: 'High finish must be 0 or between 2 and 170',
    }),
  best_leg: z.number().int().min(9, 'Best leg must be at least 9 darts'),
  worst_leg: z.number().int().min(9, 'Worst leg must be at least 9 darts'),
});

export type AddTournamentFormViewModel = z.infer<typeof addTournamentFormSchema>;

const STEPS = ['Basic Info', 'Metrics', 'Review'];

export default function AddTournamentForm() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [matchTypes, setMatchTypes] = useState<MatchTypeDTO[]>([]);
  const [isLoadingMatchTypes, setIsLoadingMatchTypes] = useState(true);
  const [matchTypesError, setMatchTypesError] = useState<string | null>(null);

  const form = useForm<AddTournamentFormViewModel>({
    resolver: zodResolver(addTournamentFormSchema),
    defaultValues: {
      name: '',
      match_type_id: '',
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
    },
  });

  // Fetch match types on mount
  useEffect(() => {
    const fetchMatchTypes = async () => {
      try {
        setIsLoadingMatchTypes(true);
        setMatchTypesError(null);
        
        const response = await fetch('/api/match-types');
        
        if (!response.ok) {
          throw new Error('Failed to load match types');
        }
        
        const data: MatchTypeDTO[] = await response.json();
        setMatchTypes(data);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        setMatchTypesError(errorMessage);
        toast.error('Failed to load match types', {
          description: errorMessage,
        });
      } finally {
        setIsLoadingMatchTypes(false);
      }
    };

    fetchMatchTypes();
  }, []);

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = async () => {
    // Validate current step fields before proceeding
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fieldsToValidate);

    if (isValid && currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
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

  const getFieldsForStep = (step: number): (keyof AddTournamentFormViewModel)[] => {
    switch (step) {
      case 0:
        return ['name', 'date', 'match_type_id'];
      case 1:
        return [
          'final_placement',
          'average_score',
          'first_nine_avg',
          'checkout_percentage',
          'score_60_count',
          'score_100_count',
          'score_140_count',
          'score_180_count',
          'high_finish',
          'best_leg',
          'worst_leg',
        ];
      default:
        return [];
    }
  };

  const onSubmit = async (data: AddTournamentFormViewModel) => {
    // Double-check: Only submit if we're on the final step (Review) and explicitly allowed
    if (currentStep !== STEPS.length - 1 || !canSubmit) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Transform flat form data to nested CreateTournamentCommand structure
      const command: CreateTournamentCommand = {        
        name: data.name,
        date: data.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        result: {
          match_type_id: parseInt(data.match_type_id, 10),
          average_score: data.average_score,
          first_nine_avg: data.first_nine_avg,
          checkout_percentage: data.checkout_percentage,
          score_60_count: data.score_60_count,
          score_100_count: data.score_100_count,
          score_140_count: data.score_140_count,
          score_180_count: data.score_180_count,
          high_finish: data.high_finish,
          best_leg: data.best_leg,
          worst_leg: data.worst_leg,
        },
      };

      const response = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error('Invalid data. Please review your entries.');
        }
        if (response.status >= 500) {
          throw new Error('An unexpected error occurred. Please try again later.');
        }
        throw new Error('Failed to save tournament');
      }

      const result: CreateTournamentResponseDTO = await response.json();

      toast.success('Tournament saved successfully!', {
        description: `Tournament "${data.name}" has been recorded.`,
      });

      // Redirect to dashboard after successful submission
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error('Failed to save tournament', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-8">
        <StepperNavigation currentStep={currentStep} steps={STEPS} />
        
        <Form {...form}>
          <form onSubmit={handleFormSubmit} className="space-y-8">
            {currentStep === 0 && (
              <Step1_BasicInfo
                matchTypes={matchTypes}
                isLoadingMatchTypes={isLoadingMatchTypes}
                matchTypesError={matchTypesError}
              />
            )}
            
            {currentStep === 1 && <Step2_Metrics />}
            
            {currentStep === 2 && <Step3_Review matchTypes={matchTypes} />}
            
            <FormControls
              currentStep={currentStep}
              totalSteps={STEPS.length}
              isSubmitting={isSubmitting}
              onBack={handleBack}
              onNext={handleNext}
              onSubmit={handleSubmitClick}
            />
          </form>
        </Form>
      </div>
      
      <Toaster richColors position="top-right" />
    </>
  );
}

