import { cn } from "@/lib/utils";

interface StepperNavigationProps {
  currentStep: number;
  steps: string[];
}

export default function StepperNavigation({ currentStep, steps }: StepperNavigationProps) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => (
          <li key={step} className="relative flex-1 flex flex-col items-center">
            {/* Connecting Line - positioned absolutely behind the circles */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "absolute top-5 left-1/2 h-0.5 w-full transition-colors",
                  index < currentStep ? "bg-primary" : "bg-muted"
                )}
                aria-hidden="true"
              />
            )}

            {/* Step Circle */}
            <div className="relative z-10 flex items-center justify-center">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                  index < currentStep && "border-primary bg-primary text-primary-foreground",
                  index === currentStep && "border-primary bg-background text-primary",
                  index > currentStep && "border-muted bg-background text-muted-foreground"
                )}
              >
                {index < currentStep ? (
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
                )}
              </div>
            </div>

            {/* Step Label */}
            <div className="mt-3 text-center">
              <p
                className={cn(
                  "text-sm font-medium transition-colors",
                  index <= currentStep ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
