import type { APIRoute } from "astro";
import { z } from "zod";
import type { MatchTypeDTO } from "../../../types";

export const prerender = false;

// Validation schema for the ID parameter
const idSchema = z.coerce.number().int().positive();

/**
 * GET /api/match-types/:id
 * Retrieves a single match type by its ID
 * Public endpoint - no authentication required
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // Extract and validate the ID parameter
    const idResult = idSchema.safeParse(params.id);

    if (!idResult.success) {
      return new Response(JSON.stringify({ error: "Invalid match type ID" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const id = idResult.data;

    // Get Supabase client from context.locals
    const supabase = locals.supabase;

    // Query match_types table for specific ID
    const { data, error } = await supabase.from("match_types").select("id, name").eq("id", id).single();

    // Handle not found error
    if (error && error.code === "PGRST116") {
      return new Response(JSON.stringify({ error: "Match type not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle other database errors
    if (error) {
      console.error("Error fetching match type:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Transform to DTO format
    const matchType: MatchTypeDTO = data;

    // Return successful response
    return new Response(JSON.stringify(matchType), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch unexpected errors
    console.error("Unexpected error in GET /api/match-types/:id:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
