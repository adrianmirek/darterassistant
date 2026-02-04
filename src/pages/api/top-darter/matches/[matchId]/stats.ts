import type { APIRoute } from "astro";

export const prerender = false;

/**
 * GET /api/v1/matches/:matchId/stats
 * Get aggregated match statistics
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
    const playerNumber = url.searchParams.get("player_number");

    let query = supabase
      .schema("topdarter")
      .from("match_stats")
      .select("*")
      .eq("match_id", matchId)
      .order("player_number", { ascending: true });

    if (playerNumber) {
      query = query.eq("player_number", parseInt(playerNumber));
    }

    const { data: stats, error } = await query;

    if (error) {
      console.error("Error fetching stats:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        data: stats || [],
        meta: { count: stats?.length || 0 },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in GET /api/v1/matches/:matchId/stats:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
