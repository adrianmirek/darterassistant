import type { APIRoute } from 'astro';
import { z } from 'zod';
import type { GoalDTO, CreateGoalCommand, CreateGoalResponseDTO } from '../../../types';
import { getGoals, createGoal } from '../../../lib/services/goal.service';

export const prerender = false;

// Validation schema for query parameters
const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
});

// Validation schema for creating a goal
const createGoalSchema = z
  .object({
    target_avg: z.number().positive(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .refine((data) => new Date(data.end_date) > new Date(data.start_date), {
    message: 'end_date must be after start_date',
    path: ['end_date'],
  });

/**
 * GET /api/goals
 * Retrieves paginated list of goals for authenticated user
 * Requires authentication
 */
export const GET: APIRoute = async ({ locals, url }) => {
  try {
    // Check authentication
    if (!locals.user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse and validate query parameters
    const queryParams = {
      limit: url.searchParams.get('limit'),
      offset: url.searchParams.get('offset'),
    };

    const validationResult = querySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid query parameters',
          details: validationResult.error.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { limit, offset } = validationResult.data;

    // Fetch goals using service
    const { data, error } = await getGoals(locals.supabase, locals.user.id, {
      limit,
      offset,
    });

    if (error) {
      console.error('Error fetching goals:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const goals: GoalDTO[] = data || [];

    return new Response(JSON.stringify(goals), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/goals:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * POST /api/goals
 * Creates a new goal for authenticated user
 * Requires authentication
 */
export const POST: APIRoute = async ({ locals, request }) => {
  try {
    // Check authentication
    if (!locals.user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate request body
    const validationResult = createGoalSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: validationResult.error.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const command: CreateGoalCommand = validationResult.data;

    // Create goal using service
    const { data, error } = await createGoal(locals.supabase, locals.user.id, command);

    if (error) {
      // Check for exclusion constraint violation (overlapping dates)
      if (error.code === '23P01') {
        return new Response(
          JSON.stringify({ error: 'Goal dates overlap with an existing goal' }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      console.error('Error creating goal:', error);
      return new Response(JSON.stringify({ error: 'Failed to create goal' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response: CreateGoalResponseDTO = data!;

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/goals:', error);
    return new Response(JSON.stringify({ error: 'Failed to create goal' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

