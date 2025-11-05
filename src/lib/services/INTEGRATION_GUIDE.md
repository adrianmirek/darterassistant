# OpenRouter Service Integration Guide

## Integrating with Existing Feedback Service

This guide shows how to integrate the `OpenRouterService` with your existing `feedback.service.ts` to replace or supplement the current AI implementation.

## Current Architecture

Your app currently has:
- `src/lib/services/feedback.service.ts` - Feedback generation service
- `src/pages/api/tournaments/[id]/feedback/index.ts` - API endpoint for feedback

## Integration Steps

### Step 1: Update Environment Variables

Add OpenRouter API key to your environment:

```bash
# .env
OPENROUTER_API_KEY=your_openrouter_api_key
```

### Step 2: Update feedback.service.ts

Here's an example of how to integrate OpenRouterService into your existing feedback service:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import { OpenRouterService } from './openrouter.service';
import {
  OpenRouterApiError,
  OpenRouterNetworkError,
} from '../errors/openrouter.errors';
import type { ChatMessage, ResponseFormat } from '../../types/openrouter.types';
import type {
  GenerateFeedbackCommand,
  FeedbackResponseDTO,
  TournamentDetailDTO,
} from '../../types';

// Define the response schema for structured feedback
const FEEDBACK_RESPONSE_FORMAT: ResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'TournamentFeedback',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Personalized motivational feedback (2-3 paragraphs)',
        },
        tone: {
          type: 'string',
          description: 'The tone used in the feedback',
        },
      },
      required: ['message', 'tone'],
      additionalProperties: false,
    },
  },
};

export async function generateFeedback(
  supabase: SupabaseClient,
  tournamentId: string,
  userId: string,
  command?: GenerateFeedbackCommand
): Promise<{ data?: FeedbackResponseDTO; error?: Error }> {
  try {
    // 1. Fetch tournament data
    const { data: tournament, error: fetchError } = await supabase
      .from('tournaments')
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
      .eq('id', tournamentId)
      .eq('user_id', userId)
      .single();

    // Guard: Tournament not found
    if (fetchError || !tournament) {
      return { error: new Error('Tournament not found') };
    }

    // 2. Extract performance metrics
    const result = tournament.tournament_match_results[0];
    const metrics = {
      average_score: result.average_score,
      checkout_percentage: result.checkout_percentage,
      score_180_count: result.score_180_count,
      high_finish: result.high_finish,
      best_leg: result.best_leg,
      worst_leg: result.worst_leg,
    };

    // 3. Determine tone preference
    const tonePreference = command?.tone_preferences?.tone || 'motivational';

    // 4. Initialize OpenRouter service
    const apiKey = import.meta.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error('OPENROUTER_API_KEY not configured');
      return { error: new Error('AI service not configured') };
    }

    const openRouterService = new OpenRouterService({
      apiKey,
      defaultModel: 'openai/gpt-4o-mini',
      defaultParams: {
        temperature: 0.7,
        max_tokens: 600,
      },
      logger: (level, message, data) => {
        console.log(`[OpenRouter] [${level}] ${message}`, data || '');
      },
    });

    // 5. Build context and messages
    const tournamentContext = `
Tournament: ${tournament.name}
Date: ${tournament.date}
Performance Metrics:
- Average Score: ${metrics.average_score}
- Checkout Percentage: ${metrics.checkout_percentage}%
- Number of 180s: ${metrics.score_180_count}
- Highest Finish: ${metrics.high_finish}
- Best Leg: ${metrics.best_leg} darts
- Worst Leg: ${metrics.worst_leg} darts
    `.trim();

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a supportive and experienced darts coach. 
Provide personalized, ${tonePreference} feedback based on tournament performance.
Be specific about achievements and provide actionable advice for improvement.
Write in a warm, conversational tone that motivates continued practice.`,
      },
      {
        role: 'user',
        content: `Generate feedback for this tournament performance:\n\n${tournamentContext}`,
      },
    ];

    // 6. Generate feedback
    const response = await openRouterService.sendChat(
      messages,
      FEEDBACK_RESPONSE_FORMAT
    );

    // 7. Extract and return feedback
    const feedback = response.parsedContent;

    return {
      data: {
        message: feedback.message,
        tone: feedback.tone,
      },
    };
  } catch (error) {
    // Handle OpenRouter errors
    if (error instanceof OpenRouterApiError) {
      console.error('OpenRouter API Error:', {
        statusCode: error.statusCode,
        message: error.message,
      });
      return { error: new Error('AI service error') };
    }

    if (error instanceof OpenRouterNetworkError) {
      console.error('OpenRouter Network Error:', error.message);
      return { error: new Error('Network error') };
    }

    // Handle unexpected errors
    console.error('Unexpected error in generateFeedback:', error);
    return { error: error as Error };
  }
}
```

### Step 3: Update Types (if needed)

Ensure your `FeedbackResponseDTO` matches the OpenRouter output:

```typescript
// src/types.ts
export type FeedbackResponseDTO = {
  message: string;
  tone: string;
};
```

### Step 4: Test the Integration

Use the existing API endpoint:

```bash
curl -X POST http://localhost:4321/api/tournaments/{tournament-id}/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "tone_preferences": {
      "tone": "motivational"
    }
  }'
```

## Advanced Integration Options

### Option 1: Add Structured Feedback with More Fields

Extend the response format to include highlights and recommendations:

```typescript
const FEEDBACK_RESPONSE_FORMAT: ResponseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'TournamentFeedback',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        tone: { type: 'string' },
        highlights: {
          type: 'array',
          items: { type: 'string' }
        },
        improvements: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['message', 'tone', 'highlights', 'improvements'],
      additionalProperties: false,
    },
  },
};
```

### Option 2: Use Different Models for Different Tones

```typescript
function selectModelForTone(tone: string): string {
  switch (tone) {
    case 'analytical':
      return 'anthropic/claude-3.5-sonnet'; // More analytical
    case 'celebratory':
      return 'openai/gpt-4o'; // More creative
    default:
      return 'openai/gpt-4o-mini'; // Cost-effective default
  }
}

const openRouterService = new OpenRouterService({
  apiKey,
  defaultModel: selectModelForTone(tonePreference),
});
```

### Option 3: Add Caching for Similar Performances

Cache feedback for similar performance metrics to reduce API calls:

```typescript
function generateCacheKey(metrics: any): string {
  return `feedback_${Math.round(metrics.average_score)}_${Math.round(metrics.checkout_percentage)}`;
}

// Check cache first
const cacheKey = generateCacheKey(metrics);
const cached = await getFromCache(cacheKey);
if (cached) {
  return { data: cached };
}

// Generate new feedback
const feedback = await openRouterService.sendChat(...);

// Cache result
await saveToCache(cacheKey, feedback, 3600); // 1 hour TTL
```

## Error Handling Best Practices

Update your API endpoint error handling:

```typescript
export const POST: APIRoute = async ({ params, locals, request }) => {
  try {
    const { data, error } = await generateFeedback(
      locals.supabase,
      tournamentId,
      locals.user.id,
      body
    );

    if (error) {
      // Map error types to appropriate HTTP status codes
      if (error.message === 'Tournament not found') {
        return new Response(
          JSON.stringify({ error: 'Tournament not found' }),
          { status: 404 }
        );
      }
      
      if (error.message === 'AI service not configured') {
        return new Response(
          JSON.stringify({ error: 'Service temporarily unavailable' }),
          { status: 503 }
        );
      }

      if (error.message === 'AI service error' || error.message === 'Network error') {
        return new Response(
          JSON.stringify({ error: 'Feedback service temporarily unavailable' }),
          { status: 503 }
        );
      }

      // Generic error
      return new Response(
        JSON.stringify({ error: 'Failed to generate feedback' }),
        { status: 500 }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
};
```

## Migration Checklist

- [ ] Add `OPENROUTER_API_KEY` to environment variables
- [ ] Install `ajv` dependency (already done)
- [ ] Update `feedback.service.ts` to use OpenRouterService
- [ ] Update error handling in API endpoints
- [ ] Test with various tournament performances
- [ ] Monitor token usage and costs
- [ ] Set up logging in production
- [ ] Consider caching strategy for frequently accessed data
- [ ] Update frontend to handle new response structure (if changed)

## Cost Optimization

### Monitor Usage
```typescript
const response = await openRouterService.sendChat(messages, format);
console.log('Tokens used:', response.usage?.total_tokens);
console.log('Model:', response.model);
```

### Set Limits
```typescript
const openRouterService = new OpenRouterService({
  apiKey,
  defaultParams: {
    max_tokens: 400, // Limit response length
    temperature: 0.7,
  },
});
```

### Choose Cost-Effective Models
- `openai/gpt-4o-mini` - ~$0.15 per 1M input tokens
- `anthropic/claude-3-haiku` - ~$0.25 per 1M input tokens
- `meta-llama/llama-3.1-8b-instruct` - Free tier available

See [OpenRouter Pricing](https://openrouter.ai/models) for current rates.

## Support

For integration help:
1. Check the examples in `openrouter.service.example.ts`
2. Review error logs for specific error types
3. Test with the standalone example endpoint first
4. Monitor API usage on OpenRouter dashboard

