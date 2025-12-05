import type { APIRoute } from "astro";
import type { TournamentTypeDTO } from "../../../types";
import { getTournamentTypes } from "../../../lib/services/tournament-type.service";

export const prerender = false;

/**
 * GET /api/tournament-types
 * Retrieves all tournament types (public lookup data)
 * Does NOT require authentication (lookup data)
 */
export const GET: APIRoute = async ({ locals }) => {
  try {
    // Fetch tournament types using service
    const { data, error } = await getTournamentTypes(locals.supabase);

    if (error) {
      console.error("Error fetching tournament types:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tournamentTypes: TournamentTypeDTO[] = data || [];

    return new Response(JSON.stringify(tournamentTypes), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/tournament-types:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

