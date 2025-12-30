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
 * Generate AI-powered performance feedback based on tournament results with multiple matches
 */
async function generateTournamentFeedback(
  command: CreateTournamentCommand,
  apiKey: string,
  language: "en" | "pl" = "en"
): Promise<string> {
  try {
    // Initialize OpenRouter service
    const openRouter = new OpenRouterService({
      apiKey,
      defaultModel: "anthropic/claude-3.5-sonnet",
    });

    // Build prompt with tournament performance data
    const matches = command.matches;

    // Language-specific prompts
    const prompts = {
      en: {
        analyze: "Analyze this darts tournament performance and provide constructive feedback:",
        tournament: "Tournament",
        date: "Date",
        totalMatches: "Total Matches",
        match: "Match",
        averageScore: "Average Score",
        firstNineAverage: "First Nine Average",
        checkoutPercentage: "Checkout Percentage",
        highFinish: "High Finish",
        bestLeg: "Best Leg",
        worstLeg: "Worst Leg",
        darts: "darts",
        scoreCounts: "Score Counts",
        overallStats: "Overall Statistics",
        avgAllMatches: "Average Score (all matches)",
        total180s: "Total 180s",
        instructions: `Provide brief, encouraging feedback (2-3 sentences) highlighting:
1. Key strengths based on the metrics
2. One specific area for improvement
3. Motivational closing

Keep the tone positive, supportive, and professional.`,
      },
      pl: {
        analyze: "Przeanalizuj wyniki tego turnieju w darty i przedstaw konstruktywną opinię:",
        tournament: "Turniej",
        date: "Data",
        totalMatches: "Liczba Meczów",
        match: "Mecz",
        averageScore: "Średnia Punktów",
        firstNineAverage: "Średnia z Pierwszych Dziewięciu",
        checkoutPercentage: "Procent Checkout",
        highFinish: "Najwyższe Wykończenie",
        bestLeg: "Najlepszy Leg",
        worstLeg: "Najgorszy Leg",
        darts: "rzutek",
        scoreCounts: "Liczba Wyników",
        overallStats: "Statystyki Ogólne",
        avgAllMatches: "Średnia Punktów (wszystkie mecze)",
        total180s: "Łączna liczba 180",
        instructions: `Przedstaw krótką, motywującą opinię (2-3 zdania) podkreślającą:
1. Kluczowe mocne strony na podstawie metryk
2. Jeden konkretny obszar do poprawy
3. Motywujące zakończenie

Zachowaj pozytywny, wspierający i profesjonalny ton. ODPOWIEDZ PO POLSKU.`,
      },
    };

    const p = prompts[language];

    let prompt = `${p.analyze}

${p.tournament}: ${command.name}
${p.date}: ${command.date}
${p.totalMatches}: ${matches.length}

`;

    // Add individual match details
    matches.forEach((match, index) => {
      prompt += `${p.match} ${index + 1}:
- ${p.averageScore}: ${match.average_score}
- ${p.firstNineAverage}: ${match.first_nine_avg}
- ${p.checkoutPercentage}: ${match.checkout_percentage}%
- ${p.highFinish}: ${match.high_finish}
- ${p.bestLeg}: ${match.best_leg} ${p.darts}
- ${p.worstLeg}: ${match.worst_leg} ${p.darts}
- ${p.scoreCounts}: ${match.score_60_count} (60+), ${match.score_100_count} (100+), ${match.score_140_count} (140+), ${match.score_180_count} (180s)

`;
    });

    // Add overall statistics
    const avgScore = matches.reduce((sum, m) => sum + (m.average_score || 0), 0) / matches.length;
    const total180s = matches.reduce((sum, m) => sum + (m.score_180_count || 0), 0);
    const bestLeg = Math.min(...matches.map((m) => m.best_leg || 9));

    prompt += `${p.overallStats}:
- ${p.avgAllMatches}: ${avgScore.toFixed(2)}
- ${p.total180s}: ${total180s}
- ${p.bestLeg}: ${bestLeg} ${p.darts}

${p.instructions}`;

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
        tournament_type_id,
        final_place,
        ai_feedback,
        tournament_types (
          name
        ),
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
        tournament_type_id: tournament.tournament_type_id,
        final_place: tournament.final_place,
        ai_feedback: tournament.ai_feedback,
        tournament_type_name: tournament.tournament_types?.name,
        average_score: averageScore,
      };
    });

    return { data: tournaments, error: null };
  } catch (error) {
    return { data: null, error: error as ServiceError };
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
        tournament_type_id,
        final_place,
        ai_feedback,
        tournament_types (
          name
        ),
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
          worst_leg,
          opponent_name,
          player_score,
          opponent_score
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
      opponent_name: result.opponent_name,
      player_score: result.player_score,
      opponent_score: result.opponent_score,
    }));

    const tournament: TournamentDetailDTO = {
      id: data.id,
      name: data.name,
      date: data.date,
      tournament_type_id: data.tournament_type_id,
      final_place: data.final_place,
      ai_feedback: data.ai_feedback,
      tournament_type_name: data.tournament_types?.name,
      results,
    };

    return { data: tournament, error: null };
  } catch (error) {
    return { data: null, error: error as ServiceError };
  }
}

/**
 * Generates AI feedback for an existing tournament and saves it to the database
 */
export async function generateAndSaveFeedback(
  supabase: SupabaseClient,
  tournamentId: string,
  userId: string,
  language: "en" | "pl" = "en"
): Promise<{ data: { feedback: string } | null; error: ServiceError }> {
  try {
    // Check API key
    const apiKey = import.meta.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return {
        data: null,
        error: { message: "AI service is not configured. OPENROUTER_API_KEY is missing." },
      };
    }

    // Fetch tournament with all matches
    const { data: tournamentData, error: fetchError } = await getTournamentById(supabase, tournamentId, userId);

    if (fetchError || !tournamentData) {
      return { data: null, error: fetchError || { message: "Tournament not found" } };
    }

    // Transform tournament data to CreateTournamentCommand format for feedback generation
    const command: CreateTournamentCommand = {
      name: tournamentData.name,
      date: tournamentData.date,
      tournament_type_id: tournamentData.tournament_type_id,
      final_place: tournamentData.final_place,
      matches: tournamentData.results.map((result) => ({
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
        opponent_name: result.opponent_name,
        player_score: result.player_score,
        opponent_score: result.opponent_score,
      })),
    };

    // Generate AI feedback with language support
    const feedback = await generateTournamentFeedback(command, apiKey, language);

    // Save feedback to database
    const { error: updateError } = await supabase
      .from("tournaments")
      .update({ ai_feedback: feedback })
      .eq("id", tournamentId)
      .eq("user_id", userId); // Ensure user owns this tournament

    if (updateError) {
      return { data: null, error: updateError };
    }

    return { data: { feedback }, error: null };
  } catch (error) {
    return { data: null, error: error as ServiceError };
  }
}

/**
 * Creates a new tournament with multiple matches
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
        tournament_type_id: command.tournament_type_id || 1, // Default to 1
        final_place: command.final_place || null, // Optional final placement
      })
      .select("id, created_at")
      .single();

    if (tournamentError) {
      // Error inserting tournament
      return { data: null, error: tournamentError };
    }

    // Tournament created successfully

    // Insert all tournament matches
    const matchInserts = command.matches.map((match) => ({
      tournament_id: tournament.id,
      match_type_id: match.match_type_id,
      average_score: match.average_score,
      first_nine_avg: match.first_nine_avg,
      checkout_percentage: match.checkout_percentage,
      score_60_count: match.score_60_count,
      score_100_count: match.score_100_count,
      score_140_count: match.score_140_count,
      score_180_count: match.score_180_count,
      high_finish: match.high_finish,
      best_leg: match.best_leg,
      worst_leg: match.worst_leg,
      opponent_name: match.opponent_name || null,
      player_score: match.player_score,
      opponent_score: match.opponent_score,
    }));

    const { error: matchesError } = await supabase.from("tournament_match_results").insert(matchInserts);

    if (matchesError) {
      // If match insertion fails, rollback by deleting the tournament
      await supabase.from("tournaments").delete().eq("id", tournament.id);
      // Error inserting tournament matches
      return { data: null, error: matchesError };
    }

    // Tournament matches created successfully
    // Return immediately - AI feedback will be generated in a separate request

    const response: CreateTournamentResponseDTO = {
      id: tournament.id,
      created_at: tournament.created_at,
    };

    return { data: response, error: null };
  } catch (error) {
    // Unexpected error in createTournament
    return { data: null, error: error as ServiceError };
  }
}
