import type { APIRoute } from 'astro';
import { z } from 'zod';
import type { TournamentDetailDTO } from '../../../types';
import { getTournamentById } from '../../../lib/services/tournament.service';

export const prerender = false;

// Validation schema for UUID
const uuidSchema = z.string().uuid();

/**
 * GET /api/tournaments/:id
 * Retrieves detailed information about a specific tournament
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

    // Fetch tournament using service
    const { data, error } = await getTournamentById(
      locals.supabase,
      tournamentId,
      locals.user.id
    );

    // Handle not found error
    if (error && error.code === 'PGRST116') {
      return new Response(JSON.stringify({ error: 'Tournament not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (error) {
      console.error('Error fetching tournament:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // If no data returned, tournament doesn't exist or user doesn't own it
    if (!data) {
      return new Response(JSON.stringify({ error: 'Tournament not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tournament: TournamentDetailDTO = data;

    return new Response(JSON.stringify(tournament), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/tournaments/:id:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

