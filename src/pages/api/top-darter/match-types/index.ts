import type { APIRoute } from "astro";

export const prerender = false;

/**
 * GET /api/v1/match-types
 * Get list of available match types with default configurations
 * Public endpoint - no authentication required
 */
export const GET: APIRoute = async ({ locals, url }) => {
  try {
    const supabase = locals.supabase;

    // Parse query parameters
    const isActive = url.searchParams.get("is_active");
    const filter = isActive !== null ? isActive === "true" : true;

    // Query topdarter.match_types table
    // @ts-expect-error - topdarter schema exists but types need regeneration
    let query = supabase.schema("topdarter").from("match_types").select("*").order("name", { ascending: true });

    if (filter !== null) {
      query = query.eq("is_active", filter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching match types:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        data: data || [],
        meta: { count: data?.length || 0 },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error in GET /api/v1/match-types:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
