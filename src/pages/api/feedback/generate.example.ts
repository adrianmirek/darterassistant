/**
 * Example API Endpoint: Generate Tournament Feedback
 * 
 * This file demonstrates how to use OpenRouterService in an Astro API endpoint.
 * Rename this file to `generate.ts` to activate it.
 * 
 * Endpoint: POST /api/feedback/generate
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { OpenRouterService } from '../../../lib/services/openrouter.service';
import {
  OpenRouterApiError,
  OpenRouterValidationError,
  OpenRouterNetworkError,
} from '../../../lib/errors/openrouter.errors';
import type {
  ChatMessage,
  ResponseFormat,
} from '../../../types/openrouter.types';

// Disable pre-rendering for this API route
export const prerender = false;

// Input validation schema
const GenerateFeedbackSchema = z.object({
  tournament_id: z.string().uuid(),
  average_score: z.number().min(0).max(180),
  checkout_percentage: z.number().min(0).max(100),
  score_180_count: z.number().int().min(0),
  high_finish: z.number().int().min(0).max(170),
  tone_preference: z
    .enum(['encouraging', 'motivational', 'analytical', 'celebratory'])
    .optional()
    .default('motivational'),
});

// Response format for structured feedback
const feedbackResponseFormat: ResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'TournamentFeedback',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Main feedback message (2-3 paragraphs)',
        },
        tone: {
          type: 'string',
          enum: ['encouraging', 'motivational', 'analytical', 'celebratory'],
        },
        highlights: {
          type: 'array',
          items: { type: 'string' },
          description: 'Key achievements from the tournament',
        },
        areas_for_improvement: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific areas to focus on',
        },
        next_practice_focus: {
          type: 'string',
          description: 'Recommended practice focus for next session',
        },
      },
      required: [
        'message',
        'tone',
        'highlights',
        'areas_for_improvement',
        'next_practice_focus',
      ],
      additionalProperties: false,
    },
  },
};

/**
 * POST /api/feedback/generate
 * Generate AI-powered feedback for a tournament performance
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Guard: Validate Content-Type
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return new Response(
        JSON.stringify({
          error: 'Content-Type must be application/json',
        }),
        { status: 415 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = GenerateFeedbackSchema.safeParse(body);

    // Guard: Validation failed
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: validationResult.error.errors,
        }),
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Guard: Check API key
    const apiKey = import.meta.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY is not configured');
      return new Response(
        JSON.stringify({
          error: 'AI service is not configured',
        }),
        { status: 503 }
      );
    }

    // Initialize OpenRouter service
    const openRouterService = new OpenRouterService({
      apiKey,
      defaultModel: 'openai/gpt-4o-mini',
      defaultParams: {
        temperature: 0.7, // Balanced creativity
        max_tokens: 800,
      },
      logger: (level, message, logData) => {
        // Custom logging for API endpoint
        console.log(`[OpenRouter] [${level}] ${message}`, logData || '');
      },
    });

    // Prepare tournament summary for the AI
    const tournamentSummary = `
Tournament Performance Summary:
- Average Score: ${data.average_score}
- Checkout Percentage: ${data.checkout_percentage}%
- Number of 180s: ${data.score_180_count}
- Highest Finish: ${data.high_finish}
    `.trim();

    // Build chat messages
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an experienced darts coach providing personalized feedback. 
Your tone should be ${data.tone_preference}. 
Focus on being constructive, specific, and actionable in your advice.
Acknowledge both strengths and areas for improvement.`,
      },
      {
        role: 'user',
        content: `Generate feedback for this tournament performance:\n\n${tournamentSummary}`,
      },
    ];

    // Generate feedback using OpenRouter
    const response = await openRouterService.sendChat(
      messages,
      feedbackResponseFormat
    );

    // Extract parsed feedback
    const feedback = response.parsedContent;

    // Return successful response
    return new Response(
      JSON.stringify({
        tournament_id: data.tournament_id,
        feedback: {
          message: feedback.message,
          tone: feedback.tone,
          highlights: feedback.highlights,
          areas_for_improvement: feedback.areas_for_improvement,
          next_practice_focus: feedback.next_practice_focus,
        },
        metadata: {
          model: response.model,
          tokens_used: response.usage?.total_tokens || 0,
          generated_at: new Date().toISOString(),
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    // Handle OpenRouter-specific errors
    if (error instanceof OpenRouterApiError) {
      console.error('OpenRouter API Error:', {
        statusCode: error.statusCode,
        message: error.message,
        errorType: error.errorType,
      });

      // Map to appropriate HTTP status
      const statusCode = error.statusCode === 401 ? 503 : error.statusCode;

      return new Response(
        JSON.stringify({
          error: 'AI service error',
          message: error.message,
          type: 'api_error',
        }),
        { status: statusCode }
      );
    }

    if (error instanceof OpenRouterValidationError) {
      console.error('OpenRouter Validation Error:', error.validationErrors);

      return new Response(
        JSON.stringify({
          error: 'AI response validation failed',
          message: error.message,
          type: 'validation_error',
        }),
        { status: 500 }
      );
    }

    if (error instanceof OpenRouterNetworkError) {
      console.error('OpenRouter Network Error:', error.message);

      return new Response(
        JSON.stringify({
          error: 'Network error',
          message: 'Failed to connect to AI service',
          type: 'network_error',
        }),
        { status: 503 }
      );
    }

    // Handle unexpected errors
    console.error('Unexpected error in feedback generation:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'An unexpected error occurred',
        type: 'unknown_error',
      }),
      { status: 500 }
    );
  }
};

/**
 * Example cURL request:
 * 
 * curl -X POST http://localhost:4321/api/feedback/generate \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "tournament_id": "550e8400-e29b-41d4-a716-446655440000",
 *     "average_score": 78.5,
 *     "checkout_percentage": 32,
 *     "score_180_count": 2,
 *     "high_finish": 121,
 *     "tone_preference": "motivational"
 *   }'
 */

/**
 * Example fetch from frontend:
 * 
 * const response = await fetch('/api/feedback/generate', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     tournament_id: tournamentId,
 *     average_score: 78.5,
 *     checkout_percentage: 32,
 *     score_180_count: 2,
 *     high_finish: 121,
 *     tone_preference: 'motivational'
 *   })
 * });
 * 
 * const data = await response.json();
 * console.log(data.feedback.message);
 */

