import type { APIRoute } from 'astro';
import { z } from 'zod';
import type { GoalProgressDTO } from '../../../../../types';
import { getGoalProgressById } from '../../../../../lib/services/goal.service';

export const prerender = false;

// Validation schema for UUID
const uuidSchema = z.string().uuid();

/**
 * GET /api/goals/:id/progress
 * Retrieves progress information for a specific goal
 * Requires authentication and ownership
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    // Check authentication
    if (!locals.user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Extract and validate goal ID
    const idResult = uuidSchema.safeParse(params.id);

    if (!idResult.success) {
      return new Response(JSON.stringify({ error: 'Invalid goal ID format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const goalId = idResult.data;

    // Fetch goal progress using service
    const { data, error } = await getGoalProgressById(
      locals.supabase,
      goalId,
      locals.user.id
    );

    // Handle not found error
    if (error && error.code === 'PGRST116') {
      return new Response(JSON.stringify({ error: 'Goal not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (error) {
      console.error('Error fetching goal progress:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If no data returned, goal doesn't exist or user doesn't own it
    if (!data) {
      return new Response(JSON.stringify({ error: 'Goal not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const progress: GoalProgressDTO = data;

    return new Response(JSON.stringify(progress), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/goals/:id/progress:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

