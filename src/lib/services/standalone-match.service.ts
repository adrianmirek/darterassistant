/**
 * Standalone Match Service
 *
 * API service layer for standalone matches that bridges the UI components
 * with the TopDarter REST API endpoints.
 *
 * This service handles:
 * - Match CRUD operations
 * - Lock management
 * - Score entry (throws)
 * - Statistics retrieval
 *
 * Base URL: /api/v1
 */

import type {
  CreateMatchCommand,
  UpdateMatchCommand,
  StandaloneMatchDTO,
  StandaloneMatchWithStatsDTO,
  StandaloneMatchListItemDTO,
  CreateThrowCommand,
  UpdateThrowCommand,
  MatchLegThrowDTO,
  StandaloneMatchStatsDTO,
  AcquireLockCommand,
  UpdateLockCommand,
  MatchLockDTO,
  LockStatusDTO,
  ListMatchesQuery,
  ListMatchLegsQuery,
  SingleDataResponse,
  ListDataResponse,
  DataWithMetadataResponse,
  ThrowOperationMetadata,
  StandaloneMatchTypeDTO,
  StandaloneMatchTypeDetailDTO,
  CountDataResponse,
  ListResponseMetadata,
} from "@/topdarter.types";

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = "/api/top-darter";

/**
 * API Error class for handling API-specific errors
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Make an authenticated API request
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}, sessionId?: string): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Add session ID header if provided
  if (sessionId) {
    headers["X-Session-ID"] = sessionId;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle error responses
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      throw new ApiError("UNKNOWN_ERROR", "An unexpected error occurred", response.status);
    }

    throw new ApiError(
      errorData.error?.code || "UNKNOWN_ERROR",
      errorData.error?.message || "An error occurred",
      response.status,
      errorData.error?.details
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ============================================================================
// Match Types API
// ============================================================================

/**
 * Get list of available match types
 */
export async function getMatchTypes(isActive = true): Promise<StandaloneMatchTypeDTO[]> {
  const response = await apiRequest<CountDataResponse<StandaloneMatchTypeDTO>>(`/match-types?is_active=${isActive}`);
  return response.data;
}

/**
 * Get specific match type details
 */
export async function getMatchType(id: string): Promise<StandaloneMatchTypeDetailDTO> {
  const response = await apiRequest<SingleDataResponse<StandaloneMatchTypeDetailDTO>>(`/match-types/${id}`);
  return response.data;
}

// ============================================================================
// Matches API
// ============================================================================

/**
 * Create a new match
 */
export async function createMatch(command: CreateMatchCommand, sessionId: string): Promise<StandaloneMatchDTO> {
  const response = await apiRequest<SingleDataResponse<StandaloneMatchDTO>>(
    "/matches",
    {
      method: "POST",
      body: JSON.stringify(command),
    },
    sessionId
  );
  return response.data;
}

/**
 * Get match details
 */
export async function getMatch(
  matchId: string,
  sessionId: string,
  include?: ("stats" | "legs" | "lock")[]
): Promise<StandaloneMatchWithStatsDTO> {
  const includeParam = include ? `?include=${include.join(",")}` : "";
  const response = await apiRequest<SingleDataResponse<StandaloneMatchWithStatsDTO>>(
    `/matches/${matchId}${includeParam}`,
    {},
    sessionId
  );
  return response.data;
}

/**
 * Update match configuration or status
 */
export async function updateMatch(
  matchId: string,
  command: UpdateMatchCommand,
  sessionId: string
): Promise<Partial<StandaloneMatchDTO>> {
  const response = await apiRequest<SingleDataResponse<Partial<StandaloneMatchDTO>>>(
    `/matches/${matchId}`,
    {
      method: "PATCH",
      body: JSON.stringify(command),
    },
    sessionId
  );
  return response.data;
}

/**
 * Delete a match
 */
export async function deleteMatch(matchId: string, sessionId: string): Promise<void> {
  await apiRequest<undefined>(
    `/matches/${matchId}`,
    {
      method: "DELETE",
    },
    sessionId
  );
}

/**
 * List matches with filtering and pagination
 */
export async function listMatches(
  query: ListMatchesQuery = {},
  sessionId?: string
): Promise<{ matches: StandaloneMatchListItemDTO[]; meta: ListResponseMetadata }> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });

  const queryString = params.toString();
  const response = await apiRequest<ListDataResponse<StandaloneMatchListItemDTO>>(
    `/matches${queryString ? `?${queryString}` : ""}`,
    {},
    sessionId
  );

  return {
    matches: response.data,
    meta: response.meta,
  };
}

// ============================================================================
// Match Locks API
// ============================================================================

/**
 * Acquire scoring lock for a match
 */
export async function acquireMatchLock(
  matchId: string,
  sessionId: string,
  command: AcquireLockCommand
): Promise<MatchLockDTO> {
  const response = await apiRequest<SingleDataResponse<MatchLockDTO>>(
    `/matches/${matchId}/lock`,
    {
      method: "POST",
      body: JSON.stringify(command),
    },
    sessionId
  );
  return response.data;
}

/**
 * Extend or update existing lock
 */
export async function updateMatchLock(
  matchId: string,
  command: UpdateLockCommand,
  sessionId: string
): Promise<MatchLockDTO> {
  const response = await apiRequest<SingleDataResponse<MatchLockDTO>>(
    `/matches/${matchId}/lock`,
    {
      method: "PUT",
      body: JSON.stringify(command),
    },
    sessionId
  );
  return response.data;
}

/**
 * Release match lock
 */
export async function releaseMatchLock(matchId: string, sessionId: string): Promise<void> {
  await apiRequest<undefined>(
    `/matches/${matchId}/lock`,
    {
      method: "DELETE",
    },
    sessionId
  );
}

/**
 * Check lock status for a match
 */
export async function getMatchLockStatus(matchId: string): Promise<LockStatusDTO> {
  const response = await apiRequest<SingleDataResponse<LockStatusDTO>>(`/matches/${matchId}/lock`);
  return response.data;
}

// ============================================================================
// Match Legs (Scoring) API
// ============================================================================

/**
 * Record a single throw (score entry)
 */
export async function recordThrow(
  matchId: string,
  command: CreateThrowCommand,
  sessionId: string
): Promise<{
  throw: MatchLegThrowDTO;
  meta: ThrowOperationMetadata;
}> {
  const response = await apiRequest<DataWithMetadataResponse<MatchLegThrowDTO>>(
    `/matches/${matchId}/legs/throws`,
    {
      method: "POST",
      body: JSON.stringify(command),
    },
    sessionId
  );

  return {
    throw: response.data,
    meta: response.meta,
  };
}

/**
 * Get all leg data for a match
 */
export async function getMatchLegs(
  matchId: string,
  query: ListMatchLegsQuery = {},
  sessionId?: string
): Promise<{ throws: MatchLegThrowDTO[]; meta: ListResponseMetadata }> {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });

  const queryString = params.toString();
  const response = await apiRequest<ListDataResponse<MatchLegThrowDTO>>(
    `/matches/${matchId}/legs${queryString ? `?${queryString}` : ""}`,
    {},
    sessionId
  );

  return {
    throws: response.data,
    meta: response.meta,
  };
}

/**
 * Update a throw (for corrections/edits)
 */
export async function updateThrow(
  matchId: string,
  throwId: string,
  command: UpdateThrowCommand,
  sessionId: string
): Promise<{
  throw: MatchLegThrowDTO;
  meta: ThrowOperationMetadata;
}> {
  const response = await apiRequest<DataWithMetadataResponse<MatchLegThrowDTO>>(
    `/matches/${matchId}/legs/throws/${throwId}`,
    {
      method: "PATCH",
      body: JSON.stringify(command),
    },
    sessionId
  );

  return {
    throw: response.data,
    meta: response.meta,
  };
}

/**
 * Delete a throw (undo last score)
 */
export async function deleteThrow(matchId: string, throwId: string, sessionId: string): Promise<void> {
  await apiRequest<undefined>(
    `/matches/${matchId}/legs/throws/${throwId}`,
    {
      method: "DELETE",
    },
    sessionId
  );
}

/**
 * Record multiple throws in a single request (batch operation)
 */
export async function recordThrowsBatch(
  matchId: string,
  throws: CreateThrowCommand[],
  sessionId: string
): Promise<{
  createdCount: number;
  throws: MatchLegThrowDTO[];
  meta: ThrowOperationMetadata;
}> {
  const response = await apiRequest<
    DataWithMetadataResponse<{
      created_count: number;
      throws: MatchLegThrowDTO[];
    }>
  >(
    `/matches/${matchId}/legs/throws/batch`,
    {
      method: "POST",
      body: JSON.stringify({ throws }),
    },
    sessionId
  );

  return {
    createdCount: response.data.created_count,
    throws: response.data.throws,
    meta: response.meta,
  };
}

// ============================================================================
// Match Statistics API
// ============================================================================

/**
 * Get aggregated match statistics for both players
 */
export async function getMatchStats(
  matchId: string,
  playerNumber?: 1 | 2,
  sessionId?: string
): Promise<StandaloneMatchStatsDTO[]> {
  const playerParam = playerNumber ? `?player_number=${playerNumber}` : "";
  const response = await apiRequest<SingleDataResponse<StandaloneMatchStatsDTO[]>>(
    `/matches/${matchId}/stats${playerParam}`,
    {},
    sessionId
  );
  return response.data;
}

// ============================================================================
// High-Level Operations (Composite Actions)
// ============================================================================

/**
 * Start a new match (create + start + acquire lock)
 */
export async function startNewMatch(
  command: CreateMatchCommand,
  sessionId: string,
  deviceIdentifier?: string
): Promise<{
  match: StandaloneMatchDTO;
  lock: MatchLockDTO;
}> {
  // Create the match
  const match = await createMatch(command, sessionId);

  // Start the match (transitions to in_progress and acquires lock)
  const body: Record<string, unknown> = {};
  if (deviceIdentifier) body.deviceIdentifier = deviceIdentifier;

  const response = await apiRequest<{ data: { match: StandaloneMatchDTO; lock: MatchLockDTO } }>(
    `/matches/${match.id}/start`,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    sessionId
  );

  return response.data;
}

/**
 * Complete a leg and get updated match state
 */
export async function completeLeg(matchId: string, sessionId: string): Promise<StandaloneMatchWithStatsDTO> {
  // Get updated match with stats
  return getMatch(matchId, sessionId, ["stats", "lock"]);
}

/**
 * End match (release lock + get final state)
 */
export async function endMatch(matchId: string, sessionId: string): Promise<StandaloneMatchWithStatsDTO> {
  try {
    // Release the lock
    await releaseMatchLock(matchId, sessionId);
  } catch (error) {
    console.error("Error releasing lock:", error);
    // Continue anyway to get final state
  }

  // Get final match state with stats
  return getMatch(matchId, sessionId, ["stats"]);
}

/**
 * Cancel match (transition to cancelled + release lock)
 */
export async function cancelMatch(matchId: string, sessionId: string): Promise<void> {
  // Update status to cancelled
  await updateMatch(matchId, { match_status: "cancelled" }, sessionId);

  try {
    // Release the lock
    await releaseMatchLock(matchId, sessionId);
  } catch (error) {
    console.error("Error releasing lock:", error);
    // Lock might already be released or expired
  }
}

/**
 * Resume a paused match (acquire lock + transition to in_progress)
 */
export async function resumeMatch(
  matchId: string,
  sessionId: string,
  acquireLockCommand: AcquireLockCommand
): Promise<{
  match: StandaloneMatchWithStatsDTO;
  lock: MatchLockDTO;
}> {
  // Acquire the lock
  const lock = await acquireMatchLock(matchId, sessionId, acquireLockCommand);

  // Transition to in_progress
  await updateMatch(matchId, { match_status: "in_progress" }, sessionId);

  // Get updated match state
  const match = await getMatch(matchId, sessionId, ["stats", "lock"]);

  return { match, lock };
}

/**
 * Pause match (transition to paused + keep lock)
 */
export async function pauseMatch(matchId: string, sessionId: string): Promise<StandaloneMatchDTO> {
  const response = await updateMatch(matchId, { match_status: "paused" }, sessionId);
  return response as StandaloneMatchDTO;
}
