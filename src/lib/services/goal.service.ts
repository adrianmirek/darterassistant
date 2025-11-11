import type { SupabaseClient } from "../../db/supabase.client";
import type { GoalDTO, CreateGoalCommand, CreateGoalResponseDTO, GoalProgressDTO } from "../../types";

type ServiceError = { message: string } | null;

/**
 * Service for goal-related business logic
 */

/**
 * Fetches goals for a user with pagination
 */
export async function getGoals(
  supabase: SupabaseClient,
  userId: string,
  options: {
    limit: number;
    offset: number;
  }
): Promise<{ data: GoalDTO[] | null; error: ServiceError }> {
  try {
    const { data, error } = await supabase
      .from("goals")
      .select("id, target_avg, start_date, end_date, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(options.offset, options.offset + options.limit - 1);

    if (error) {
      return { data: null, error };
    }

    const goals: GoalDTO[] = (data || []).map((goal) => ({
      id: goal.id,
      target_avg: goal.target_avg,
      start_date: goal.start_date,
      end_date: goal.end_date,
      created_at: goal.created_at,
    }));

    return { data: goals, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Fetches a single goal by ID
 */
export async function getGoalById(
  supabase: SupabaseClient,
  goalId: string,
  userId: string
): Promise<{ data: GoalDTO | null; error: ServiceError }> {
  try {
    const { data, error } = await supabase
      .from("goals")
      .select("id, target_avg, start_date, end_date, created_at")
      .eq("id", goalId)
      .eq("user_id", userId)
      .single();

    if (error) {
      return { data: null, error };
    }

    const goal: GoalDTO = {
      id: data.id,
      target_avg: data.target_avg,
      start_date: data.start_date,
      end_date: data.end_date,
      created_at: data.created_at,
    };

    return { data: goal, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Creates a new goal
 */
export async function createGoal(
  supabase: SupabaseClient,
  userId: string,
  command: CreateGoalCommand
): Promise<{ data: CreateGoalResponseDTO | null; error: ServiceError }> {
  try {
    const { data, error } = await supabase
      .from("goals")
      .insert({
        user_id: userId,
        target_avg: command.target_avg,
        start_date: command.start_date,
        end_date: command.end_date,
      })
      .select("id, created_at")
      .single();

    if (error) {
      return { data: null, error };
    }

    const response: CreateGoalResponseDTO = {
      id: data.id,
      created_at: data.created_at,
    };

    return { data: response, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Fetches progress for all goals
 */
export async function getGoalProgress(
  supabase: SupabaseClient,
  userId: string,
  options: {
    limit: number;
    offset: number;
  }
): Promise<{ data: GoalProgressDTO[] | null; error: ServiceError }> {
  try {
    const { data, error } = await supabase
      .from("goal_progress")
      .select("goal_id, average_score, tournament_count, progress_percentage")
      .eq("user_id", userId)
      .range(options.offset, options.offset + options.limit - 1);

    if (error) {
      return { data: null, error };
    }

    const progress: GoalProgressDTO[] = (data || []).map((item) => ({
      goal_id: item.goal_id || "",
      average_score: item.average_score || 0,
      tournament_count: item.tournament_count || 0,
      progress_percentage: item.progress_percentage || 0,
    }));

    return { data: progress, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Fetches progress for a specific goal
 */
export async function getGoalProgressById(
  supabase: SupabaseClient,
  goalId: string,
  userId: string
): Promise<{ data: GoalProgressDTO | null; error: ServiceError }> {
  try {
    const { data, error } = await supabase
      .from("goal_progress")
      .select("goal_id, average_score, tournament_count, progress_percentage")
      .eq("goal_id", goalId)
      .eq("user_id", userId)
      .single();

    if (error) {
      return { data: null, error };
    }

    const progress: GoalProgressDTO = {
      goal_id: data.goal_id || "",
      average_score: data.average_score || 0,
      tournament_count: data.tournament_count || 0,
      progress_percentage: data.progress_percentage || 0,
    };

    return { data: progress, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
