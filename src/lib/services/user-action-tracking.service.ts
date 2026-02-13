import type { SupabaseClient } from "@/db/supabase.client";

/**
 * Action names that can be tracked
 */
export type TrackedActionName = "Search Matches" | "Start Match";

/**
 * Tracking data structure
 */
export interface TrackUserActionParams {
  actionName: TrackedActionName;
  description?: string | null;
  deviceIdentifier: string;
  userId?: string | null;
}

/**
 * Tracks a user action to the database
 * This function should be called from API endpoints to log user activity
 *
 * @param supabase - Supabase client instance (use service role client for bypassing RLS)
 * @param params - Tracking parameters
 * @returns Promise that resolves when tracking is complete
 *
 * @example
 * // Track search action
 * await trackUserAction(supabaseAdmin, {
 *   actionName: "Search Matches",
 *   description: "agawa",
 *   deviceIdentifier: "device-uuid-123",
 *   userId: session?.user?.id,
 * });
 *
 * @example
 * // Track start match action
 * await trackUserAction(supabaseAdmin, {
 *   actionName: "Start Match",
 *   description: null,
 *   deviceIdentifier: "device-uuid-123",
 *   userId: session?.user?.id,
 * });
 */
export async function trackUserAction(supabase: SupabaseClient, params: TrackUserActionParams): Promise<void> {
  try {
    const { actionName, description, deviceIdentifier, userId } = params;

    // Validate required parameters
    if (!actionName) {
      console.error("[Tracking] Action name is required");
      return;
    }

    if (!deviceIdentifier) {
      console.error("[Tracking] Device identifier is required");
      return;
    }

    // Insert tracking record
    const { error } = await supabase.from("user_action_tracking").insert({
      action_name: actionName,
      description: description || null,
      user_id: userId || null,
      device_identifier: deviceIdentifier,
    });

    if (error) {
      console.error(`[Tracking] Failed to track action "${actionName}":`, error);
      // Don't throw error - tracking failures shouldn't break the main flow
      return;
    }

    console.log(
      `[Tracking] Successfully tracked action: ${actionName} (device: ${deviceIdentifier}, user: ${userId || "guest"})`
    );
  } catch (error) {
    console.error(`[Tracking] Exception tracking action:`, error);
    // Don't throw error - tracking failures shouldn't break the main flow
  }
}
