import type { APIRoute } from 'astro';
import { z } from 'zod';
import type { GenerateFeedbackCommand, FeedbackResponseDTO } from '../../../../../types';
import { generateFeedback } from '../../../../../lib/services/feedback.service';

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

    // Generate feedback using service
    const { data, error } = await generateFeedback(
      locals.supabase,
      tournamentId,
      locals.user.id,
      body
    );

    // Handle tournament not found
    if (error && error.message === 'Tournament not found') {
      return new Response(JSON.stringify({ error: 'Tournament not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (error) {
      console.error('Error generating feedback:', error);
      // Return service unavailable if AI service fails
      return new Response(
        JSON.stringify({ error: 'Feedback service temporarily unavailable' }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const feedback: FeedbackResponseDTO = data!;

    return new Response(JSON.stringify(feedback), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
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

