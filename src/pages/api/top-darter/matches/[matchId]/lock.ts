import type { APIRoute } from "astro";
import { z } from "zod";

export const prerender = false;

const acquireLockSchema = z.object({
  device_info: z.string().max(500).optional(),
  auto_extend: z.boolean().default(true),
});

const extendLockSchema = z.object({
  extend_by_seconds: z.number().int().positive().max(3600).default(300),
});

/**
 * POST /api/v1/matches/:matchId/lock
 * Acquire a lock on a match
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

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const validationResult = acquireLockSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(JSON.stringify({ error: "Validation failed", details: validationResult.error.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = validationResult.data;
    const supabase = locals.supabase;

    // Use PostgreSQL function to atomically acquire lock
    // This bypasses RLS complexity and handles all edge cases
    console.log("🔐 Acquiring lock for match:", matchId, "session:", sessionId);

    // Parse device_info if it's a string, otherwise use as-is
    let deviceInfo = {};
    if (data.device_info) {
      try {
        deviceInfo = typeof data.device_info === "string" ? JSON.parse(data.device_info) : data.device_info;
      } catch (e) {
        console.warn("Invalid device_info, using empty object:", e);
      }
    }

    const { data: locks, error } = await supabase.rpc("acquire_lock", {
      p_match_id: matchId,
      p_session_id: sessionId,
      p_device_info: deviceInfo,
      p_auto_extend: data.auto_extend ?? true,
      p_expires_in_seconds: 300, // 5 minutes
    });

    // Handle LOCK_CONFLICT error specifically
    if (error && error.code === "LOCKC") {
      console.log("❌ Match locked by another session");
      return new Response(
        JSON.stringify({
          error: {
            code: "LOCK_CONFLICT",
            message: error.message || "Match is locked by another session",
          },
        }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    const lock = Array.isArray(locks) && locks.length > 0 ? locks[0] : locks;

    console.log("🔐 Lock acquisition result:", { success: !error, matchId: lock?.match_id, error });

    if (error || !lock) {
      console.error("❌ Error upserting lock:", error);
      return new Response(JSON.stringify({ error: "Failed to acquire lock", details: error }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: lock }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in POST /api/v1/matches/:matchId/lock:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * PUT /api/v1/matches/:matchId/lock
 * Extend an existing lock
 */
export const PUT: APIRoute = async ({ locals, params, request }) => {
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

    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const validationResult = extendLockSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(JSON.stringify({ error: "Validation failed", details: validationResult.error.errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = validationResult.data;
    const supabase = locals.supabase;

    // Set session variable for RLS
    await supabase.rpc("set_session_id", { session_id: sessionId });

    const { data: lock, error } = await supabase
      .schema("topdarter")
      .from("match_locks")
      .update({
        expires_at: new Date(Date.now() + data.extend_by_seconds * 1000).toISOString(),
        last_activity_at: new Date().toISOString(),
      })
      .eq("match_id", matchId)
      .eq("locked_by_session_id", sessionId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return new Response(JSON.stringify({ error: "Lock not found or not owned by this session" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.error("Error extending lock:", error);
      return new Response(JSON.stringify({ error: "Failed to extend lock" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: lock }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in PUT /api/v1/matches/:matchId/lock:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * DELETE /api/v1/matches/:matchId/lock
 * Release a lock
 */
export const DELETE: APIRoute = async ({ locals, params, request }) => {
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

    const { error } = await supabase
      .schema("topdarter")
      .from("match_locks")
      .delete()
      .eq("match_id", matchId)
      .eq("locked_by_session_id", sessionId);

    if (error) {
      console.error("Error releasing lock:", error);
      return new Response(JSON.stringify({ error: "Failed to release lock" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Unexpected error in DELETE /api/v1/matches/:matchId/lock:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

/**
 * GET /api/v1/matches/:matchId/lock
 * Get lock status
 */
export const GET: APIRoute = async ({ locals, params, request }) => {
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

    const { data: lock, error } = await supabase
      .schema("topdarter")
      .from("match_locks")
      .select("*")
      .eq("match_id", matchId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return new Response(JSON.stringify({ data: null, locked: false }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      console.error("Error fetching lock:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const expiresAt = new Date(lock.expires_at);
    const now = new Date();
    const isExpired = expiresAt <= now;
    const ownedByThisSession = lock.locked_by_session_id === sessionId;

    return new Response(
      JSON.stringify({
        data: lock,
        locked: !isExpired,
        owned_by_this_session: ownedByThisSession,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in GET /api/v1/matches/:matchId/lock:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
