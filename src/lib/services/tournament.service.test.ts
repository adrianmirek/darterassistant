import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getTournaments,
  getTournamentById,
  generateAndSaveFeedback,
  getTournamentsPaginated,
  createTournament,
} from "./tournament.service";
import type { CreateTournamentCommand } from "../../types";

describe("Tournament Service", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock environment variable
    vi.stubEnv("OPENROUTER_API_KEY", "test-api-key");

    // Mock fetch for OpenRouter API calls
    mockFetch = vi.fn();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.fetch = mockFetch as any;

    // Create mock Supabase client with proper chaining
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      single: vi.fn(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      rpc: vi.fn(),
    };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("getTournaments", () => {
    const userId = "user-123";
    const options = { limit: 10, offset: 0, sort: "date_desc" as const };

    it("should fetch tournaments successfully with date_desc sort", async () => {
      const mockData = [
        {
          id: "tournament-1",
          name: "Tournament 1",
          date: "2024-01-15",
          tournament_type_id: 1,
          final_place: 2,
          ai_feedback: "Great performance!",
          tournament_types: { name: "League" },
          tournament_match_results: [{ average_score: 85 }, { average_score: 90 }],
        },
      ];

      mockSupabase.range.mockResolvedValue({ data: mockData, error: null });

      const result = await getTournaments(mockSupabase, userId, options);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data).toHaveLength(1);
      if (result.data) {
        expect(result.data[0].name).toBe("Tournament 1");
        expect(result.data[0].average_score).toBe(87.5); // (85 + 90) / 2
      }
      expect(mockSupabase.from).toHaveBeenCalledWith("tournaments");
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", userId);
      expect(mockSupabase.order).toHaveBeenCalledWith("date", { ascending: false });
    });

    it("should fetch tournaments with date_asc sort", async () => {
      const mockData = [
        {
          id: "tournament-1",
          name: "Tournament 1",
          date: "2024-01-15",
          tournament_type_id: 1,
          final_place: null,
          ai_feedback: null,
          tournament_types: { name: "League" },
          tournament_match_results: [],
        },
      ];

      mockSupabase.range.mockResolvedValue({ data: mockData, error: null });

      const result = await getTournaments(mockSupabase, userId, {
        ...options,
        sort: "date_asc",
      });

      expect(result.error).toBeNull();
      expect(mockSupabase.order).toHaveBeenCalledWith("date", { ascending: true });
    });

    it("should handle empty tournament match results", async () => {
      const mockData = [
        {
          id: "tournament-1",
          name: "Tournament 1",
          date: "2024-01-15",
          tournament_type_id: 1,
          final_place: null,
          ai_feedback: null,
          tournament_types: { name: "League" },
          tournament_match_results: [],
        },
      ];

      mockSupabase.range.mockResolvedValue({ data: mockData, error: null });

      const result = await getTournaments(mockSupabase, userId, options);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data[0].average_score).toBe(0);
      }
    });

    it("should handle database error", async () => {
      const mockError = { message: "Database error", code: "DB_ERROR" };
      mockSupabase.range.mockResolvedValue({ data: null, error: mockError });

      const result = await getTournaments(mockSupabase, userId, options);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it("should handle exceptions", async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      const result = await getTournaments(mockSupabase, userId, options);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });

    it("should apply pagination correctly", async () => {
      mockSupabase.range.mockResolvedValue({ data: [], error: null });

      await getTournaments(mockSupabase, userId, {
        limit: 20,
        offset: 40,
        sort: "date_desc",
      });

      expect(mockSupabase.range).toHaveBeenCalledWith(40, 59); // offset to offset + limit - 1
    });
  });

  describe("getTournamentById", () => {
    const tournamentId = "tournament-123";
    const userId = "user-123";

    it("should fetch tournament by id successfully", async () => {
      const mockData = {
        id: tournamentId,
        name: "Tournament 1",
        date: "2024-01-15",
        tournament_type_id: 1,
        final_place: 2,
        ai_feedback: "Great!",
        tournament_types: { name: "League" },
        tournament_match_results: [
          {
            match_type_id: 1,
            average_score: 85,
            first_nine_avg: 80,
            checkout_percentage: 40,
            score_60_count: 10,
            score_100_count: 5,
            score_140_count: 2,
            score_180_count: 1,
            high_finish: 120,
            best_leg: 15,
            worst_leg: 25,
            opponent_name: "John Doe",
            player_score: 3,
            opponent_score: 1,
          },
        ],
      };

      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const result = await getTournamentById(mockSupabase, tournamentId, userId);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();

      if (result.data) {
        expect(result.data.id).toBe(tournamentId);
        expect(result.data.results).toHaveLength(1);
        expect(result.data.results[0].average_score).toBe(85);
      }

      expect(mockSupabase.eq).toHaveBeenCalledWith("id", tournamentId);
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", userId);
    });

    it("should handle database error", async () => {
      const mockError = { message: "Not found", code: "PGRST116" };
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError });

      const result = await getTournamentById(mockSupabase, tournamentId, userId);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it("should handle empty match results", async () => {
      const mockData = {
        id: tournamentId,
        name: "Tournament 1",
        date: "2024-01-15",
        tournament_type_id: 1,
        final_place: null,
        ai_feedback: null,
        tournament_types: { name: "League" },
        tournament_match_results: [],
      };

      mockSupabase.single.mockResolvedValue({ data: mockData, error: null });

      const result = await getTournamentById(mockSupabase, tournamentId, userId);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();

      if (result.data) {
        expect(result.data.results).toHaveLength(0);
      }
    });

    it("should handle exceptions", async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      const result = await getTournamentById(mockSupabase, tournamentId, userId);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe("generateAndSaveFeedback", () => {
    const tournamentId = "tournament-123";
    const userId = "user-123";

    beforeEach(() => {
      // Mock successful OpenRouter response
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "chat-123",
          choices: [
            {
              message: {
                content: "Great performance! Keep improving your checkout percentage.",
              },
            },
          ],
        }),
      });
    });

    it("should generate and save feedback successfully", async () => {
      const mockTournamentData = {
        id: tournamentId,
        name: "Tournament 1",
        date: "2024-01-15",
        tournament_type_id: 1,
        final_place: 2,
        ai_feedback: null,
        tournament_type_name: "League",
        results: [
          {
            match_type_id: 1,
            average_score: 85,
            first_nine_avg: 80,
            checkout_percentage: 40,
            score_60_count: 10,
            score_100_count: 5,
            score_140_count: 2,
            score_180_count: 1,
            high_finish: 120,
            best_leg: 15,
            worst_leg: 25,
            opponent_name: "John",
            player_score: 3,
            opponent_score: 1,
          },
        ],
      };

      // Mock getTournamentById call (first query)
      mockSupabase.single.mockResolvedValueOnce({
        data: mockTournamentData,
        error: null,
      });

      // Mock update call result - the chain needs to be awaitable
      // Make the chain return a thenable object on second eq() call
      const updateResult = Promise.resolve({ error: null });
      mockSupabase.eq
        .mockReturnValueOnce(mockSupabase) // First eq() returns this for chaining
        .mockReturnValueOnce(mockSupabase) // Second eq() in getTournamentById
        .mockReturnValueOnce(mockSupabase) // First eq() in update
        .mockReturnValueOnce(updateResult); // Second eq() in update returns Promise

      const result = await generateAndSaveFeedback(mockSupabase, tournamentId, userId, "en");

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();

      if (result.data) {
        expect(result.data.feedback).toContain("Great performance");
      }

      expect(mockSupabase.update).toHaveBeenCalled();
    });

    it("should handle Polish language", async () => {
      const mockTournamentData = {
        id: tournamentId,
        name: "Tournament 1",
        date: "2024-01-15",
        tournament_type_id: 1,
        final_place: 2,
        ai_feedback: null,
        tournament_type_name: "League",
        results: [
          {
            match_type_id: 1,
            average_score: 85,
            first_nine_avg: 80,
            checkout_percentage: 40,
            score_60_count: 10,
            score_100_count: 5,
            score_140_count: 2,
            score_180_count: 1,
            high_finish: 120,
            best_leg: 15,
            worst_leg: 25,
            opponent_name: "Jan",
            player_score: 3,
            opponent_score: 1,
          },
        ],
      };

      // Mock getTournamentById call
      mockSupabase.single.mockResolvedValueOnce({
        data: mockTournamentData,
        error: null,
      });

      // Mock update chain
      const updateResult = Promise.resolve({ error: null });
      mockSupabase.eq
        .mockReturnValueOnce(mockSupabase)
        .mockReturnValueOnce(mockSupabase)
        .mockReturnValueOnce(mockSupabase)
        .mockReturnValueOnce(updateResult);

      const result = await generateAndSaveFeedback(mockSupabase, tournamentId, userId, "pl");

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });

    it("should handle tournament fetch error", async () => {
      const mockError = { message: "Tournament not found" };
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError });

      const result = await generateAndSaveFeedback(mockSupabase, tournamentId, userId);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it("should handle update error", async () => {
      const mockTournamentData = {
        id: tournamentId,
        name: "Tournament 1",
        date: "2024-01-15",
        tournament_type_id: 1,
        final_place: 2,
        ai_feedback: null,
        tournament_type_name: "League",
        results: [
          {
            match_type_id: 1,
            average_score: 85,
            first_nine_avg: 80,
            checkout_percentage: 40,
            score_60_count: 10,
            score_100_count: 5,
            score_140_count: 2,
            score_180_count: 1,
            high_finish: 120,
            best_leg: 15,
            worst_leg: 25,
            opponent_name: "John",
            player_score: 3,
            opponent_score: 1,
          },
        ],
      };

      const updateError = { message: "Update failed" };
      mockSupabase.single.mockResolvedValueOnce({
        data: mockTournamentData,
        error: null,
      });

      // Mock update chain to return error
      const updateResult = Promise.resolve({ error: updateError });
      mockSupabase.eq
        .mockReturnValueOnce(mockSupabase)
        .mockReturnValueOnce(mockSupabase)
        .mockReturnValueOnce(mockSupabase)
        .mockReturnValueOnce(updateResult);

      const result = await generateAndSaveFeedback(mockSupabase, tournamentId, userId);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(updateError);
    });

    it("should handle AI service error gracefully", async () => {
      const mockTournamentData = {
        id: tournamentId,
        name: "Tournament 1",
        date: "2024-01-15",
        tournament_type_id: 1,
        final_place: 2,
        ai_feedback: null,
        tournament_type_name: "League",
        results: [
          {
            match_type_id: 1,
            average_score: 85,
            first_nine_avg: 80,
            checkout_percentage: 40,
            score_60_count: 10,
            score_100_count: 5,
            score_140_count: 2,
            score_180_count: 1,
            high_finish: 120,
            best_leg: 15,
            worst_leg: 25,
            opponent_name: "John",
            player_score: 3,
            opponent_score: 1,
          },
        ],
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: mockTournamentData,
        error: null,
      });

      // Mock update chain
      const updateResult = Promise.resolve({ error: null });
      mockSupabase.eq
        .mockReturnValueOnce(mockSupabase)
        .mockReturnValueOnce(mockSupabase)
        .mockReturnValueOnce(mockSupabase)
        .mockReturnValueOnce(updateResult);

      // Mock fetch to fail
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await generateAndSaveFeedback(mockSupabase, tournamentId, userId);

      // Should still succeed with default message
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();

      if (result.data) {
        expect(result.data.feedback).toContain("Tournament recorded successfully");
      }
    });

    it("should handle exceptions", async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      const result = await generateAndSaveFeedback(mockSupabase, tournamentId, userId);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe("getTournamentsPaginated", () => {
    const userId = "user-123";
    const startDate = "2024-01-01";
    const endDate = "2024-12-31";

    it("should fetch paginated tournaments successfully", async () => {
      const mockData = [
        {
          tournament_id: "t1",
          tournament_name: "Tournament 1",
          tournament_date: "2024-01-15",
          final_place: 2,
          tournament_type_name: "League",
          ai_feedback: "Great!",
          tournament_avg: 85,
          total_180s: 5,
          total_140_plus: 10,
          total_100_plus: 20,
          total_60_plus: 30,
          avg_checkout_percentage: 40,
          best_high_finish: 120,
          best_leg: 15,
          matches: [
            {
              match_id: "m1",
              opponent: "John",
              result: "W",
              player_score: 3,
              opponent_score: 1,
              match_type: "Best of 5",
              average_score: 85,
              first_nine_avg: 80,
              checkout_percentage: 40,
              high_finish: 120,
              score_180s: 1,
              score_140_plus: 2,
              score_100_plus: 5,
              score_60_plus: 10,
              best_leg: 15,
              worst_leg: 25,
              created_at: "2024-01-15T10:00:00Z",
            },
          ],
          total_count: 1,
        },
      ];

      mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null });

      const result = await getTournamentsPaginated(mockSupabase, userId, startDate, endDate, 20, 1);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();

      if (result.data) {
        expect(result.data.tournaments).toHaveLength(1);
        expect(result.data.totalCount).toBe(1);
        expect(result.data.tournaments[0].tournament_name).toBe("Tournament 1");
      }

      expect(mockSupabase.rpc).toHaveBeenCalledWith("get_tournaments_paginated", {
        p_user_id: userId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_page_size: 20,
        p_page_number: 1,
      });
    });

    it("should handle empty results", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const result = await getTournamentsPaginated(mockSupabase, userId, startDate, endDate);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();

      if (result.data) {
        expect(result.data.tournaments).toHaveLength(0);
        expect(result.data.totalCount).toBe(0);
      }
    });

    it("should handle null data", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await getTournamentsPaginated(mockSupabase, userId, startDate, endDate);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();

      if (result.data) {
        expect(result.data.tournaments).toHaveLength(0);
        expect(result.data.totalCount).toBe(0);
      }
    });

    it("should handle database error", async () => {
      const mockError = { message: "RPC error", code: "RPC_ERROR" };
      mockSupabase.rpc.mockResolvedValue({ data: null, error: mockError });

      const result = await getTournamentsPaginated(mockSupabase, userId, startDate, endDate);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it("should handle exceptions", async () => {
      mockSupabase.rpc.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      const result = await getTournamentsPaginated(mockSupabase, userId, startDate, endDate);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });

    it("should use default page size and page number", async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      await getTournamentsPaginated(mockSupabase, userId, startDate, endDate);

      expect(mockSupabase.rpc).toHaveBeenCalledWith("get_tournaments_paginated", {
        p_user_id: userId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_page_size: 20,
        p_page_number: 1,
      });
    });
  });

  describe("createTournament", () => {
    const userId = "user-123";
    const command: CreateTournamentCommand = {
      name: "New Tournament",
      date: "2024-01-15",
      tournament_type_id: 1,
      final_place: 2,
      matches: [
        {
          match_type_id: 1,
          average_score: 85,
          first_nine_avg: 80,
          checkout_percentage: 40,
          score_60_count: 10,
          score_100_count: 5,
          score_140_count: 2,
          score_180_count: 1,
          high_finish: 120,
          best_leg: 15,
          worst_leg: 25,
          opponent_name: "John Doe",
          player_score: 3,
          opponent_score: 1,
        },
      ],
    };

    it("should create tournament successfully", async () => {
      const mockTournament = {
        id: "new-tournament-id",
        created_at: "2024-01-15T10:00:00Z",
      };

      mockSupabase.single.mockResolvedValue({
        data: mockTournament,
        error: null,
      });

      const result = await createTournament(mockSupabase, userId, command);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();

      if (result.data) {
        expect(result.data.id).toBe("new-tournament-id");
      }

      expect(mockSupabase.insert).toHaveBeenCalledTimes(2); // Tournament + matches
    });

    it("should handle tournament insertion error", async () => {
      const mockError = { message: "Insert failed", code: "INSERT_ERROR" };
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError });

      const result = await createTournament(mockSupabase, userId, command);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(mockError);
    });

    it("should rollback on match insertion error", async () => {
      const mockTournament = {
        id: "new-tournament-id",
        created_at: "2024-01-15T10:00:00Z",
      };

      const matchError = { message: "Match insert failed" };

      // First call to single() for tournament insert succeeds
      mockSupabase.single.mockResolvedValueOnce({
        data: mockTournament,
        error: null,
      });

      // Mock insert to succeed first time (tournament), then fail (matches)
      mockSupabase.insert
        .mockReturnValueOnce(mockSupabase) // Tournament insert - chains to select/single
        .mockResolvedValueOnce({ error: matchError }); // Match insert fails

      const result = await createTournament(mockSupabase, userId, command);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(matchError);
      expect(mockSupabase.delete).toHaveBeenCalled();
    });

    it("should handle multiple matches", async () => {
      const commandWithMultipleMatches: CreateTournamentCommand = {
        ...command,
        matches: [
          command.matches[0],
          {
            ...command.matches[0],
            opponent_name: "Jane Doe",
          },
        ],
      };

      const mockTournament = {
        id: "new-tournament-id",
        created_at: "2024-01-15T10:00:00Z",
      };

      mockSupabase.single.mockResolvedValue({
        data: mockTournament,
        error: null,
      });

      const result = await createTournament(mockSupabase, userId, commandWithMultipleMatches);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });

    it("should handle null opponent_name", async () => {
      const commandWithNullOpponent: CreateTournamentCommand = {
        ...command,
        matches: [
          {
            ...command.matches[0],
            opponent_name: undefined,
          },
        ],
      };

      const mockTournament = {
        id: "new-tournament-id",
        created_at: "2024-01-15T10:00:00Z",
      };

      mockSupabase.single.mockResolvedValue({
        data: mockTournament,
        error: null,
      });

      const result = await createTournament(mockSupabase, userId, commandWithNullOpponent);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });

    it("should use default tournament_type_id if not provided", async () => {
      const commandWithoutType: CreateTournamentCommand = {
        ...command,
        tournament_type_id: undefined,
      };

      const mockTournament = {
        id: "new-tournament-id",
        created_at: "2024-01-15T10:00:00Z",
      };

      mockSupabase.single.mockResolvedValue({
        data: mockTournament,
        error: null,
      });

      const result = await createTournament(mockSupabase, userId, commandWithoutType);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });

    it("should handle null final_place", async () => {
      const commandWithoutPlace: CreateTournamentCommand = {
        ...command,
        final_place: undefined,
      };

      const mockTournament = {
        id: "new-tournament-id",
        created_at: "2024-01-15T10:00:00Z",
      };

      mockSupabase.single.mockResolvedValue({
        data: mockTournament,
        error: null,
      });

      const result = await createTournament(mockSupabase, userId, commandWithoutPlace);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });

    it("should handle exceptions", async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      const result = await createTournament(mockSupabase, userId, command);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });
  });
});
