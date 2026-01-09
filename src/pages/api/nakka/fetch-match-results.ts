import type { APIRoute } from "astro";
import { z } from "zod";
import { fetchMatchResults } from "@/lib/services/nakka.user.service";

export const prerender = false;

// Validation schema
const fetchMatchResultsSchema = z.object({
  tournament_match_id: z.number().int().positive(),
  nakka_match_identifier: z.string().min(1),
  match_href: z.string().url(),
  nick_name: z.string().min(3).max(100),
});

/**
 * POST /api/nakka/fetch-match-results
 * Fetches and imports player results for a specific match
 * PUBLIC endpoint for guests
 *
 * This endpoint:
 * 1. Scrapes match details from nakka.pl
 * 2. Imports player statistics to the database
 * 3. Returns updated match data with all statistics
 * 4. Updates match status throughout the process
 */
export const POST: APIRoute = async ({ locals, request }) => {
  try {
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

    const validation = fetchMatchResultsSchema.safeParse(body);
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

    const { tournament_match_id, nakka_match_identifier, match_href, nick_name } = validation.data;

    // Fetch and import match results
    const updatedMatch = await fetchMatchResults(
      locals.supabase,
      tournament_match_id,
      nakka_match_identifier,
      match_href,
      nick_name
    );

    if (!updatedMatch) {
      return new Response(
        JSON.stringify({
          error: "Match not found after update",
          message: "The match was processed but could not be retrieved from the database",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ success: true, data: updatedMatch }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in POST /api/nakka/fetch-match-results:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch match results",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
