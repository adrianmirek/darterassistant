import type { APIRoute } from "astro";
import { z } from "zod";
import type { TournamentSummaryDTO, CreateTournamentCommand, CreateTournamentResponseDTO } from "../../../types";
import { getTournaments, createTournament } from "../../../lib/services/tournament.service";

export const prerender = false;

// Validation schema for query parameters
const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  sort: z.enum(["date_asc", "date_desc"]).default("date_desc"),
});

// Validation schema for creating tournament result
const createTournamentResultSchema = z.object({
  match_type_id: z.number().int().positive(),
  opponent_id: z.string().uuid().nullable().optional(),
  full_name: z.string().max(255).nullable().optional(),
  player_score: z.number().int().nonnegative(),
  opponent_score: z.number().int().nonnegative(),
  final_placement: z.number().int().positive(),
  average_score: z.number().positive(),
  first_nine_avg: z.number().positive(),
  checkout_percentage: z.number().min(0).max(100),
  score_60_count: z.number().int().min(0),
  score_100_count: z.number().int().min(0),
  score_140_count: z.number().int().min(0),
  score_180_count: z.number().int().min(0),
  high_finish: z.number().int().min(0),
  best_leg: z.number().int().min(0),
  worst_leg: z.number().int().min(0),
});

// Validation schema for creating tournament with multiple matches
const createTournamentSchema = z.object({
  name: z.string().min(1).max(255),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tournament_type_id: z.number().int().positive().optional(), // Optional, defaults to 1
  matches: z.array(createTournamentResultSchema).min(1, "At least one match is required"),
});

/**
 * GET /api/tournaments
 * Retrieves paginated list of tournaments for authenticated user
 * Requires authentication
 */
export const GET: APIRoute = async ({ locals, url }) => {
  try {
    // Check authentication
    if (!locals.user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse and validate query parameters
    const queryParams = {
      limit: url.searchParams.get("limit"),
      offset: url.searchParams.get("offset"),
      sort: url.searchParams.get("sort"),
    };

    const validationResult = querySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid query parameters",
          details: validationResult.error.errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { limit, offset, sort } = validationResult.data;

    // Fetch tournaments using service
    const { data, error } = await getTournaments(locals.supabase, locals.user.id, {
      limit,
      offset,
      sort,
    });

    if (error) {
      console.error("Error fetching tournaments:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tournaments: TournamentSummaryDTO[] = data || [];

    return new Response(JSON.stringify(tournaments), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/tournaments:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * POST /api/tournaments
 * Creates a new tournament with initial match result
 * Requires authentication
 */
export const POST: APIRoute = async ({ locals, request }) => {
  try {
    // Check authentication
    if (!locals.user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate request body
    const validationResult = createTournamentSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: validationResult.error.errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Transform validated data to CreateTournamentCommand
    const command: CreateTournamentCommand = {
      name: validationResult.data.name,
      date: validationResult.data.date,
      tournament_type_id: validationResult.data.tournament_type_id,
      matches: validationResult.data.matches,
    };

    // Create tournament using service
    const { data, error } = await createTournament(locals.supabase, locals.user.id, command);

    if (error) {
      // Check for foreign key violation (invalid match_type_id, tournament_type_id, or opponent_id)
      if ("code" in error && error.code === "23503") {
        return new Response(
          JSON.stringify({
            error: "Validation failed",
            details: ["Invalid foreign key reference (match_type_id, tournament_type_id, or opponent_id)"],
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Error creating tournament
      return new Response(
        JSON.stringify({
          error: "Failed to create tournament",
          details: error.message || "Unknown error",
          code: "code" in error ? error.code : "UNKNOWN",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!data) {
      return new Response(JSON.stringify({ error: "Failed to create tournament" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response: CreateTournamentResponseDTO = data;

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    // Unexpected error in POST /api/tournaments
    return new Response(JSON.stringify({ error: "Failed to create tournament" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
