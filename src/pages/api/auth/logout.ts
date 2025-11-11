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

    // Sign out user
    const { error } = await logoutUser(supabase);

    // Even if Supabase logout fails, we consider it a success
    // because the cookies will be cleared by Supabase client
    if (error) {
      console.error("Logout error (non-fatal):", error);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Logout API error:", error);
    // Still return success - logout should be idempotent
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
