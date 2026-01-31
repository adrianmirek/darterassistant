import type { APIRoute } from "astro";
import { z } from "zod";

export const prerender = false;

const endMatchSchema = z.object({
  winner_player_number: z
    .union([z.literal(1), z.literal(2)])
    .optional()
    .nullable(),
});

/**
 * POST /api/v1/matches/:matchId/end
 * End a match (mark as completed)
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
      body = {};
    }

    const validationResult = endMatchSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(JSON.stringify({ error: "Validation failed", details: validationResult.error.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = validationResult.data;
    const supabase = locals.supabase;

    // Set session variable for RLS
    await supabase.rpc("set_session_id", { session_id: sessionId });

    // Verify match exists and has lock
    const { data: lock } = await supabase
      .schema("topdarter")
      .from("match_locks")
      .select("*")
      .eq("match_id", matchId)
      .eq("locked_by_session_id", sessionId)
      .single();

    if (!lock) {
      return new Response(
        JSON.stringify({
          error: {
            code: "LOCK_REQUIRED",
            message: "Match must be locked to end it",
          },
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get current match state
    const { data: currentMatch } = await supabase
      .schema("topdarter")
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single();

    if (!currentMatch) {
      return new Response(JSON.stringify({ error: "Match not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (currentMatch.match_status === "completed") {
      return new Response(JSON.stringify({ error: "Match is already completed" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Calculate duration
    const startedAt = currentMatch.started_at ? new Date(currentMatch.started_at) : new Date();
    const completedAt = new Date();
    const durationSeconds = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000);

    // Update match
    const { data: match, error } = await supabase
      .schema("topdarter")
      .from("matches")
      .update({
        match_status: "completed",
        winner_player_number: data.winner_player_number || null,
        completed_at: completedAt.toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq("id", matchId)
      .select()
      .single();

    if (error) {
      console.error("Error ending match:", error);
      return new Response(JSON.stringify({ error: "Failed to end match" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Release lock
    await supabase
      .schema("topdarter")
      .from("match_locks")
      .delete()
      .eq("match_id", matchId)
      .eq("locked_by_session_id", sessionId);

    return new Response(JSON.stringify({ data: match }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in POST /api/v1/matches/:matchId/end:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
