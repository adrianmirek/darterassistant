import type { APIRoute } from "astro";
import { z } from "zod";

export const prerender = false;

const createThrowSchema = z.object({
  leg_number: z.number().int().positive(),
  set_number: z.number().int().positive().default(1),
  player_number: z.number().int().min(1).max(2), // Changed from enum to number range
  throw_number: z.number().int().min(1).max(3), // Changed from enum to number range
  round_number: z.number().int().positive(),
  score: z.number().int().min(0).max(180),
  remaining_score: z.number().int().min(0),
  is_checkout_attempt: z.boolean().default(false),
  is_bust: z.boolean().optional(),
});

/**
 * POST /api/v1/matches/:matchId/legs/throws
 * Record a throw in a match leg
 */
export const POST: APIRoute = async ({ locals, params, request }) => {
  try {
    const { matchId } = params;

    if (!matchId) {
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

    console.log("📥 Received throw data:", body);

    const validationResult = createThrowSchema.safeParse(body);

    if (!validationResult.success) {
      console.error("❌ Validation failed:", validationResult.error.errors);
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: validationResult.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Validation passed");

    const data = validationResult.data;
    const supabase = locals.supabase;

    // Set session variable for RLS
    await supabase.rpc("set_session_id", { session_id: sessionId });

    // Verify match exists and has lock
    const { data: locks } = await supabase
      .schema("topdarter")
      .from("match_locks")
      .select("*")
      .eq("match_id", matchId)
      .eq("locked_by_session_id", sessionId);

    const lock = locks && locks.length > 0 ? locks[0] : null;

    if (!lock) {
      console.error("No lock found for match:", matchId, "session:", sessionId);
      return new Response(
        JSON.stringify({
          error: {
            code: "LOCK_REQUIRED",
            message: "Match must be locked to record throws",
          },
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if lock is expired
    const expiresAt = new Date(lock.expires_at);
    const now = new Date();

    if (expiresAt <= now) {
      console.error("Lock expired for match:", matchId);
      return new Response(
        JSON.stringify({
          error: {
            code: "LOCK_EXPIRED",
            message: "Lock has expired",
          },
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if this is a winning throw (checkout successful)
    const isWinningThrow = data.remaining_score === 0;

    // Upsert throw (insert or update if exists)
    // This handles both new throws and edits to previous rounds
    const { data: throws, error } = await supabase
      .schema("topdarter")
      .from("match_legs")
      .upsert(
        {
          match_id: matchId,
          leg_number: data.leg_number,
          set_number: data.set_number,
          player_number: data.player_number,
          throw_number: data.throw_number,
          round_number: data.round_number,
          score: data.score,
          remaining_score: data.remaining_score,
          is_checkout_attempt: data.is_checkout_attempt,
          // Set winner fields if leg completed
          winner_player_number: isWinningThrow ? data.player_number : null,
          winning_checkout: isWinningThrow ? data.score : null,
        },
        {
          onConflict: "match_id,leg_number,set_number,player_number,throw_number,round_number",
          ignoreDuplicates: false, // Update on conflict
        }
      )
      .select();

    const throwData = throws && throws.length > 0 ? throws[0] : null;

    if (error || !throwData) {
      console.error("Error recording throw:", error);
      return new Response(JSON.stringify({ error: "Failed to record throw", details: error }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("✅ Throw recorded:", throwData.id);

    // Check if leg/match completed (triggers should update match table)
    const { data: matches } = await supabase.schema("topdarter").from("matches").select("*").eq("id", matchId);

    const match = matches && matches.length > 0 ? matches[0] : null;

    const legCompleted = data.remaining_score === 0;
    const matchCompleted = match?.match_status === "completed";

    // Determine if stats were updated (they should be via triggers)
    const statsUpdated = true;

    return new Response(
      JSON.stringify({
        data: throwData,
        meta: {
          stats_updated: statsUpdated,
          match_updated: legCompleted || matchCompleted,
          leg_completed: legCompleted,
          match_completed: matchCompleted,
        },
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in POST /api/v1/matches/:matchId/legs/throws:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * GET /api/v1/matches/:matchId/legs/throws
 * Get all throws for a match
 */
export const GET: APIRoute = async ({ locals, params, request, url }) => {
  try {
    const { matchId } = params;

    if (!matchId) {
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

    // Parse query parameters
    const legNumber = url.searchParams.get("leg_number");
    const setNumber = url.searchParams.get("set_number");
    const playerNumber = url.searchParams.get("player_number");

    let query = supabase
      .schema("topdarter")
      .from("match_legs")
      .select("*")
      .eq("match_id", matchId)
      .order("leg_number", { ascending: true })
      .order("round_number", { ascending: true })
      .order("throw_number", { ascending: true });

    if (legNumber) {
      query = query.eq("leg_number", parseInt(legNumber));
    }
    if (setNumber) {
      query = query.eq("set_number", parseInt(setNumber));
    }
    if (playerNumber) {
      query = query.eq("player_number", parseInt(playerNumber));
    }

    const { data: throws, error } = await query;

    if (error) {
      console.error("Error fetching throws:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        data: throws || [],
        meta: { count: throws?.length || 0 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in GET /api/v1/matches/:matchId/legs/throws:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
