import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerInstance } from "../db/supabase.client";
import type { UserDTO } from "../types";

/**
 * Protected routes that require authentication
 */
const PROTECTED_ROUTES = [
  "/", // Main page with AddTournamentForm (protected)
  "/api/tournaments", // Tournament API
  "/api/goals", // Goals API
];

/**
 * Public routes that should redirect to dashboard if authenticated
 */
const AUTH_ROUTES = ["/auth/login", "/auth/register", "/auth/forgot-password", "/auth/reset-password"];

/**
 * Check if route requires authentication
 */
function isProtectedRoute(pathname: string): boolean {
  // Exact match for root, prefix match for others
  if (pathname === "/") return true;
  return PROTECTED_ROUTES.slice(1).some((route) => pathname.startsWith(route));
}

/**
 * Check if route is an auth page
 */
function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some((route) => pathname.startsWith(route));
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, cookies, redirect, url } = context;
  const pathname = url.pathname;

  // Create Supabase client for this request
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Set default values in context
  context.locals.supabase = supabase;
  context.locals.user = null;
  context.locals.session = null;

  // Try to get current user (authenticates with Supabase server)
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      // AuthSessionMissingError is expected when user is not logged in
      // Only log other types of errors
      if (error.name !== "AuthSessionMissingError") {
        console.error("Error getting user in middleware:", error);
      }
    } else if (user) {
      // Get the session for token data (only after user is verified)
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Valid authenticated user exists
      context.locals.user = {
        id: user.id,
        email: user.email ?? "",
        created_at: user.created_at,
      } as UserDTO;

      if (session) {
        context.locals.session = {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at || 0,
          user: context.locals.user,
        };
      }

      // If accessing auth routes while authenticated, redirect to dashboard
      if (isAuthRoute(pathname)) {
        return redirect("/");
      }
    }
  } catch (error) {
    console.error("Unexpected error in auth middleware:", error);
  }

  // Check if route requires authentication
  if (isProtectedRoute(pathname)) {
    if (!context.locals.user) {
      // Not authenticated, redirect to login
      return redirect("/auth/login");
    }
  }

  // Allow request to proceed
  return next();
});
