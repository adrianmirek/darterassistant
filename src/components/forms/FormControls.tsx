import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/hooks/I18nProvider";

interface FormControlsProps {
  currentStep: number;
  totalSteps: number;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  onAddMatch?: () => void;
}

export default function FormControls({
  currentStep,
  totalSteps,
  isSubmitting,
  onBack,
  onNext,
  onSubmit,
  onAddMatch,
}: FormControlsProps) {
  const t = useTranslation();
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="flex justify-between gap-4 pt-6 border-t">
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        disabled={isFirstStep || isSubmitting}
        data-testid="back-button"
      >
        {t("common.back")}
      </Button>

      <div className="flex gap-4">
        {/* Add Match button - only visible on Step3 (Review) */}
        {isLastStep && onAddMatch && (
          <Button
            type="button"
            variant="secondary"
            onClick={onAddMatch}
            disabled={isSubmitting}
            data-testid="add-match-button"
          >
            {t("tournaments.addMatch")}
          </Button>
        )}

        {/* Submit button - only visible on Step3 */}
        {isLastStep ? (
          <Button
            type="submit"
            variant="gradient"
            onClick={onSubmit}
            disabled={isSubmitting}
            data-testid="submit-button"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting ? t("tournaments.creating") : t("common.submit")}
          </Button>
        ) : (
          /* Next button - visible on Step1 and Step2 */
          <Button type="button" variant="gradient" onClick={onNext} disabled={isSubmitting} data-testid="next-button">
            {t("common.next")}
          </Button>
        )}
      </div>
    </div>
  );
}
