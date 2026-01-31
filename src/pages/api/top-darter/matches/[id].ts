import type { APIRoute } from "astro";
import { z } from "zod";

export const prerender = false;

const updateMatchSchema = z.object({
  match_status: z.enum(["setup", "in_progress", "paused", "completed", "cancelled"]).optional(),
  current_leg: z.number().int().positive().optional(),
  current_set: z.number().int().positive().optional(),
  player1_legs_won: z.number().int().min(0).optional(),
  player2_legs_won: z.number().int().min(0).optional(),
  player1_sets_won: z.number().int().min(0).optional(),
  player2_sets_won: z.number().int().min(0).optional(),
  winner_player_number: z
    .union([z.literal(1), z.literal(2)])
    .optional()
    .nullable(),
  started_at: z.string().datetime().optional().nullable(),
  completed_at: z.string().datetime().optional().nullable(),
});

/**
 * GET /api/v1/matches/:id
 * Get match details including current state
 */
export const GET: APIRoute = async ({ locals, params, request, url }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: "Match ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const sessionId = request.headers.get("X-Session-ID");
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "X-Session-ID header is required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = locals.supabase;

    // Set session variable for RLS
    await supabase.rpc("set_session_id", { session_id: sessionId });

    // Parse include parameter
    const includeParam = url.searchParams.get("include");
    const includes = includeParam ? includeParam.split(",") : [];

    // Fetch match
    const { data: match, error } = await supabase.schema("topdarter").from("matches").select("*").eq("id", id).single();

    if (error) {
      if (error.code === "PGRST116") {
        return new Response(JSON.stringify({ error: "Match not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.error("Error fetching match:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = { ...(match as any) };

    // Include stats if requested
    if (includes.includes("stats")) {
      const { data: stats } = await supabase.schema("topdarter").from("match_stats").select("*").eq("match_id", id);

      response.stats = stats || [];
    }

    // Include lock if requested
    if (includes.includes("lock")) {
      const { data: lock } = await supabase
        .schema("topdarter")
        .from("match_locks")
        .select("*")
        .eq("match_id", id)
        .single();

      response.lock = lock || null;
    }

    return new Response(JSON.stringify({ data: response }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/v1/matches/:id:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * PATCH /api/v1/matches/:id
 * Update match state
 */
export const PATCH: APIRoute = async ({ locals, params, request }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: "Match ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const sessionId = request.headers.get("X-Session-ID");
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "X-Session-ID header is required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validationResult = updateMatchSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: validationResult.error.errors,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = locals.supabase;

    // Set session variable for RLS
    await supabase.rpc("set_session_id", { session_id: sessionId });

    const { data: match, error } = await supabase
      .schema("topdarter")
      .from("matches")
      .update(validationResult.data)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return new Response(JSON.stringify({ error: "Match not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.error("Error updating match:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: match }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in PATCH /api/v1/matches/:id:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
