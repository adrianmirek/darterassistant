export type PasswordStrength = 'weak' | 'medium' | 'strong';

export interface PasswordStrengthResult {
  strength: PasswordStrength;
  score: number;
  color: string;
  width: string;
}

/**
 * Calculates password strength based on various criteria
 * @param password - The password to analyze
 * @returns PasswordStrengthResult with strength, score, color, and width
 */
export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  let score = 0;
  
  // Length criteria
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  
  // Character type criteria
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  let strength: PasswordStrength;
  if (score <= 2) {
    strength = 'weak';
  } else if (score <= 4) {
    strength = 'medium';
  } else {
    strength = 'strong';
  }

  return {
    strength,
    score,
    color: getStrengthColor(strength),
    width: getStrengthWidth(strength),
  };
}

/**
 * Gets the Tailwind color class for a given password strength
 * @param strength - The password strength level
 * @returns Tailwind CSS color class
 */
function getStrengthColor(strength: PasswordStrength): string {
  const colors: Record<PasswordStrength, string> = {
    weak: 'bg-red-500',
    medium: 'bg-yellow-500',
    strong: 'bg-green-500',
  };
  return colors[strength];
}

/**
 * Gets the Tailwind width class for a given password strength
 * @param strength - The password strength level
 * @returns Tailwind CSS width class
 */
function getStrengthWidth(strength: PasswordStrength): string {
  const widths: Record<PasswordStrength, string> = {
    weak: 'w-1/3',
    medium: 'w-2/3',
    strong: 'w-full',
  };
  return widths[strength];
}

