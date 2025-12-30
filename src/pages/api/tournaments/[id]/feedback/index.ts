import type { APIRoute } from "astro";
import { z } from "zod";
import type { GenerateFeedbackCommand } from "../../../../../types";
import { generateAndSaveFeedback } from "../../../../../lib/services/tournament.service";

export const prerender = false;

// Validation schema for UUID
const uuidSchema = z.string().uuid();

// Validation schema for tone preferences (flexible structure)
const tonePreferencesSchema = z.record(z.any()).optional();

// Validation schema for feedback generation request
const generateFeedbackSchema = z
  .object({
    tone_preferences: tonePreferencesSchema,
    language: z.enum(["en", "pl"]).optional(),
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
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Extract and validate tournament ID
    const idResult = uuidSchema.safeParse(params.id);

    if (!idResult.success) {
      return new Response(JSON.stringify({ error: "Invalid tournament ID format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse and validate request body (optional)
    let body: GenerateFeedbackCommand | undefined;
    try {
      const rawBody = await request.text();
      if (rawBody && rawBody.trim() !== "") {
        body = JSON.parse(rawBody);

        const validationResult = generateFeedbackSchema.safeParse(body);
        if (!validationResult.success) {
          return new Response(
            JSON.stringify({
              error: "Invalid request body",
              details: validationResult.error.errors,
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        body = validationResult.data;
      }
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Generate and save AI feedback with language support
    const language = body?.language || "en";
    const { data, error } = await generateAndSaveFeedback(locals.supabase, idResult.data, locals.user.id, language);

    if (error) {
      // Check if it's a configuration error
      if (error.message?.includes("not configured")) {
        return new Response(JSON.stringify({ error: "AI service is not configured" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Check if tournament not found
      if (error.message?.includes("not found")) {
        return new Response(JSON.stringify({ error: "Tournament not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Generic error
      return new Response(JSON.stringify({ error: "Failed to generate feedback", details: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!data) {
      return new Response(JSON.stringify({ error: "Failed to generate feedback" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ feedback: data.feedback }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    // Unexpected error in POST /api/tournaments/:id/feedback
    return new Response(JSON.stringify({ error: "Failed to generate feedback" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
