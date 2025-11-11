import type { APIRoute } from "astro";
import { z } from "zod";
import type { GoalProgressDTO } from "../../../../types";
import { getGoalProgress } from "../../../../lib/services/goal.service";

export const prerender = false;

// Validation schema for query parameters
const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

/**
 * GET /api/goals/progress
 * Retrieves aggregated progress for all goals of authenticated user
 * Requires authentication
 */
export const GET: APIRoute = async ({ locals, url }) => {
  try {
    // Check authentication
    if (!locals.user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse and validate query parameters
    const queryParams = {
      limit: url.searchParams.get("limit"),
      offset: url.searchParams.get("offset"),
    };

    const validationResult = querySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid query parameters",
          details: validationResult.error.errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { limit, offset } = validationResult.data;

    // Fetch goal progress using service
    const { data, error } = await getGoalProgress(locals.supabase, locals.user.id, {
      limit,
      offset,
    });

    if (error) {
      console.error("Error fetching goal progress:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const progress: GoalProgressDTO[] = data || [];

    return new Response(JSON.stringify(progress), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/goals/progress:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
