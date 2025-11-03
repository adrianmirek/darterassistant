import type { APIRoute } from 'astro';
import { z } from 'zod';
import type { GoalDTO } from '../../../types';
import { getGoalById } from '../../../lib/services/goal.service';

export const prerender = false;

// Validation schema for UUID
const uuidSchema = z.string().uuid();

/**
 * GET /api/goals/:id
 * Retrieves detailed information about a specific goal
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

    // Fetch goal using service
    const { data, error } = await getGoalById(locals.supabase, goalId, locals.user.id);

    // Handle not found error
    if (error && error.code === 'PGRST116') {
      return new Response(JSON.stringify({ error: 'Goal not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (error) {
      console.error('Error fetching goal:', error);
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

    const goal: GoalDTO = data;

    return new Response(JSON.stringify(goal), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/goals/:id:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

