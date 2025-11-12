import type { SupabaseClient } from "@/db/supabase.client";
import type { LoginResponseDTO, RegisterResponseDTO, UserDTO, SessionDTO } from "@/types";

type AuthError = { message: string } | null;

/**
 * Register a new user
 */
export async function registerUser(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<{ data: RegisterResponseDTO | null; error: AuthError }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { data: null, error };
    }

    if (!data.session || !data.user) {
      return {
        data: null,
        error: { message: "No session returned from registration" },
      };
    }

    const userDTO: UserDTO = {
      id: data.user.id,
      email: data.user.email ?? "",
      created_at: data.user.created_at,
    };

    const sessionDTO: SessionDTO = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at || 0,
      user: userDTO,
    };

    const registerResponse: RegisterResponseDTO = {
      user: userDTO,
      session: sessionDTO,
    };

    return { data: registerResponse, error: null };
  } catch {
    // Registration error
    return {
      data: null,
      error: { message: "An unexpected error occurred during registration" },
    };
  }
}

/**
 * Authenticate user with email and password
 */
export async function loginUser(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<{ data: LoginResponseDTO | null; error: AuthError }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { data: null, error };
    }

    if (!data.session || !data.user) {
      return {
        data: null,
        error: { message: "No session returned from authentication" },
      };
    }

    const userDTO: UserDTO = {
      id: data.user.id,
      email: data.user.email ?? "",
      created_at: data.user.created_at,
    };

    const sessionDTO: SessionDTO = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at || 0,
      user: userDTO,
    };

    const loginResponse: LoginResponseDTO = {
      user: userDTO,
      session: sessionDTO,
    };

    return { data: loginResponse, error: null };
  } catch {
    // Login error
    return {
      data: null,
      error: { message: "An unexpected error occurred during login" },
    };
  }
}

/**
 * Sign out current user
 */
export async function logoutUser(supabase: SupabaseClient): Promise<{ error: AuthError }> {
  try {
    // Sign out with 'global' scope to clear all sessions across all devices
    const { error } = await supabase.auth.signOut({ scope: "global" });
    return { error };
  } catch {
    // Logout error
    return { error: { message: "An unexpected error occurred during logout" } };
  }
}

/**
 * Request password reset email
 */
export async function requestPasswordReset(
  supabase: SupabaseClient,
  email: string,
  redirectUrl: string
): Promise<{ error: AuthError }> {
  try {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    // Even if there's an error (e.g., email not found), we don't expose it
    // for security reasons. Just log it server-side.
    // Password reset request error (hidden from user)

    // Always return success to prevent email enumeration
    return { error: null };
  } catch {
    // Password reset request error
    // Still return success to maintain security
    return { error: null };
  }
}

/**
 * Get current session and user (securely authenticated)
 */
export async function getCurrentSession(
  supabase: SupabaseClient
): Promise<{ data: SessionDTO | null; error: AuthError }> {
  try {
    // First, authenticate the user with Supabase server
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      // AuthSessionMissingError is expected when user is not logged in
      if (userError.name === "AuthSessionMissingError") {
        return { data: null, error: null };
      }
      return { data: null, error: userError };
    }

    if (!user) {
      return { data: null, error: null };
    }

    // Now safely get session data (user is verified)
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return { data: null, error: sessionError };
    }

    const userDTO: UserDTO = {
      id: user.id,
      email: user.email ?? "",
      created_at: user.created_at,
    };

    const sessionDTO: SessionDTO = {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at || 0,
      user: userDTO,
    };

    return { data: sessionDTO, error: null };
  } catch {
    // Get session error
    return {
      data: null,
      error: { message: "An unexpected error occurred while getting session" },
    };
  }
}
