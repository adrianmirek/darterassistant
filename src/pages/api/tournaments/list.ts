import type { APIRoute } from "astro";
import { z } from "zod";
import type { PaginatedTournamentsData, ApiResponse } from "../../../types";
import { getTournamentsPaginated } from "../../../lib/services/tournament.service";
import {
  createSuccessResponse,
  createErrorResponse,
  calculatePaginationMetadata,
} from "../../../lib/utils/api-response";
import { isValidISODate, isValidDateRange } from "../../../lib/utils/date.utils";

export const prerender = false;

// Validation schema for query parameters
const querySchema = z.object({
  start_date: z.string().min(1, "start_date is required"),
  end_date: z.string().min(1, "end_date is required"),
  page_size: z.string().optional().default("20").pipe(z.coerce.number().int().positive().min(1).max(100)),
  page: z.string().optional().default("1").pipe(z.coerce.number().int().positive().min(1)),
});

/**
 * GET /api/tournaments/list
 * Retrieves paginated list of tournaments with aggregated statistics for authenticated user
 * Requires authentication
 *
 * Query Parameters:
 * - start_date: ISO 8601 date (YYYY-MM-DD) - Required
 * - end_date: ISO 8601 date (YYYY-MM-DD) - Required
 * - page_size: Number of records per page (1-100) - Default: 20
 * - page: Page number (1-based) - Default: 1
 */
export const GET: APIRoute = async ({ locals, url }) => {
  try {
    // Check authentication
    if (!locals.user) {
      const response = createErrorResponse("UNAUTHORIZED", "Authentication required");
      return new Response(JSON.stringify(response), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse and validate query parameters
    const queryParams = {
      start_date: url.searchParams.get("start_date"),
      end_date: url.searchParams.get("end_date"),
      page_size: url.searchParams.get("page_size") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
    };

    const validationResult = querySchema.safeParse(queryParams);

    if (!validationResult.success) {
      const details = validationResult.error.errors.reduce(
        (acc, err) => {
          acc[err.path[0]] = err.message;
          return acc;
        },
        {} as Record<string, string>
      );

      const response = createErrorResponse("INVALID_PARAMETERS", "Invalid query parameters", details);
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { start_date, end_date, page_size, page } = validationResult.data;

    // Validate date format
    if (!isValidISODate(start_date)) {
      const response = createErrorResponse("INVALID_PARAMETERS", "Invalid start_date format. Expected YYYY-MM-DD", {
        start_date: "Must be in ISO 8601 format (YYYY-MM-DD)",
      });
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!isValidISODate(end_date)) {
      const response = createErrorResponse("INVALID_PARAMETERS", "Invalid end_date format. Expected YYYY-MM-DD", {
        end_date: "Must be in ISO 8601 format (YYYY-MM-DD)",
      });
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate date range
    if (!isValidDateRange(start_date, end_date)) {
      const response = createErrorResponse(
        "INVALID_DATE_RANGE",
        "End date must be greater than or equal to start date"
      );
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch paginated tournaments using service
    const { data, error } = await getTournamentsPaginated(
      locals.supabase,
      locals.user.id,
      start_date,
      end_date,
      page_size,
      page
    );

    if (error) {
      console.error("Error fetching paginated tournaments:", error);
      const response = createErrorResponse(
        "DATABASE_ERROR",
        "Failed to fetch tournaments",
        import.meta.env.DEV ? error.message : undefined
      );

      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!data) {
      const response = createErrorResponse("INTERNAL_ERROR", "No data returned from database");
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Calculate pagination metadata
    const pagination = calculatePaginationMetadata(page, page_size, data.totalCount);

    // Prepare response data
    const responseData: PaginatedTournamentsData = {
      tournaments: data.tournaments,
      pagination,
    };

    const response: ApiResponse<PaginatedTournamentsData> = createSuccessResponse(responseData);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/tournaments/list:", error);
    const response = createErrorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred",
      import.meta.env.DEV ? (error as Error).message : undefined
    );
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
