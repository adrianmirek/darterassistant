import { test, expect } from "@playwright/test";

/**
 * E2E API tests for Tournament endpoints
 * Covers API test scenarios from test plan
 * Uses Playwright's request context for API testing
 * 
 * Note: These tests run in the chromium-authenticated project,
 * which automatically provides authenticated storage state.
 * No manual login is needed - the request fixture inherits auth cookies.
 */
test.describe("Tournament API Integration", () => {
  const baseURL = process.env.BASE_URL || "http://localhost:3000";

  test("API Test 1: POST /api/tournaments - Valid payload with single match", async ({ request }) => {
    // Arrange
    const payload = {
      name: "API Test Tournament",
      date: "2025-12-05",
      tournament_type_id: 1,
      matches: [
        {
          match_type_id: 1,
          opponent_name: "Player A",
          player_score: 3,
          opponent_score: 2,
          average_score: 75.5,
          first_nine_avg: 80.0,
          checkout_percentage: 35.5,
          score_60_count: 10,
          score_100_count: 5,
          score_140_count: 2,
          score_180_count: 3,
          high_finish: 120,
          best_leg: 12,
          worst_leg: 18,
        },
      ],
    };

    // Act
    const response = await request.post(`${baseURL}/api/tournaments`, {
      data: payload,
    });

    // Assert
    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("created_at");
    expect(data.id).toBeTruthy();
    expect(data.created_at).toBeTruthy();
    // Note: feedback is generated in a separate request, not included in create response
  });

  test("API Test 2: POST /api/tournaments - Empty matches array", async ({ request }) => {
    // Arrange
    const payload = {
      name: "Empty Matches Test",
      date: "2025-12-05",
      tournament_type_id: 1,
      matches: [], // Empty array
    };

    // Act
    const response = await request.post(`${baseURL}/api/tournaments`, {
      data: payload,
    });

    // Assert
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data.error).toMatch(/validation|at least one match/i);
  });

  test("API Test 3: POST /api/tournaments - Invalid match type", async ({ request }) => {
    // Arrange
    const payload = {
      name: "Invalid Match Type Test",
      date: "2025-12-05",
      tournament_type_id: 1,
      matches: [
        {
          match_type_id: 9999, // Invalid ID
          opponent_id: null,
          full_name: "Player A",
          player_score: 3,
          opponent_score: 2,
          average_score: 75.5,
          first_nine_avg: 80.0,
          checkout_percentage: 35.5,
          score_60_count: 10,
          score_100_count: 5,
          score_140_count: 2,
          score_180_count: 3,
          high_finish: 120,
          best_leg: 12,
          worst_leg: 18,
        },
      ],
    };

    // Act
    const response = await request.post(`${baseURL}/api/tournaments`, {
      data: payload,
    });

    // Assert
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data.error).toMatch(/validation|invalid|foreign key|match_type/i);
  });

  test("API Test 4: POST /api/tournaments - Invalid tournament type", async ({ request }) => {
    // Arrange
    const payload = {
      name: "Invalid Tournament Type Test",
      date: "2025-12-05",
      tournament_type_id: 999, // Invalid ID
      matches: [
        {
          match_type_id: 1,
          opponent_name: "Player A",
          player_score: 3,
          opponent_score: 2,
          average_score: 75.5,
          first_nine_avg: 80.0,
          checkout_percentage: 35.5,
          score_60_count: 10,
          score_100_count: 5,
          score_140_count: 2,
          score_180_count: 3,
          high_finish: 120,
          best_leg: 12,
          worst_leg: 18,
        },
      ],
    };

    // Act
    const response = await request.post(`${baseURL}/api/tournaments`, {
      data: payload,
    });

    // Assert
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty("error");
    expect(data.error).toMatch(/validation|invalid|foreign key|tournament_type/i);
  });

  test("API Test 5: POST /api/tournaments - Multiple matches", async ({ request }) => {
    // Arrange
    const payload = {
      name: "Multiple Matches API Test",
      date: "2025-12-05",
      tournament_type_id: 1,
      matches: [
        {
          match_type_id: 1,
          opponent_name: "Player A",
          player_score: 3,
          opponent_score: 2,
          average_score: 75.5,
          first_nine_avg: 80.0,
          checkout_percentage: 35.5,
          score_60_count: 10,
          score_100_count: 5,
          score_140_count: 2,
          score_180_count: 3,
          high_finish: 120,
          best_leg: 12,
          worst_leg: 18,
        },
        {
          match_type_id: 1,
          opponent_name: "Player B",
          player_score: 3,
          opponent_score: 1,
          average_score: 72.0,
          first_nine_avg: 76.0,
          checkout_percentage: 33.0,
          score_60_count: 8,
          score_100_count: 4,
          score_140_count: 1,
          score_180_count: 2,
          high_finish: 100,
          best_leg: 14,
          worst_leg: 20,
        },
        {
          match_type_id: 1,
          opponent_name: "Player C",
          player_score: 3,
          opponent_score: 0,
          average_score: 68.0,
          first_nine_avg: 72.0,
          checkout_percentage: 30.0,
          score_60_count: 7,
          score_100_count: 3,
          score_140_count: 1,
          score_180_count: 1,
          high_finish: 90,
          best_leg: 16,
          worst_leg: 22,
        },
      ],
    };

    // Act
    const response = await request.post(`${baseURL}/api/tournaments`, {
      data: payload,
    });

    // Assert
    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("created_at");
    expect(data.id).toBeTruthy();
    expect(data.created_at).toBeTruthy();
    // Note: feedback is generated in a separate request, not included in create response

    // Note: Database validation would require direct DB access
    // In a real scenario, you'd query the database to verify:
    // - 3 tournament_match_results records exist
    // - All have the same tournament_id
    // - All match data is correct
  });

  test("API Test 6: GET /api/tournament-types", async ({ request }) => {
    // Act
    const response = await request.get(`${baseURL}/api/tournament-types`);

    // Assert
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    // Verify structure
    const firstType = data[0];
    expect(firstType).toHaveProperty("id");
    expect(firstType).toHaveProperty("name");

    // Verify expected tournament types exist
    const names = data.map((type: { name: string }) => type.name);
    expect(names).toContain("Leagues + SKO");
    expect(names).toContain("SKO");
  });

  test("API Test 7: GET /api/match-types", async ({ request }) => {
    // Act
    const response = await request.get(`${baseURL}/api/match-types`);

    // Assert
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    // Verify structure
    const firstType = data[0];
    expect(firstType).toHaveProperty("id");
    expect(firstType).toHaveProperty("name");

    // Verify expected match types exist
    const names = data.map((type: { name: string }) => type.name);
    expect(names).toContain("501 DO"); // 501 Double Out
    expect(names).toContain("301 DO"); // 301 Double Out
    expect(names).toContain("Other");
  });

  test("POST /api/tournaments - Missing required fields", async ({ request }) => {
    // Arrange - Missing tournament name
    const payload = {
      // name: missing
      date: "2025-12-05",
      tournament_type_id: 1,
      matches: [
        {
          match_type_id: 1,
          player_score: 3,
          opponent_score: 2,
          average_score: 75.5,
          first_nine_avg: 80.0,
          checkout_percentage: 35.5,
          score_60_count: 10,
          score_100_count: 5,
          score_140_count: 2,
          score_180_count: 3,
          high_finish: 120,
          best_leg: 12,
          worst_leg: 18,
        },
      ],
    };

    // Act
    const response = await request.post(`${baseURL}/api/tournaments`, {
      data: payload,
    });

    // Assert
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty("error");
  });

  test("POST /api/tournaments - Invalid date format", async ({ request }) => {
    // Arrange
    const payload = {
      name: "Invalid Date Test",
      date: "invalid-date", // Invalid format
      tournament_type_id: 1,
      matches: [
        {
          match_type_id: 1,
          player_score: 3,
          opponent_score: 2,
          average_score: 75.5,
          first_nine_avg: 80.0,
          checkout_percentage: 35.5,
          score_60_count: 10,
          score_100_count: 5,
          score_140_count: 2,
          score_180_count: 3,
          high_finish: 120,
          best_leg: 12,
          worst_leg: 18,
        },
      ],
    };

    // Act
    const response = await request.post(`${baseURL}/api/tournaments`, {
      data: payload,
    });

    // Assert
    expect(response.status()).toBe(400);
  });

  test("POST /api/tournaments - Negative values validation", async ({ request }) => {
    // Arrange
    const payload = {
      name: "Negative Values Test",
      date: "2025-12-05",
      tournament_type_id: 1,
      matches: [
        {
          match_type_id: 1,
          player_score: 3,
          opponent_score: 2,
          average_score: -10, // Invalid negative
          first_nine_avg: 80.0,
          checkout_percentage: 35.5,
          score_60_count: 10,
          score_100_count: 5,
          score_140_count: 2,
          score_180_count: 3,
          high_finish: 120,
          best_leg: 12,
          worst_leg: 18,
        },
      ],
    };

    // Act
    const response = await request.post(`${baseURL}/api/tournaments`, {
      data: payload,
    });

    // Assert
    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data).toHaveProperty("error");
  });

  test("POST /api/tournaments - Checkout percentage > 100", async ({ request }) => {
    // Arrange
    const payload = {
      name: "Checkout > 100 Test",
      date: "2025-12-05",
      tournament_type_id: 1,
      matches: [
        {
          match_type_id: 1,
          player_score: 3,
          opponent_score: 2,
          average_score: 75.5,
          first_nine_avg: 80.0,
          checkout_percentage: 150, // Invalid > 100
          score_60_count: 10,
          score_100_count: 5,
          score_140_count: 2,
          score_180_count: 3,
          high_finish: 120,
          best_leg: 12,
          worst_leg: 18,
        },
      ],
    };

    // Act
    const response = await request.post(`${baseURL}/api/tournaments`, {
      data: payload,
    });

    // Assert
    expect(response.status()).toBe(400);
  });

  test("POST /api/tournaments - Optional opponent_name null handling", async ({ request }) => {
    // Arrange
    const payload = {
      name: "Null Opponent Test",
      date: "2025-12-05",
      tournament_type_id: 1,
      matches: [
        {
          match_type_id: 1,
          opponent_name: null, // Explicitly null
          player_score: 3,
          opponent_score: 2,
          average_score: 75.5,
          first_nine_avg: 80.0,
          checkout_percentage: 35.5,
          score_60_count: 10,
          score_100_count: 5,
          score_140_count: 2,
          score_180_count: 3,
          high_finish: 120,
          best_leg: 12,
          worst_leg: 18,
        },
      ],
    };

    // Act
    const response = await request.post(`${baseURL}/api/tournaments`, {
      data: payload,
    });

    // Assert
    expect(response.status()).toBe(201);
  });

  test("POST /api/tournaments - Very long tournament name", async ({ request }) => {
    // Arrange
    const longName = "A".repeat(255); // Exactly 255 chars
    const payload = {
      name: longName,
      date: "2025-12-05",
      tournament_type_id: 1,
      matches: [
        {
          match_type_id: 1,
          player_score: 3,
          opponent_score: 2,
          average_score: 75.5,
          first_nine_avg: 80.0,
          checkout_percentage: 35.5,
          score_60_count: 10,
          score_100_count: 5,
          score_140_count: 2,
          score_180_count: 3,
          high_finish: 120,
          best_leg: 12,
          worst_leg: 18,
        },
      ],
    };

    // Act
    const response = await request.post(`${baseURL}/api/tournaments`, {
      data: payload,
    });

    // Assert - Should accept up to 255 chars
    expect(response.status()).toBe(201);
  });

  test("POST /api/tournaments - Tournament name > 255 chars", async ({ request }) => {
    // Arrange
    const tooLongName = "A".repeat(256); // 256 chars - too long
    const payload = {
      name: tooLongName,
      date: "2025-12-05",
      tournament_type_id: 1,
      matches: [
        {
          match_type_id: 1,
          player_score: 3,
          opponent_score: 2,
          average_score: 75.5,
          first_nine_avg: 80.0,
          checkout_percentage: 35.5,
          score_60_count: 10,
          score_100_count: 5,
          score_140_count: 2,
          score_180_count: 3,
          high_finish: 120,
          best_leg: 12,
          worst_leg: 18,
        },
      ],
    };

    // Act
    const response = await request.post(`${baseURL}/api/tournaments`, {
      data: payload,
    });

    // Assert - Should reject
    expect(response.status()).toBe(400);
  });
});
