import type { APIRoute } from 'astro';
import { z } from 'zod';
import type { GenerateFeedbackCommand, FeedbackResponseDTO } from '../../../../../types';
// TODO: Reimplement using OpenRouterService
// import { generateFeedback } from '../../../../../lib/services/feedback.service';

export const prerender = false;

// Validation schema for UUID
const uuidSchema = z.string().uuid();

// Validation schema for tone preferences (flexible structure)
const tonePreferencesSchema = z.record(z.any()).optional();

// Validation schema for feedback generation request
const generateFeedbackSchema = z
  .object({
    tone_preferences: tonePreferencesSchema,
  })
  .optional();

/**
 * POST /api/tournaments/:id/feedback
 * Generates AI-powered motivational feedback for a tournament
 * Requires authentication and ownership
 */
export const POST: APIRoute = async ({ params, locals, request }) => {
  try {
    // Check authentication
    if (!locals.user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Extract and validate tournament ID
    const idResult = uuidSchema.safeParse(params.id);

    if (!idResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid tournament ID format' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const tournamentId = idResult.data;

    // Parse and validate request body (optional)
    let body: GenerateFeedbackCommand | undefined;
    try {
      const rawBody = await request.text();
      if (rawBody && rawBody.trim() !== '') {
        body = JSON.parse(rawBody);

        const validationResult = generateFeedbackSchema.safeParse(body);
        if (!validationResult.success) {
          return new Response(
            JSON.stringify({
              error: 'Invalid request body',
              details: validationResult.error.errors,
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
        body = validationResult.data;
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // TODO: Reimplement feedback generation using OpenRouterService
    // Example implementation:
    // 1. Initialize OpenRouterService with API key
    // 2. Fetch tournament data
    // 3. Build prompt with tournament metrics
    // 4. Call sendChat() with appropriate messages
    // 5. Return structured feedback response
    
    return new Response(
      JSON.stringify({ error: 'Feedback generation temporarily unavailable - pending reimplementation' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/tournaments/:id/feedback:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate feedback' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

