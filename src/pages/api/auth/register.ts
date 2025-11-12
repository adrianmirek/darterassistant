import type { APIRoute } from "astro";
import { z } from "zod";
import { createSupabaseServerInstance } from "@/db/supabase.client";
import { registerUser } from "@/lib/services/auth.service";

export const prerender = false;

const registerRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request body
    const validation = registerRequestSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: validation.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { email, password } = validation.data;

    // Create Supabase client
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Register user
    const { data, error } = await registerUser(supabase, email, password);

    if (error) {
      // Map Supabase errors to appropriate status codes
      let statusCode = 500;
      let errorMessage = "Registration failed";

      if (error.message?.includes("already registered") || error.message?.includes("already exists")) {
        statusCode = 409;
        errorMessage = error.message; // Use the exact error message from the service
      } else if (error.message?.includes("Invalid email")) {
        statusCode = 400;
        errorMessage = "Invalid email address";
      } else if (error.message?.includes("Password")) {
        statusCode = 400;
        errorMessage = error.message;
      } else if (error.message?.includes("too many requests")) {
        statusCode = 429;
        errorMessage = "Too many registration attempts. Please try again later.";
      }

      return new Response(JSON.stringify({ error: errorMessage }), {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!data) {
      return new Response(JSON.stringify({ error: "Registration failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Sign out immediately after registration so user must manually log in
    // This prevents auto-login and allows redirect to login page
    await supabase.auth.signOut();

    // Return user data and session status (null when email confirmation is required)
    return new Response(
      JSON.stringify({
        user: data.user,
        session: data.session, // Will be null if email confirmation is required
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Register API error:", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
