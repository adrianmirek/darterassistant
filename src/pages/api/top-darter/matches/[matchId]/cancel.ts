import type { APIRoute } from "astro";

export const prerender = false;

/**
 * DELETE /api/v1/matches/:matchId/cancel
 * Cancel a match (mark as cancelled)
 */
export const DELETE: APIRoute = async ({ locals, params, request }) => {
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
      return new Response(JSON.stringify({ error: "Cannot cancel a completed match" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Update match to cancelled
    const { data: match, error } = await supabase
      .schema("topdarter")
      .from("matches")
      .update({
        match_status: "cancelled",
        completed_at: new Date().toISOString(),
      })
      .eq("id", matchId)
      .select()
      .single();

    if (error) {
      console.error("Error cancelling match:", error);
      return new Response(JSON.stringify({ error: "Failed to cancel match" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Release lock if exists
    await supabase.schema("topdarter").from("match_locks").delete().eq("match_id", matchId);

    return new Response(JSON.stringify({ data: match }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in DELETE /api/v1/matches/:matchId/cancel:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
