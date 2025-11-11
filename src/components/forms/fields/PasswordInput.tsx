import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { usePasswordToggle } from '@/lib/hooks/usePasswordToggle';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showToggle?: boolean;
}

/**
 * Reusable password input component with visibility toggle
 * Wraps the standard Input component with password show/hide functionality
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showToggle = true, ...props }, ref) => {
    const { inputType, toggle, Icon } = usePasswordToggle();

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={inputType}
          {...props}
        />
        {showToggle && (
          <button
            type="button"
            onClick={toggle}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
            aria-label={inputType === 'password' ? 'Show password' : 'Hide password'}
          >
            <Icon className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

