import { useCallback } from "react";

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
}

interface ForgotPasswordData {
  email: string;
}

interface ResetPasswordData {
  token: string;
  password: string;
}

/**
 * Custom hook providing authentication API methods
 * Centralizes all auth-related API calls with consistent error handling
 */
export function useAuthApi() {
  const login = useCallback(async (data: LoginData) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Login failed");
    }

    return result;
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Registration failed");
    }

    return result;
  }, []);

  const forgotPassword = useCallback(async (data: ForgotPasswordData) => {
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Failed to send reset email");
    }

    return result;
  }, []);

  const resetPassword = useCallback(async (data: ResetPasswordData) => {
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Password reset failed");
    }

    return result;
  }, []);

  return {
    login,
    register,
    forgotPassword,
    resetPassword,
  };
}
