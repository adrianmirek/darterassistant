import type { SupabaseClient } from "../../db/supabase.client";
import type {
  TournamentSummaryDTO,
  TournamentDetailDTO,
  TournamentResultDTO,
  CreateTournamentCommand,
  CreateTournamentResponseDTO,
} from "../../types";
import { OpenRouterService } from "./openrouter.service";
import type { ChatMessage } from "../../types/openrouter.types";

type ServiceError = { message: string } | null;

/**
 * Service for tournament-related business logic
 */

/**
 * Generate AI-powered performance feedback based on tournament results
 */
async function generateTournamentFeedback(command: CreateTournamentCommand, apiKey: string): Promise<string> {
  try {
    // Initialize OpenRouter service
    const openRouter = new OpenRouterService({
      apiKey,
      defaultModel: "anthropic/claude-3.5-sonnet",
    });

    // Build prompt with tournament performance data
    const result = command.result;
    const prompt = `Analyze this darts tournament performance and provide constructive feedback:

Tournament: ${command.name}
Date: ${command.date}

Performance Metrics:
- Average Score: ${result.average_score}
- First Nine Average: ${result.first_nine_avg}
- Checkout Percentage: ${result.checkout_percentage}%
- High Finish: ${result.high_finish}
- Best Leg: ${result.best_leg} darts
- Worst Leg: ${result.worst_leg} darts
- Score Counts: ${result.score_60_count} (60+), ${result.score_100_count} (100+), ${result.score_140_count} (140+), ${result.score_180_count} (180s)

Provide brief, encouraging feedback (2-3 sentences) highlighting:
1. Key strengths based on the metrics
2. One specific area for improvement
3. Motivational closing

Keep the tone positive, supportive, and professional.`;

    const messages: ChatMessage[] = [
      {
        role: "user",
        content: prompt,
      },
    ];

    // Send chat request
    const response = await openRouter.sendChat(messages);

    // Extract feedback from response
    if (response.choices && response.choices.length > 0) {
      return response.choices[0].message.content || "Great performance! Keep up the good work.";
    }

    return "Great performance! Keep up the good work.";
  } catch {
    // Error generating tournament feedback
    // Return a default message if AI feedback fails
    return "Tournament recorded successfully! Keep practicing to improve your game.";
  }
}

/**
 * Fetches tournaments for a user with pagination and sorting
 */
export async function getTournaments(
  supabase: SupabaseClient,
  userId: string,
  options: {
    limit: number;
    offset: number;
    sort: "date_asc" | "date_desc";
  }
): Promise<{ data: TournamentSummaryDTO[] | null; error: ServiceError }> {
  try {
    // Build query with tournaments and their results
    let query = supabase
      .from("tournaments")
      .select(
        `
        id,
        name,
        date,
        tournament_match_results (
          average_score
        )
      `
      )
      .eq("user_id", userId);

    // Apply sorting
    if (options.sort === "date_asc") {
      query = query.order("date", { ascending: true });
    } else {
      query = query.order("date", { ascending: false });
    }

    // Apply pagination
    query = query.range(options.offset, options.offset + options.limit - 1);

    const { data, error } = await query;

    if (error) {
      return { data: null, error };
    }

    // Transform data to TournamentSummaryDTO
    const tournaments: TournamentSummaryDTO[] = (data || []).map((tournament) => {
      // Calculate average score from all match results
      const results = tournament.tournament_match_results || [];
      const totalAvg = results.reduce((sum, result) => sum + (result.average_score || 0), 0);
      const averageScore = results.length > 0 ? totalAvg / results.length : 0;

      return {
        id: tournament.id,
        name: tournament.name,
        date: tournament.date,
        average_score: averageScore,
      };
    });

    return { data: tournaments, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Fetches a single tournament with all its results
 */
export async function getTournamentById(
  supabase: SupabaseClient,
  tournamentId: string,
  userId: string
): Promise<{ data: TournamentDetailDTO | null; error: ServiceError }> {
  try {
    const { data, error } = await supabase
      .from("tournaments")
      .select(
        `
        id,
        name,
        date,
        tournament_match_results (
          match_type_id,
          average_score,
          first_nine_avg,
          checkout_percentage,
          score_60_count,
          score_100_count,
          score_140_count,
          score_180_count,
          high_finish,
          best_leg,
          worst_leg
        )
      `
      )
      .eq("id", tournamentId)
      .eq("user_id", userId)
      .single();

    if (error) {
      return { data: null, error };
    }

    // Transform nested results to TournamentResultDTO[]
    const results: TournamentResultDTO[] = (data.tournament_match_results || []).map((result) => ({
      match_type_id: result.match_type_id,
      average_score: result.average_score,
      first_nine_avg: result.first_nine_avg,
      checkout_percentage: result.checkout_percentage,
      score_60_count: result.score_60_count,
      score_100_count: result.score_100_count,
      score_140_count: result.score_140_count,
      score_180_count: result.score_180_count,
      high_finish: result.high_finish,
      best_leg: result.best_leg,
      worst_leg: result.worst_leg,
    }));

    const tournament: TournamentDetailDTO = {
      id: data.id,
      name: data.name,
      date: data.date,
      results,
    };

    return { data: tournament, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Creates a new tournament with an initial result and AI-generated feedback
 */
export async function createTournament(
  supabase: SupabaseClient,
  userId: string,
  command: CreateTournamentCommand
): Promise<{ data: CreateTournamentResponseDTO | null; error: ServiceError }> {
  try {
    // Creating tournament with command and User ID

    // Insert tournament
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .insert({
        user_id: userId,
        name: command.name,
        date: command.date,
      })
      .select("id, created_at")
      .single();

    if (tournamentError) {
      // Error inserting tournament
      return { data: null, error: tournamentError };
    }

    // Tournament created successfully

    // Insert tournament result
    const resultData = {
      tournament_id: tournament.id,
      match_type_id: command.result.match_type_id,
      average_score: command.result.average_score,
      first_nine_avg: command.result.first_nine_avg,
      checkout_percentage: command.result.checkout_percentage,
      score_60_count: command.result.score_60_count,
      score_100_count: command.result.score_100_count,
      score_140_count: command.result.score_140_count,
      score_180_count: command.result.score_180_count,
      high_finish: command.result.high_finish,
      best_leg: command.result.best_leg,
      worst_leg: command.result.worst_leg,
    };

    // Inserting result with data

    const { error: resultError } = await supabase.from("tournament_match_results").insert(resultData);

    if (resultError) {
      // If result insertion fails, we should ideally rollback the tournament
      // For now, return the error
      // Error inserting tournament result
      return { data: null, error: resultError };
    }

    // Tournament result created successfully

    // Generate AI feedback based on performance (optional)
    let feedback: string | undefined;
    const apiKey = import.meta.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      // OPENROUTER_API_KEY is not configured. Skipping AI feedback generation.
    } else {
      feedback = await generateTournamentFeedback(command, apiKey);
    }

    const response: CreateTournamentResponseDTO = {
      id: tournament.id,
      created_at: tournament.created_at,
      feedback,
    };

    return { data: response, error: null };
  } catch (error) {
    // Unexpected error in createTournament
    return { data: null, error };
  }
}
