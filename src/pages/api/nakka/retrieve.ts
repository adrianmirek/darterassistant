import type { APIRoute } from "astro";
import { z } from "zod";
import { retrieveTournamentsMatchesByKeywordAndNickName } from "@/lib/services/nakka.user.service";

export const prerender = false;

// Validation schema
const retrieveSchema = z.object({
  keyword: z.string().min(1).max(100),
  nick_name: z.string().min(1).max(100),
});

/**
 * POST /api/nakka/retrieve
 * Retrieves tournaments and matches from Nakka 01 filtered by keyword and player nickname
 * Does not persist data to database - only scrapes and filters
 * Requires authentication
 */
export const POST: APIRoute = async ({ locals, request }) => {
  try {
    // Authentication check
    if (!locals.user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

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

    // Execute retrieval
    const result = await retrieveTournamentsMatchesByKeywordAndNickName(keyword, nick_name);

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in POST /api/nakka/retrieve:", error);
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

