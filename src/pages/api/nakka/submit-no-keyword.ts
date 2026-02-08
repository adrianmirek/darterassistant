import type { APIRoute } from "astro";
import { z } from "zod";
import { submitNoKeywordRequest } from "@/lib/services/no-keyword.service";

export const prerender = false;

// Validation schema
const submitNoKeywordSchema = z.object({
  keyword: z.string().min(3, "Tournament keyword must be at least 3 characters").max(100),
  nickname: z.string().min(3, "Nickname must be at least 3 characters").max(100),
  user_email: z.string().email("Invalid email address").optional().or(z.literal("")),
});

/**
 * POST /api/nakka/submit-no-keyword
 * Submits a request when no tournaments are found for a keyword + nickname combination
 * Stores the request in nakka.no_keyword table for team follow-up
 * PUBLIC endpoint - accessible by guests
 *
 * Body: { keyword, nickname, user_email? }
 * Returns: { success: true, data: { id, created_at, message } }
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

    const validation = submitNoKeywordSchema.safeParse(body);
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

    const { keyword, nickname, user_email } = validation.data;

    // Submit the no keyword request
    const result = await submitNoKeywordRequest(locals.supabase, {
      keyword,
      nickname,
      user_email: user_email || undefined,
    });

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in POST /api/nakka/submit-no-keyword:", error);
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
