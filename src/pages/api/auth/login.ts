import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createSupabaseServerInstance } from '@/db/supabase.client';
import { loginUser } from '@/lib/services/auth.service';

export const prerender = false;

const loginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request body
    const validation = loginRequestSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: validation.error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { email, password } = validation.data;

    // Create Supabase client
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Authenticate user
    const { data, error } = await loginUser(supabase, email, password);

    if (error) {
      // Map Supabase errors to appropriate status codes
      let statusCode = 500;
      let errorMessage = 'Login failed';

      if (error.message?.includes('Invalid login credentials')) {
        statusCode = 401;
        errorMessage = 'Invalid email or password';
      } else if (error.message?.includes('Email not confirmed')) {
        statusCode = 401;
        errorMessage = 'Email not confirmed';
      } else if (error.message?.includes('too many requests')) {
        statusCode = 429;
        errorMessage = 'Too many login attempts. Please try again later.';
      }

      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          status: statusCode,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!data) {
      return new Response(
        JSON.stringify({ error: 'Login failed' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Cookies are automatically set by Supabase client via setAll
    // Return user and session data
    return new Response(
      JSON.stringify({
        user: data.user,
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Login API error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

