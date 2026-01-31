import type { Database } from "./db/database.types";

// ============================================================================
// STANDALONE MATCHES API - TYPES (topdarter schema)
// ============================================================================

// ----------------------------------------------------------------------------
// Enums and Constants
// ----------------------------------------------------------------------------

/**
 * Checkout rule enum (derived from topdarter.matches.checkout_rule)
 * Defines how players must finish a leg
 */
export type CheckoutRule = "straight" | "double_out" | "master_out";

/**
 * Match format type enum (derived from topdarter.matches.format_type)
 * Determines win conditions
 */
export type FormatType = "first_to" | "best_of" | "unlimited";

/**
 * Match status enum (derived from topdarter.matches.match_status)
 * Lifecycle states of a match
 */
export type MatchStatus = "setup" | "in_progress" | "paused" | "completed" | "cancelled";

/**
 * Player number enum (1 or 2)
 * Used throughout the API to identify which player
 */
export type PlayerNumber = 1 | 2;

// ----------------------------------------------------------------------------
// Match Types (topdarter.match_types)
// ----------------------------------------------------------------------------

/**
 * Match Type DTO - Basic information about a game type (501, 301, Cricket, etc.)
 * Derived from: topdarter.match_types
 * Used in: GET /match-types, GET /match-types/:id
 */
export type StandaloneMatchTypeDTO = Pick<
  Database["topdarter"]["Tables"]["match_types"]["Row"],
  | "id"
  | "name"
  | "default_start_score"
  | "default_checkout_rule"
  | "default_format_type"
  | "default_legs_count"
  | "default_sets_count"
  | "description"
  | "is_active"
>;

/**
 * Match Type Detail DTO - Extended match type information with timestamps
 * Derived from: topdarter.match_types
 * Used in: GET /match-types/:id
 */
export type StandaloneMatchTypeDetailDTO = StandaloneMatchTypeDTO &
  Pick<Database["topdarter"]["Tables"]["match_types"]["Row"], "created_at" | "updated_at">;

// ----------------------------------------------------------------------------
// Player Information
// ----------------------------------------------------------------------------

/**
 * Player Info - Represents either an authenticated user or a guest player
 * Enforces XOR constraint: exactly one of user_id OR guest_name must be provided
 * Derived from: topdarter.matches player columns
 */
export type PlayerInfo =
  | {
      user_id: string;
      guest_name?: never;
    }
  | {
      user_id?: never;
      guest_name: string;
    };

// ----------------------------------------------------------------------------
// Matches (topdarter.matches)
// ----------------------------------------------------------------------------

/**
 * Create Match Command - Request body for creating a new match
 * Derived from: topdarter.matches.Insert
 * Used in: POST /matches
 */
export interface CreateMatchCommand {
  match_type_id: string;
  player1: PlayerInfo;
  player2: PlayerInfo;
  start_score: number;
  checkout_rule: CheckoutRule;
  format_type: FormatType;
  legs_count?: number; // Required for first_to/best_of, optional for unlimited
  sets_count?: number | null;
  is_private?: boolean;
}

/**
 * Update Match Command - Request body for updating match configuration
 * Derived from: topdarter.matches.Update (partial)
 * Used in: PATCH /matches/:id
 */
export interface UpdateMatchCommand {
  match_status?: MatchStatus;
  is_private?: boolean;
}

/**
 * Match DTO - Complete match information
 * Derived from: topdarter.matches.Row
 * Used in: POST /matches (response), GET /matches/:id, PATCH /matches/:id
 */
export interface StandaloneMatchDTO {
  id: string;
  match_type_id: string;
  player1_user_id: string | null;
  player1_guest_name: string | null;
  player2_user_id: string | null;
  player2_guest_name: string | null;
  start_score: number;
  checkout_rule: CheckoutRule;
  format_type: FormatType;
  legs_count: number | null;
  sets_count: number | null;
  current_leg: number;
  current_set: number;
  player1_legs_won: number;
  player2_legs_won: number;
  player1_sets_won: number;
  player2_sets_won: number;
  winner_player_number: PlayerNumber | null;
  match_status: MatchStatus;
  is_private: boolean;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
}

/**
 * Match with Stats DTO - Match information with optional embedded statistics and lock
 * Used in: GET /matches/:id?include=stats,lock
 */
export interface StandaloneMatchWithStatsDTO extends StandaloneMatchDTO {
  stats?: StandaloneMatchStatsDTO[];
  lock?: LockStatusDTO;
}

/**
 * Match List Item DTO - Simplified match information for list views
 * Derived from: topdarter.matches.Row (subset)
 * Used in: GET /matches
 */
export interface StandaloneMatchListItemDTO {
  id: string;
  match_type_id: string;
  player1_guest_name: string | null;
  player2_guest_name: string | null;
  player1_legs_won: number;
  player2_legs_won: number;
  winner_player_number: PlayerNumber | null;
  match_status: MatchStatus;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
}

/**
 * List Matches Query Parameters
 * Used in: GET /matches
 */
export interface ListMatchesQuery {
  status?: MatchStatus;
  player_user_id?: string;
  is_private?: boolean;
  match_type_id?: string;
  limit?: number; // Default: 20, max: 100
  offset?: number; // Default: 0
  sort?: "created_at" | "started_at" | "completed_at"; // Default: created_at
  order?: "asc" | "desc"; // Default: desc
}

// ----------------------------------------------------------------------------
// Match Locks (topdarter.match_locks)
// ----------------------------------------------------------------------------

/**
 * Device Info - JSONB structure containing device details for audit trail
 * Derived from: topdarter.match_locks.device_info (JSONB)
 */
export interface DeviceInfo {
  browser?: string;
  os?: string;
  screen_size?: string;
  user_agent?: string;
  [key: string]: unknown; // Allow additional fields
}

/**
 * Acquire Lock Command - Request body for acquiring a match lock
 * Derived from: topdarter.match_locks.Insert
 * Used in: POST /matches/:match_id/lock
 */
export interface AcquireLockCommand {
  device_info?: string; // JSON string of device info (max 500 chars)
  auto_extend?: boolean;
}

/**
 * Update Lock Command - Request body for updating/extending a lock
 * Derived from: topdarter.match_locks.Update
 * Used in: PUT /matches/:match_id/lock
 */
export interface UpdateLockCommand {
  auto_extend?: boolean;
}

/**
 * Match Lock DTO - Complete lock information
 * Derived from: topdarter.match_locks.Row
 * Used in: POST /matches/:match_id/lock, PUT /matches/:match_id/lock
 */
export interface MatchLockDTO {
  match_id: string;
  locked_by_session_id: string;
  device_info: DeviceInfo;
  locked_at: string;
  expires_at: string;
  auto_extend: boolean;
  last_activity_at: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Lock Status DTO - Lock status information with current session check
 * Used in: GET /matches/:match_id/lock, embedded in match responses
 */
export type LockStatusDTO =
  | {
      match_id: string;
      is_locked: true;
      locked_by_session_id: string;
      locked_at: string;
      expires_at: string;
      is_current_session: boolean;
      time_remaining_seconds: number;
    }
  | {
      match_id: string;
      is_locked: false;
    };

// ----------------------------------------------------------------------------
// Match Legs (topdarter.match_legs) - Throw-by-throw scoring
// ----------------------------------------------------------------------------

/**
 * Create Throw Command - Request body for recording a single throw
 * Derived from: topdarter.match_legs.Insert
 * Used in: POST /matches/:match_id/legs/throws
 */
export interface CreateThrowCommand {
  leg_number: number;
  set_number?: number; // Default: 1
  player_number: PlayerNumber;
  throw_number: 1 | 2 | 3;
  round_number: number;
  score: number; // 0-180
  remaining_score: number; // >= 0
  is_checkout_attempt?: boolean;
}

/**
 * Update Throw Command - Request body for updating/correcting a throw
 * Derived from: topdarter.match_legs.Update (partial)
 * Used in: PATCH /matches/:match_id/legs/throws/:id
 */
export interface UpdateThrowCommand {
  score?: number;
  remaining_score?: number;
  is_checkout_attempt?: boolean;
}

/**
 * Match Leg Throw DTO - Complete throw information
 * Derived from: topdarter.match_legs.Row
 * Used in: Response for throw operations
 */
export interface MatchLegThrowDTO {
  id: string;
  match_id: string;
  leg_number: number;
  set_number: number;
  player_number: PlayerNumber;
  throw_number: 1 | 2 | 3;
  round_number: number;
  score: number;
  remaining_score: number;
  is_checkout_attempt: boolean;
  winner_player_number: PlayerNumber | null;
  winning_checkout: number | null;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  created_at: string;
}

/**
 * Batch Create Throws Command - Request body for creating multiple throws at once
 * Used in: POST /matches/:match_id/legs/throws/batch
 */
export interface BatchCreateThrowsCommand {
  throws: CreateThrowCommand[]; // Max 50 throws per batch
}

/**
 * Batch Create Throws Response DTO
 * Used in: POST /matches/:match_id/legs/throws/batch (response)
 */
export interface BatchCreateThrowsResponseDTO {
  created_count: number;
  throws: MatchLegThrowDTO[];
}

/**
 * List Match Legs Query Parameters
 * Used in: GET /matches/:match_id/legs
 */
export interface ListMatchLegsQuery {
  leg_number?: number;
  set_number?: number;
  player_number?: PlayerNumber;
  limit?: number; // Default: 100, max: 500
  offset?: number; // Default: 0
}

// ----------------------------------------------------------------------------
// Match Statistics (topdarter.match_stats)
// ----------------------------------------------------------------------------

/**
 * Match Stats DTO - Aggregated statistics for a player in a match
 * Derived from: topdarter.match_stats.Row
 * Used in: GET /matches/:match_id/stats, embedded in match responses
 */
export interface StandaloneMatchStatsDTO {
  id?: string;
  match_id?: string;
  player_number: PlayerNumber;
  total_score: number;
  darts_thrown: number;
  rounds_played: number;
  average_score: number; // Generated column: (total_score / darts_thrown) * 3
  first_9_average: number | null;
  scores_60_plus: number;
  scores_80_plus: number;
  scores_100_plus: number;
  scores_120_plus: number;
  scores_140_plus: number;
  scores_170_plus: number;
  scores_180: number;
  checkout_attempts: number;
  successful_checkouts: number;
  high_finish: number | null;
  finishes_100_plus: number;
  best_leg_darts: number | null;
  worst_leg_darts: number | null;
  legs_won_on_own_throw: number;
  legs_won_on_opponent_throw: number;
  created_at?: string;
  updated_at?: string;
}

// ----------------------------------------------------------------------------
// Response Metadata
// ----------------------------------------------------------------------------

/**
 * Throw Operation Metadata - Additional information about throw operation results
 * Used in: Response metadata for throw operations
 */
export interface ThrowOperationMetadata {
  stats_updated: boolean;
  match_updated: boolean;
  leg_completed?: boolean;
  match_completed?: boolean;
  winner_player_number?: PlayerNumber;
  stats_recalculated?: boolean;
  subsequent_throws_affected?: number;
}

/**
 * List Response Metadata - Pagination metadata for list endpoints
 */
export interface ListResponseMetadata {
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/**
 * Count Response Metadata - Simple count metadata
 */
export interface CountResponseMetadata {
  count: number;
}

// ----------------------------------------------------------------------------
// Error Response Types
// ----------------------------------------------------------------------------

/**
 * Validation Error Detail - Detailed validation error information
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
}

/**
 * Error Response - Standard error response format
 * Used in: All error responses
 */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ValidationErrorDetail[] | Record<string, unknown>;
  };
}

/**
 * Lock Conflict Error Details - Additional details for lock conflicts
 */
export interface LockConflictDetails {
  locked_by_session_id: string;
  locked_at: string;
  expires_at: string;
  device_info?: Partial<DeviceInfo>;
}

// ----------------------------------------------------------------------------
// Wrapper Response Types
// ----------------------------------------------------------------------------

/**
 * Single Data Response - Standard wrapper for single entity responses
 */
export interface SingleDataResponse<T> {
  data: T;
}

/**
 * List Data Response - Standard wrapper for list responses
 */
export interface ListDataResponse<T> {
  data: T[];
  meta: ListResponseMetadata;
}

/**
 * Data with Metadata Response - Response with both data and operation metadata
 */
export interface DataWithMetadataResponse<T, M = ThrowOperationMetadata> {
  data: T;
  meta: M;
}

/**
 * Count Data Response - Response with count metadata
 */
export interface CountDataResponse<T> {
  data: T[];
  meta: CountResponseMetadata;
}
