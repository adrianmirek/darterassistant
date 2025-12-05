import type { SupabaseClient } from "../../db/supabase.client";
import type { TournamentTypeDTO } from "../../types";

type ServiceError = { message: string; code?: string } | null;

/**
 * Fetches all tournament types (lookup data)
 */
export async function getTournamentTypes(
  supabase: SupabaseClient
): Promise<{ data: TournamentTypeDTO[] | null; error: ServiceError }> {
  try {
    const { data, error } = await supabase.from("tournament_types").select("id, name").order("id", { ascending: true });

    if (error) {
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    return {
      data: null,
      error: {
        message: err?.message || "Failed to fetch tournament types",
        code: err?.code,
      },
    };
  }
}
