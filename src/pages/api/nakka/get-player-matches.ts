import type { APIRoute } from "astro";
import { z } from "zod";
import { getPlayerMatchesByNickname } from "@/lib/services/nakka.user.service";

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
});

/**
 * POST /api/nakka/get-player-matches
 * Retrieves player matches from database by nickname(s)
 * PUBLIC endpoint for guests
 * - Accepts single nickname (string) or multiple nicknames (array)
 * - Returns top 30 matches ordered by tournament_date DESC
 * - Includes player statistics when available
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

    const { nicknames, limit } = validation.data;

    // Retrieve matches from database (nicknames is always an array after transformation)
    const result = await getPlayerMatchesByNickname(locals.supabase, nicknames, limit);

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
