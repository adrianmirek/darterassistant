import type { ApiSuccessResponse, ApiErrorResponse, PaginationMetadata } from "../../types";

/**
 * Utility functions for creating standardized API responses
 */

/**
 * Create a successful API response
 */
export function createSuccessResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Create an error API response
 */
export function createErrorResponse(code: string, message: string, details?: unknown): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}

/**
 * Calculate pagination metadata
 */
export function calculatePaginationMetadata(
  currentPage: number,
  pageSize: number,
  totalCount: number
): PaginationMetadata {
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  return {
    current_page: currentPage,
    page_size: pageSize,
    total_count: totalCount,
    total_pages: totalPages,
    has_next_page: hasNextPage,
    has_previous_page: hasPreviousPage,
  };
}
