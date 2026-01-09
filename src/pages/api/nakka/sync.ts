import type { APIRoute } from "astro";
import { z } from "zod";
import { syncTournamentsByKeyword } from "@/lib/services/nakka.service";

export const prerender = false;

// Validation schema
const syncSchema = z.object({
  keyword: z.string().min(1).max(100),
});

/**
 * POST /api/nakka/sync
 * Triggers tournament import from Nakka 01 by keyword
 * Requires authentication
 */
export const POST: APIRoute = async ({ locals, request }) => {
  try {
    // Authentication check
    if (!locals.user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validation = syncSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: validation.error.errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { keyword } = validation.data;

    // Execute sync
    const result = await syncTournamentsByKeyword(locals.supabase, keyword);

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in POST /api/nakka/sync:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
