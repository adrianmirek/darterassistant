import type { APIRoute } from "astro";
import { z } from "zod";

export const prerender = false;

// In-memory guard to prevent rapid duplicate match creation per session
const creatingSessions = new Map<string, number>();

// Validation schemas
const playerInfoSchema = z
  .object({
    user_id: z.string().uuid().optional(),
    guest_name: z.string().min(1).max(255).optional(),
  })
  .refine(
    (data) => {
      const hasUserId = !!data.user_id;
      const hasGuestName = !!data.guest_name;
      return (hasUserId && !hasGuestName) || (!hasUserId && hasGuestName);
    },
    { message: "Exactly one of user_id or guest_name must be provided" }
  );

const createMatchSchema = z
  .object({
    match_type_id: z.string().uuid(),
    player1: playerInfoSchema,
    player2: playerInfoSchema,
    start_score: z.number().int().positive(),
    checkout_rule: z.enum(["straight", "double_out", "master_out"]),
    format_type: z.enum(["first_to", "best_of", "unlimited"]),
    legs_count: z.number().int().positive().optional(),
    sets_count: z.number().int().positive().optional().nullable(),
    is_private: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (data.format_type === "first_to" || data.format_type === "best_of") {
        return data.legs_count && data.legs_count > 0;
      }
      return true;
    },
    { message: "legs_count is required for first_to and best_of formats" }
  );

/**
 * POST /api/v1/matches
 * Create a new match
 */
export const POST: APIRoute = async ({ locals, request }) => {
  // Get session ID from header
  const sessionId = request.headers.get("X-Session-ID");

  try {
    if (!sessionId) {
      return new Response(
        JSON.stringify({
          error: {
            code: "MISSING_SESSION_ID",
            message: "X-Session-ID header is required",
          },
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Duplicate-creation guard: if a match was created for this session within last 3s, block
    try {
      const last = creatingSessions.get(sessionId);
      const now = Date.now();
      if (last && now - last < 1000) {
        console.warn("[API] Duplicate match creation prevented for session:", sessionId);
        return new Response(
          JSON.stringify({
            error: {
              code: "DUPLICATE_CREATION",
              message: "A match creation is already in progress for this session",
            },
          }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }
      creatingSessions.set(sessionId, now);
    } catch {
      // ignore storage guard errors
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            code: "INVALID_JSON",
            message: "Invalid JSON in request body",
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Validate request body
    const validationResult = createMatchSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: validationResult.error.errors.map((err) => ({
              field: err.path.join("."),
              message: err.message,
            })),
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const data = validationResult.data;
    const supabase = locals.supabase;

    // Set session variable for RLS
    const { error: rpcError } = await supabase.rpc("set_session_id", {
      session_id: sessionId,
    });

    if (rpcError) {
      console.error("Error setting session ID:", rpcError);
    }

    // Insert match
    const { data: match, error } = await supabase
      .schema("topdarter")
      .from("matches")
      .insert({
        match_type_id: data.match_type_id,
        player1_user_id: data.player1.user_id || null,
        player1_guest_name: data.player1.guest_name || null,
        player2_user_id: data.player2.user_id || null,
        player2_guest_name: data.player2.guest_name || null,
        start_score: data.start_score,
        checkout_rule: data.checkout_rule,
        format_type: data.format_type,
        legs_count: data.legs_count || null,
        sets_count: data.sets_count || null,
        is_private: data.is_private,
        created_by_user_id: locals.user?.id || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23503") {
        return new Response(
          JSON.stringify({
            error: {
              code: "INVALID_REFERENCE",
              message: "Invalid match_type_id",
            },
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      console.error("Error creating match:", error);
      return new Response(
        JSON.stringify({
          error: {
            code: "DATABASE_ERROR",
            message: "Failed to create match",
          },
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ data: match }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in POST /api/v1/matches:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
  // Don't use finally to delete the guard - let it persist for 3s to block rapid duplicates
  // The timestamp check handles expiry automatically
};
