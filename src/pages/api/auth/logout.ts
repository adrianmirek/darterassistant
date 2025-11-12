import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "@/db/supabase.client";
import { logoutUser } from "@/lib/services/auth.service";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Create Supabase client
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Sign out user with global scope to clear all sessions
    const { error } = await logoutUser(supabase);

    // Even if Supabase logout fails, we consider it a success
    // because the cookies will be cleared by Supabase client
    if (error) {
      console.error("Logout error (non-fatal):", error);
    }

    // Explicitly clear all Supabase auth cookies
    // This ensures cookies are cleared even if Supabase SSR fails to do so
    const cookiesToClear = [
      "sb-access-token",
      "sb-refresh-token",
      // Supabase SSR uses these cookie names by default
      `sb-${import.meta.env.SUPABASE_URL?.split("//")[1]?.split(".")[0]}-auth-token`,
    ];

    cookiesToClear.forEach((cookieName) => {
      cookies.delete(cookieName, {
        path: "/",
      });
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Logout API error:", error);
    // Still return success - logout should be idempotent
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  }
};
