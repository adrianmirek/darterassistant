import { usePasswordStrength } from "@/lib/hooks/usePasswordStrength";

interface PasswordStrengthIndicatorProps {
  password: string;
}

/**
 * Reusable password strength indicator component
 * Displays a visual progress bar and text showing password strength
 */
export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strengthResult = usePasswordStrength(password);

  if (!strengthResult) return null;

  return (
    <div className="space-y-1">
      <div
        className="h-1.5 w-full bg-secondary rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={strengthResult.score}
        aria-valuemin={0}
        aria-valuemax={6}
        aria-label={`Password strength: ${strengthResult.strength}`}
      >
        <div className={`h-full transition-all duration-300 ${strengthResult.color} ${strengthResult.width}`} />
      </div>
      <p className="text-xs text-muted-foreground">
        Password strength: <span className="capitalize font-medium">{strengthResult.strength}</span>
      </p>
    </div>
  );
}
