import { useState, useCallback } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Custom hook for managing password visibility toggle
 * @param initialState - Initial visibility state (default: false)
 * @returns Object with visibility state, toggle function, input type, and icon component
 */
export function usePasswordToggle(initialState = false) {
  const [isVisible, setIsVisible] = useState(initialState);

  const toggle = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  const inputType = isVisible ? "text" : "password";
  const Icon = isVisible ? EyeOff : Eye;

  return {
    isVisible,
    toggle,
    inputType,
    Icon,
  };
}
