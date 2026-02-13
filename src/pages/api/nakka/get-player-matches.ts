import type { APIRoute } from "astro";
import { z } from "zod";
import { getPlayerMatchesByNickname } from "@/lib/services/nakka.user.service";
import { trackUserAction } from "@/lib/services/user-action-tracking.service";

export const prerender = false;

// Validation schema - accepts either single nickname or array of nicknames
// Each nickname must be at least 3 characters
const getPlayerMatchesSchema = z.object({
  nicknames: z
    .union([
      z.string().min(3, "Nickname must be at least 3 characters").max(100),
      z
        .array(z.string().min(3, "Each nickname must be at least 3 characters").max(100))
        .min(1, "At least one nickname is required"),
    ])
    .transform((val) => (Array.isArray(val) ? val : [val])), // Always convert to array
  limit: z.number().int().positive().max(30).optional().default(30),
  deviceIdentifier: z.string().min(1, "Device identifier is required").optional(), // Optional for backward compatibility
  skipTracking: z.boolean().optional().default(false), // Skip tracking for auto-refreshes
});

/**
 * POST /api/nakka/get-player-matches
 * Retrieves player matches from database by nickname(s)
 * PUBLIC endpoint for guests
 * - Accepts single nickname (string) or multiple nicknames (array)
 * - Returns top 30 matches ordered by tournament_date DESC
 * - Includes player statistics when available
 * - Tracks search action for analytics
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

    const validation = getPlayerMatchesSchema.safeParse(body);
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

    const { nicknames, limit, deviceIdentifier, skipTracking } = validation.data;

    // Get user session (if authenticated)
    const {
      data: { session },
    } = await locals.supabase.auth.getSession();

    // Retrieve matches from database (nicknames is always an array after transformation)
    const result = await getPlayerMatchesByNickname(locals.supabase, nicknames, limit);

    // Track the search action (non-blocking, failures won't affect response)
    // Only track when user explicitly clicks search button (skipTracking=false)
    // Skip tracking for auto-refreshes when adding/removing nicknames
    if (deviceIdentifier && !skipTracking) {
      trackUserAction(locals.supabase, {
        actionName: "Search Matches",
        description: nicknames[0], // Track the primary search keyword
        deviceIdentifier,
        userId: session?.user?.id || null,
      }).catch((error) => {
        console.error("[API] Failed to track search action:", error);
        // Continue without throwing - tracking is non-critical
      });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in POST /api/nakka/get-player-matches:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
