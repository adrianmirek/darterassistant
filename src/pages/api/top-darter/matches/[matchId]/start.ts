import type { APIRoute } from "astro";
import { trackUserAction } from "@/lib/services/user-action-tracking.service";

export const prerender = false;

/**
 * POST /api/v1/matches/:matchId/start
 * Start a match (change status from setup to in_progress and acquire lock)
 * Tracks "Start Match" action for analytics
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

    // Get device identifier from request body (optional, for tracking)
    let deviceIdentifier: string | null = null;
    try {
      const body = await request.json();
      deviceIdentifier = body.deviceIdentifier || null;
    } catch {
      // Body is optional, continue without it
      console.warn("[API] No device identifier provided in request body");
    }

    const supabase = locals.supabase;

    // Get user session (if authenticated)
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Set session variable for RLS
    await supabase.rpc("set_session_id", { session_id: sessionId });

    // Get current match (without RLS single constraint)
    const { data: currentMatches } = await supabase.schema("topdarter").from("matches").select("*").eq("id", matchId);

    const currentMatch = currentMatches && currentMatches.length > 0 ? currentMatches[0] : null;

    if (!currentMatch) {
      console.error("Match not found:", matchId);
      return new Response(JSON.stringify({ error: "Match not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (currentMatch.match_status !== "setup") {
      console.error("Match already started:", currentMatch.match_status);
      return new Response(JSON.stringify({ error: "Match has already been started" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Update match status
    const { data: matches, error: matchError } = await supabase
      .schema("topdarter")
      .from("matches")
      .update({
        match_status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .eq("id", matchId)
      .select();

    const match = matches && matches.length > 0 ? matches[0] : null;

    if (matchError) {
      console.error("Error updating match:", matchError);
      return new Response(JSON.stringify({ error: "Failed to update match status" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Acquire lock (do this before checking match, so lockData is always defined)
    // Strategy: Release any previous lock held by this session, then acquire new lock
    // This enforces "one active match per device" requirement

    console.log("Releasing previous locks for session:", sessionId);
    const { error: deleteError } = await supabase
      .schema("topdarter")
      .from("match_locks")
      .delete()
      .eq("locked_by_session_id", sessionId);

    if (deleteError) {
      console.error("Error deleting previous locks:", deleteError);
    } else {
      console.log("Previous locks released (if any existed)");
    }

    // Collect device information for auditing
    const userAgent = request.headers.get("user-agent") || "Unknown";
    const deviceInfo = {
      userAgent,
      timestamp: new Date().toISOString(),
    };

    // Now insert the new lock
    const { data: lock, error: lockError } = await supabase
      .schema("topdarter")
      .from("match_locks")
      .insert({
        match_id: matchId,
        locked_by_session_id: sessionId,
        device_info: deviceInfo,
        auto_extend: true,
        expires_at: new Date(Date.now() + 300000).toISOString(), // 5 minutes
        last_activity_at: new Date().toISOString(),
      })
      .select();

    if (lockError) {
      console.error("❌ Error acquiring lock:", lockError);
      // Continue anyway - match can still be used without lock in local mode
    }

    const lockData = lock && lock.length > 0 ? lock[0] : null;

    console.log("🔐 Lock insert result:", {
      error: lockError,
      lockDataExists: !!lockData,
      lockArrayLength: lock?.length,
      lockMatchId: lockData?.match_id,
    });

    // If lock insert succeeded but SELECT was blocked by RLS, refetch it
    let finalLockData = lockData;
    if (!lockError && !lockData) {
      console.log("🔄 Lock INSERT succeeded but SELECT blocked, refetching...");
      const { data: refetchedLocks } = await supabase
        .schema("topdarter")
        .from("match_locks")
        .select("*")
        .eq("match_id", matchId)
        .eq("locked_by_session_id", sessionId);

      finalLockData = refetchedLocks && refetchedLocks.length > 0 ? refetchedLocks[0] : null;
      console.log("🔄 Refetched lock:", { exists: !!finalLockData, lockMatchId: finalLockData?.match_id });
    }

    if (finalLockData) {
      console.log("✅ Lock acquired for match:", matchId, "with device info");
    } else {
      console.warn("⚠️ No lock created for match:", matchId, "- scoring may fail");
    }

    // Track the start match action (non-blocking)
    if (deviceIdentifier) {
      trackUserAction(supabase, {
        actionName: "Start Match",
        description: null, // No additional description needed for Start Match
        deviceIdentifier,
        userId: session?.user?.id || null,
      }).catch((error) => {
        console.error("[API] Failed to track start match action:", error);
        // Continue without throwing - tracking is non-critical
      });
    } else {
      console.warn("[API] Device identifier not provided, skipping tracking");
    }

    if (!match) {
      console.error("Match update returned no data - RLS may be blocking");
      // Match was updated but RLS blocked the SELECT, so fetch it again
      const { data: refetchedMatches } = await supabase
        .schema("topdarter")
        .from("matches")
        .select("*")
        .eq("id", matchId);

      const refetchedMatch = refetchedMatches && refetchedMatches.length > 0 ? refetchedMatches[0] : null;

      if (!refetchedMatch) {
        return new Response(JSON.stringify({ error: "Failed to start match" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Use the refetched match
      return new Response(
        JSON.stringify({
          data: {
            match: refetchedMatch,
            lock: finalLockData,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        data: {
          match,
          lock: finalLockData,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in POST /api/v1/matches/:matchId/start:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
