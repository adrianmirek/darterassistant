import { describe, it, expect } from "vitest";
import { createSuccessResponse, createErrorResponse, calculatePaginationMetadata } from "./api-response";

describe("API Response Utilities", () => {
  describe("createSuccessResponse", () => {
    it("should create a success response with data", () => {
      const data = { test: "value" };
      const response = createSuccessResponse(data);

      expect(response).toEqual({
        success: true,
        data: { test: "value" },
      });
    });

    it("should handle array data", () => {
      const data = [1, 2, 3];
      const response = createSuccessResponse(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual([1, 2, 3]);
    });
  });

  describe("createErrorResponse", () => {
    it("should create an error response with code and message", () => {
      const response = createErrorResponse("TEST_ERROR", "Test error message");

      expect(response).toEqual({
        success: false,
        error: {
          code: "TEST_ERROR",
          message: "Test error message",
        },
      });
    });

    it("should include details when provided", () => {
      const details = { field: "value is invalid" };
      const response = createErrorResponse("VALIDATION_ERROR", "Validation failed", details);

      expect(response).toEqual({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: { field: "value is invalid" },
        },
      });
    });

    it("should work without details", () => {
      const response = createErrorResponse("INTERNAL_ERROR", "Something went wrong");

      expect(response.error.details).toBeUndefined();
    });
  });

  describe("calculatePaginationMetadata", () => {
    it("should calculate pagination metadata correctly", () => {
      const metadata = calculatePaginationMetadata(1, 20, 100);

      expect(metadata).toEqual({
        current_page: 1,
        page_size: 20,
        total_count: 100,
        total_pages: 5,
        has_next_page: true,
        has_previous_page: false,
      });
    });

    it("should handle last page correctly", () => {
      const metadata = calculatePaginationMetadata(5, 20, 100);

      expect(metadata).toEqual({
        current_page: 5,
        page_size: 20,
        total_count: 100,
        total_pages: 5,
        has_next_page: false,
        has_previous_page: true,
      });
    });

    it("should handle middle page correctly", () => {
      const metadata = calculatePaginationMetadata(3, 20, 100);

      expect(metadata).toEqual({
        current_page: 3,
        page_size: 20,
        total_count: 100,
        total_pages: 5,
        has_next_page: true,
        has_previous_page: true,
      });
    });

    it("should handle single page correctly", () => {
      const metadata = calculatePaginationMetadata(1, 20, 10);

      expect(metadata).toEqual({
        current_page: 1,
        page_size: 20,
        total_count: 10,
        total_pages: 1,
        has_next_page: false,
        has_previous_page: false,
      });
    });

    it("should handle empty results correctly", () => {
      const metadata = calculatePaginationMetadata(1, 20, 0);

      expect(metadata).toEqual({
        current_page: 1,
        page_size: 20,
        total_count: 0,
        total_pages: 0,
        has_next_page: false,
        has_previous_page: false,
      });
    });

    it("should handle partial last page correctly", () => {
      const metadata = calculatePaginationMetadata(3, 20, 55);

      expect(metadata).toEqual({
        current_page: 3,
        page_size: 20,
        total_count: 55,
        total_pages: 3,
        has_next_page: false,
        has_previous_page: true,
      });
    });
  });
});
