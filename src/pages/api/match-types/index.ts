import type { APIRoute } from "astro";
import type { MatchTypeDTO } from "../../../types";

export const prerender = false;

/**
 * GET /api/match-types
 * Retrieves all available match types (e.g., singles, doubles)
 * Public endpoint - no authentication required
 */
export const GET: APIRoute = async ({ locals }) => {
  try {
    // Get Supabase client from context.locals
    const supabase = locals.supabase;

    // Query match_types table
    const { data, error } = await supabase.from("match_types").select("id, name").order("id", { ascending: true });

    // Handle database errors
    if (error) {
      console.error("Error fetching match types:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Transform to DTO format
    const matchTypes: MatchTypeDTO[] = data || [];

    // Return successful response
    return new Response(JSON.stringify(matchTypes), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch unexpected errors
    console.error("Unexpected error in GET /api/match-types:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
