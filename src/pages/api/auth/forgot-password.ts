import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createSupabaseServerInstance } from '@/db/supabase.client';
import { requestPasswordReset } from '@/lib/services/auth.service';

export const prerender = false;

const forgotPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const POST: APIRoute = async ({ request, cookies, url }) => {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request body
    const validation = forgotPasswordRequestSchema.safeParse(body);
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

    const { email } = validation.data;

    // Create Supabase client
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Build redirect URL for password reset
    const siteUrl = import.meta.env.SITE_URL || url.origin;
    const redirectUrl = `${siteUrl}/auth/reset-password`;

    // Request password reset email
    // Note: Always returns success to prevent email enumeration attacks
    await requestPasswordReset(supabase, email, redirectUrl);

    // Always return success message for security
    return new Response(
      JSON.stringify({
        message:
          'If an account exists with this email, you will receive password reset instructions.',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Forgot password API error:', error);
    
    // Still return success message to prevent information leakage
    return new Response(
      JSON.stringify({
        message:
          'If an account exists with this email, you will receive password reset instructions.',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

