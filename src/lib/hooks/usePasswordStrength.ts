import { useMemo } from 'react';
import { calculatePasswordStrength, type PasswordStrengthResult } from '@/lib/utils/password.utils';

/**
 * Custom hook for calculating password strength
 * Uses memoization to avoid unnecessary recalculations
 * @param password - The password to analyze
 * @returns PasswordStrengthResult or null if password is empty
 */
export function usePasswordStrength(password: string): PasswordStrengthResult | null {
  const strength = useMemo(() => {
    if (!password) return null;
    return calculatePasswordStrength(password);
  }, [password]);
  
  return strength;
}

