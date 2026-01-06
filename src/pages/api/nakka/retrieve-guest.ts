import type { APIRoute } from "astro";
import { z } from "zod";
import { retrieveTournamentsMatchesByKeywordAndNickNameForGuest } from "@/lib/services/nakka.user.service";
import type { RetrieveTournamentsMatchesResponseDTO } from "@/types";

export const prerender = false;

// Validation schema with minimum 3 characters
const retrieveSchema = z.object({
  keyword: z.string().min(3, "Tournament keyword must be at least 3 characters").max(100),
  nick_name: z.string().min(3, "Nickname must be at least 3 characters").max(100),
});

/**
 * POST /api/nakka/retrieve-guest
 * Retrieves tournaments and matches from Nakka 01 filtered by keyword and player nickname
 * Saves tournaments and matches to database for future reference
 * PUBLIC endpoint for guests with limitation:
 * - Maximum 30 matches returned (where nickname is found)
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

    const validation = retrieveSchema.safeParse(body);
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

    const { keyword, nick_name } = validation.data;

    // Execute retrieval with guest limitations (30 matches max)
    // Also saves tournaments and matches to database
    const result = await retrieveTournamentsMatchesByKeywordAndNickNameForGuest(
      locals.supabase,
      keyword,
      nick_name
    );

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in POST /api/nakka/retrieve-guest:", error);
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


