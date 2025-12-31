import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIContext } from "astro";
import type { SupabaseClient } from "../../../db/supabase.client";
import type { UserDTO, SessionDTO } from "../../../types";
import { GET } from "./list";

/**
 * Integration tests for GET /api/tournaments/list endpoint
 * Note: These are unit tests with mocks. For full integration tests, use Supertest with a test server.
 */

interface MockLocals {
  supabase: SupabaseClient;
  user: UserDTO | null;
  session: SessionDTO | null;
}

describe("GET /api/tournaments/list", () => {
  let mockContext: Partial<APIContext> & { locals: MockLocals };

  beforeEach(() => {
    mockContext = {
      url: new URL("http://localhost:4321/api/tournaments/list?start_date=2024-01-01&end_date=2024-12-31"),
      cookies: vi.fn() as unknown as APIContext["cookies"],
      locals: {
        supabase: {
          rpc: vi.fn(),
        } as unknown as SupabaseClient,
        user: {
          id: "test-user-id",
          email: "test@example.com",
        },
        session: null,
      },
    };
  });

  describe("Authentication", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockContext.locals.user = null;

      const response = await GET(mockContext as APIContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("UNAUTHORIZED");
    });

    it("should allow authenticated users", async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockContext.locals.supabase = { rpc: mockRpc } as unknown as SupabaseClient;

      const response = await GET(mockContext as APIContext);

      expect(response.status).toBe(200);
    });
  });

  describe("Query Parameter Validation", () => {
    it("should require start_date parameter", async () => {
      mockContext.url = new URL("http://localhost:4321/api/tournaments/list?end_date=2024-12-31");

      const response = await GET(mockContext as APIContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("INVALID_PARAMETERS");
    });

    it("should require end_date parameter", async () => {
      mockContext.url = new URL("http://localhost:4321/api/tournaments/list?start_date=2024-01-01");

      const response = await GET(mockContext as APIContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("INVALID_PARAMETERS");
    });

    it("should validate start_date format", async () => {
      mockContext.url = new URL("http://localhost:4321/api/tournaments/list?start_date=2024/01/01&end_date=2024-12-31");

      const response = await GET(mockContext as APIContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("INVALID_PARAMETERS");
    });

    it("should validate end_date format", async () => {
      mockContext.url = new URL("http://localhost:4321/api/tournaments/list?start_date=2024-01-01&end_date=invalid");

      const response = await GET(mockContext as APIContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("INVALID_PARAMETERS");
    });

    it("should validate date range (end_date >= start_date)", async () => {
      mockContext.url = new URL("http://localhost:4321/api/tournaments/list?start_date=2024-12-31&end_date=2024-01-01");

      const response = await GET(mockContext as APIContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("INVALID_DATE_RANGE");
    });

    it("should use default page_size of 20", async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockContext.locals.supabase = { rpc: mockRpc } as unknown as SupabaseClient;

      await GET(mockContext as APIContext);

      expect(mockRpc).toHaveBeenCalledWith(
        "get_tournaments_paginated",
        expect.objectContaining({
          p_page_size: 20,
        })
      );
    });

    it("should use default page of 1", async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockContext.locals.supabase = { rpc: mockRpc } as unknown as SupabaseClient;

      await GET(mockContext as APIContext);

      expect(mockRpc).toHaveBeenCalledWith(
        "get_tournaments_paginated",
        expect.objectContaining({
          p_page_number: 1,
        })
      );
    });

    it("should accept custom page_size", async () => {
      mockContext.url = new URL(
        "http://localhost:4321/api/tournaments/list?start_date=2024-01-01&end_date=2024-12-31&page_size=50"
      );

      const mockRpc = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockContext.locals.supabase = { rpc: mockRpc } as unknown as SupabaseClient;

      await GET(mockContext as APIContext);

      expect(mockRpc).toHaveBeenCalledWith(
        "get_tournaments_paginated",
        expect.objectContaining({
          p_page_size: 50,
        })
      );
    });

    it("should reject page_size above 100", async () => {
      mockContext.url = new URL(
        "http://localhost:4321/api/tournaments/list?start_date=2024-01-01&end_date=2024-12-31&page_size=101"
      );

      const response = await GET(mockContext as APIContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("INVALID_PARAMETERS");
    });

    it("should reject page_size below 1", async () => {
      mockContext.url = new URL(
        "http://localhost:4321/api/tournaments/list?start_date=2024-01-01&end_date=2024-12-31&page_size=0"
      );

      const response = await GET(mockContext as APIContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("INVALID_PARAMETERS");
    });
  });

  describe("Successful Response", () => {
    it("should return empty tournaments list when no data", async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockContext.locals.supabase = { rpc: mockRpc } as unknown as SupabaseClient;

      const response = await GET(mockContext as APIContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.tournaments).toEqual([]);
      expect(data.data.pagination.total_count).toBe(0);
    });

    it("should return tournaments with pagination metadata", async () => {
      const mockData = [
        {
          tournament_id: "123",
          tournament_name: "Test Tournament",
          tournament_date: "2024-06-15",
          final_place: 1,
          tournament_type_name: "League",
          ai_feedback: "Great performance!",
          tournament_avg: 85.5,
          total_180s: 2,
          total_140_plus: 5,
          total_100_plus: 10,
          total_60_plus: 15,
          avg_checkout_percentage: 40.5,
          best_high_finish: 120,
          best_leg: 12,
          matches: [],
          total_count: 1,
        },
      ];

      const mockRpc = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });

      mockContext.locals.supabase = { rpc: mockRpc } as unknown as SupabaseClient;

      const response = await GET(mockContext as APIContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.tournaments).toHaveLength(1);
      expect(data.data.tournaments[0].tournament_id).toBe("123");
      expect(data.data.pagination).toMatchObject({
        current_page: 1,
        page_size: 20,
        total_count: 1,
        total_pages: 1,
        has_next_page: false,
        has_previous_page: false,
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors", async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database connection failed" },
      });

      mockContext.locals.supabase = { rpc: mockRpc } as unknown as SupabaseClient;

      const response = await GET(mockContext as APIContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("DATABASE_ERROR");
    });

    it("should handle unexpected errors", async () => {
      const mockRpc = vi.fn().mockRejectedValue(new Error("Unexpected error"));

      mockContext.locals.supabase = { rpc: mockRpc } as unknown as SupabaseClient;

      const response = await GET(mockContext as APIContext);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("DATABASE_ERROR");
    });
  });
});
