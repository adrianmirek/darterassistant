import type { SupabaseClient } from '../../db/supabase.client';
import type {
  TournamentDetailDTO,
  GenerateFeedbackCommand,
  FeedbackResponseDTO,
  TonePreferencesDTO,
} from '../../types';
import { getTournamentById } from './tournament.service';
import { generateAIResponse, type AIMessage } from './ai.service';

/**
 * Service for generating motivational feedback
 */

/**
 * Builds a prompt for AI based on tournament data and tone preferences
 */
function buildFeedbackPrompt(
  tournament: TournamentDetailDTO,
  tonePreferences?: TonePreferencesDTO
): string {
  // Extract tournament statistics
  const results = tournament.results;
  const overallAvg =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.average_score, 0) / results.length
      : 0;

  const totalHighScores = results.reduce(
    (sum, r) =>
      sum + r.score_60_count + r.score_100_count + r.score_140_count + r.score_180_count,
    0
  );

  const bestCheckoutPercentage = Math.max(
    ...results.map((r) => r.checkout_percentage),
    0
  );
  const highestFinish = Math.max(...results.map((r) => r.high_finish), 0);

  // Build tone instruction
  let toneInstruction = 'Be encouraging and motivational';
  if (tonePreferences) {
    const style = tonePreferences.style || 'encouraging';
    const level = tonePreferences.level || 'casual';
    toneInstruction = `Use a ${style} tone with a ${level} style`;
  }

  // Build the prompt
  const prompt = `You are a darts coach providing motivational feedback to a player based on their tournament performance.

Tournament: "${tournament.name}" on ${tournament.date}

Performance Statistics:
- Overall Average Score: ${overallAvg.toFixed(2)}
- Total High Scores (60+): ${totalHighScores}
- Best Checkout Percentage: ${bestCheckoutPercentage.toFixed(1)}%
- Highest Finish: ${highestFinish}

${toneInstruction}.

Provide a short, personalized motivational message (2-3 sentences) that:
1. Acknowledges their specific achievements
2. Encourages continued improvement
3. Is genuine and supportive

Message:`;

  return prompt;
}

/**
 * Generates motivational feedback for a tournament
 */
export async function generateFeedback(
  supabase: SupabaseClient,
  tournamentId: string,
  userId: string,
  command?: GenerateFeedbackCommand
): Promise<{ data: FeedbackResponseDTO | null; error: any }> {
  try {
    // Fetch tournament details
    const { data: tournament, error: tournamentError } = await getTournamentById(
      supabase,
      tournamentId,
      userId
    );

    if (tournamentError || !tournament) {
      return { data: null, error: tournamentError || new Error('Tournament not found') };
    }

    // Build AI prompt
    const prompt = buildFeedbackPrompt(tournament, command?.tone_preferences);

    // Call AI service
    const messages: AIMessage[] = [{ role: 'user', content: prompt }];

    const { response: aiResponse, error: aiError } = await generateAIResponse(messages, {
      temperature: 0.7,
      maxTokens: 200,
      timeout: 10000,
    });

    if (aiError || !aiResponse) {
      // Provide fallback message if AI fails
      const fallbackMessage = `Great effort in ${tournament.name}! Your performance shows dedication and skill. Keep practicing and you'll continue to improve!`;

      return {
        data: {
          message: fallbackMessage,
          tone: 'encouraging',
        },
        error: null,
      };
    }

    // Determine tone from preferences or default
    const tone = command?.tone_preferences?.style || 'encouraging';

    const feedback: FeedbackResponseDTO = {
      message: aiResponse.trim(),
      tone,
    };

    return { data: feedback, error: null };
  } catch (error) {
    // Provide fallback message on any unexpected error
    return {
      data: {
        message:
          'Great job on your tournament! Keep up the excellent work and continue striving for improvement!',
        tone: 'encouraging',
      },
      error: null,
    };
  }
}

