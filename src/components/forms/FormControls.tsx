import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface FormControlsProps {
  currentStep: number;
  totalSteps: number;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export default function FormControls({
  currentStep,
  totalSteps,
  isSubmitting,
  onBack,
  onNext,
  onSubmit,
}: FormControlsProps) {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

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

      {isLastStep ? (
        <Button type="submit" onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
      ) : (
        <Button type="button" onClick={onNext} disabled={isSubmitting}>
          Next
        </Button>
      )}
    </div>
  );
}

