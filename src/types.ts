import type { Database } from "./db/database.types";

// Alias for tables in the public schema
type Tables = Database["public"]["Tables"];

/**
 * DTO for match types (read-only lookup)
 */
export type MatchTypeDTO = Pick<Tables["match_types"]["Row"], "id" | "name">;

/**
 * DTO for tournament types (read-only lookup)
 */
export type TournamentTypeDTO = Pick<Tables["tournament_types"]["Row"], "id" | "name">;

/**
 * Summary view for listing tournaments with aggregated average score
 */
export type TournamentSummaryDTO = Pick<
  Tables["tournaments"]["Row"],
  "id" | "name" | "date" | "tournament_type_id" | "final_place" | "ai_feedback"
> & {
  average_score: number;
  tournament_type_name?: string; // Optional: include type name for display
};

/**
 * Detailed tournament result entry
 */
export interface TournamentResultDTO {
  match_type_id: number;
  player_score: number;
  opponent_score: number;
  average_score: number;
  first_nine_avg: number;
  checkout_percentage: number;
  score_60_count: number;
  score_100_count: number;
  score_140_count: number;
  score_180_count: number;
  high_finish: number;
  best_leg: number;
  worst_leg: number;
  opponent_name: string | null; // Free-text opponent name
}

/**
 * Detailed view for a single tournament including results
 */
export type TournamentDetailDTO = Pick<
  Tables["tournaments"]["Row"],
  "id" | "name" | "date" | "tournament_type_id" | "final_place" | "ai_feedback"
> & {
  tournament_type_name?: string; // NEW: Optional type name for display
  results: TournamentResultDTO[];
};

/**
 * Command Model for creating a tournament result (nested under CreateTournamentCommand)
 * Uses snake_case to match database schema
 */
export type CreateTournamentResultCommand = Omit<Tables["tournament_match_results"]["Insert"], "id" | "tournament_id">;

/**
 * Command Model for creating a tournament along with its matches
 */
export interface CreateTournamentCommand {
  name: Tables["tournaments"]["Insert"]["name"];
  date: Tables["tournaments"]["Insert"]["date"];
  tournament_type_id?: Tables["tournaments"]["Insert"]["tournament_type_id"]; // Optional, defaults to 1
  final_place?: Tables["tournaments"]["Insert"]["final_place"]; // Optional: final placement in the tournament
  matches: CreateTournamentResultCommand[];
}

/**
 * Response DTO after creating a tournament
 */
export interface CreateTournamentResponseDTO {
  id: string;
  created_at: string;
  feedback?: string;
}

/**
 * DTO for goals
 */
export interface GoalDTO {
  id: string;
  target_avg: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

/**
 * Command Model for creating a new goal
 */
export interface CreateGoalCommand {
  target_avg: Tables["goals"]["Insert"]["target_avg"];
  start_date: Tables["goals"]["Insert"]["start_date"];
  end_date: Tables["goals"]["Insert"]["end_date"];
}

/**
 * Response DTO after creating a goal
 */
export interface CreateGoalResponseDTO {
  id: string;
  created_at: string;
}

/**
 * DTO for aggregated progress on goals
 */
export interface GoalProgressDTO {
  goal_id: string;
  average_score: number;
  tournament_count: number;
  progress_percentage: number;
}

/**
 * Preferences for tone of feedback (open-ended structure)
 */
export type TonePreferencesDTO = Record<string, unknown>;

/**
 * Command Model for generating motivational feedback
 */
export interface GenerateFeedbackCommand {
  tone_preferences?: TonePreferencesDTO;
  language?: "en" | "pl";
}

/**
 * Response DTO for motivational feedback
 */
export interface FeedbackResponseDTO {
  message: string;
  tone: string;
}

/**
 * User authentication data
 */
export interface UserDTO {
  id: string;
  email: string;
  created_at?: string;
}

/**
 * Authentication session data
 */
export interface SessionDTO {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: UserDTO;
}

/**
 * Response DTO for registration
 * Session will be null if email confirmation is required
 */
export interface RegisterResponseDTO {
  user: UserDTO;
  session: SessionDTO | null;
}

/**
 * Response DTO for login
 */
export interface LoginResponseDTO {
  user: UserDTO;
  session: SessionDTO;
}

/**
 * DTO for paginated tournament list item with aggregated statistics
 */
export interface TournamentListItem {
  tournament_id: string;
  tournament_name: string;
  tournament_date: string;
  final_place: number | null;
  tournament_type: string;
  ai_feedback: string | null;
  statistics: TournamentStatistics;
  matches: MatchDetail[];
}

/**
 * Tournament aggregated statistics
 */
export interface TournamentStatistics {
  tournament_avg: number;
  total_180s: number;
  total_140_plus: number;
  total_100_plus: number;
  total_60_plus: number;
  avg_checkout_percentage: number;
  best_high_finish: number;
  best_leg: number;
}

/**
 * Match detail for paginated tournament list
 */
export interface MatchDetail {
  match_id: string;
  opponent: string;
  result: string;
  player_score: number;
  opponent_score: number;
  match_type: string;
  average_score: number;
  first_nine_avg: number;
  checkout_percentage: number;
  high_finish: number;
  score_180s: number;
  score_140_plus: number;
  score_100_plus: number;
  score_60_plus: number;
  best_leg: number;
  worst_leg: number;
  created_at: string;
}

/**
 * Pagination metadata for API responses
 */
export interface PaginationMetadata {
  current_page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

/**
 * Generic API success response wrapper
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Generic API error response wrapper
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Generic API response type
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Response data for paginated tournaments
 */
export interface PaginatedTournamentsData {
  tournaments: TournamentListItem[];
  pagination: PaginationMetadata;
}

/**
 * Query parameters for getting paginated tournaments
 */
export interface GetTournamentsPaginatedQuery {
  start_date: string;
  end_date: string;
  page_size?: number;
  page?: number;
}

/**
 * Nakka Tournament Entity (from database)
 */
export interface NakkaTournamentEntity {
  tournament_id: number;
  nakka_identifier: string;
  tournament_date: string;
  tournament_name: string;
  href: string;
  imported_at: string;
  last_updated: string;
  /**
   * Auto-calculated status based on tournament matches:
   * - 'completed': All matches have match_result_status = 'completed'
   * - 'failed': At least one match has match_result_status = 'failed'
   * - 'in_progress': Matches exist but not all are completed
   * - null: No matches imported yet
   *
   * This field is automatically updated by database trigger when match statuses change.
   */
  match_import_status: "in_progress" | "completed" | "failed" | null;
  match_import_error: string | null;
}

/**
 * DTO for Nakka tournament scraped from HTML
 */
export interface NakkaTournamentScrapedDTO {
  nakka_identifier: string;
  tournament_name: string;
  href: string;
  tournament_date: Date;
  status: "completed" | "preparing" | "ongoing";
}

/**
 * Command for importing Nakka tournaments
 */
export interface ImportNakkaTournamentsCommand {
  keyword: string;
}

/**
 * Response from import operation
 */
export interface ImportNakkaTournamentsResponseDTO {
  inserted: number;
  updated: number;
  skipped: number;
  total_processed: number;
  tournaments: {
    nakka_identifier: string;
    tournament_name: string;
    tournament_date: string;
    action: "inserted" | "updated" | "skipped";
  }[];
  match_stats?: Record<string, ImportMatchesResponseDTO>;
}

/**
 * DTO for Nakka match scraped from tournament page
 */
export interface NakkaMatchScrapedDTO {
  nakka_match_identifier: string; // e.g., "t_Nd6M_9511_rr_0_ygC9_zJGq"
  match_type: string; // "rr" or "t_top_16", "t_quarter_final", etc.
  first_player_name: string;
  first_player_code: string; // e.g., "ygC9"
  second_player_name: string;
  second_player_code: string; // e.g., "zJGq"
  href: string;
}

/**
 * Response from match import operation
 */
export interface ImportMatchesResponseDTO {
  inserted: number;
  skipped: number;
  failed: number;
  total_processed: number;
  errors?: { identifier: string; error: string }[];
}

/**
 * DTO for Nakka match player result scraped from match page
 */
export interface NakkaMatchPlayerResultScrapedDTO {
  nakka_match_player_identifier: string; // e.g., "t_Nd6M_9511_rr_2_3Tm2"
  average_score: number | null;
  first_nine_avg: number | null;
  checkout_percentage: number | null;
  score_60_count: number;
  score_100_count: number;
  score_140_count: number;
  score_180_count: number;
  high_finish: number;
  best_leg: number;
  worst_leg: number;
  player_score: number;
  opponent_score: number;
}

/**
 * Response from player results import operation
 */
export interface ImportPlayerResultsResponseDTO {
  inserted: number;
  skipped: number;
  failed: number;
  total_processed: number;
  errors?: { identifier: string; error: string }[];
}

/**
 * DTO for tournament match with player nickname check
 */
export interface NakkaTournamentMatchDTO {
  nakka_match_identifier: string;
  match_type: string;
  player_name: string;
  player_code: string;
  opponent_name: string;
  opponent_code: string;
  href: string;
  isChecked: boolean;
}

/**
 * DTO for tournament with filtered matches
 */
export interface NakkaTournamentWithMatchesDTO {
  nakka_identifier: string;
  tournament_date: string;
  tournament_name: string;
  href: string;
  tournament_matches: NakkaTournamentMatchDTO[];
}

/**
 * Response DTO for retrieving tournaments and matches by nickname
 */
export interface RetrieveTournamentsMatchesResponseDTO {
  tournaments: NakkaTournamentWithMatchesDTO[];
}

/**
 * Player match result from database (nakka.player_match_result type)
 * Contains match data with the searched player always in the "player" position
 * Includes player statistics when available from tournament_match_player_results table
 */
export interface NakkaPlayerMatchResult {
  // Tournament info
  tournament_id: number;
  nakka_tournament_identifier: string;
  tournament_name: string;
  tournament_date: string;
  tournament_href: string;

  // Match info
  tournament_match_id: number;
  nakka_match_identifier: string;
  match_type: string;
  match_href: string;

  // Player-oriented match data (matched player is always "player")
  player_name: string;
  player_code: string;
  opponent_name: string;
  opponent_code: string;

  // Player statistics (null if not yet scraped/imported)
  average_score: number | null;
  first_nine_avg: number | null;
  checkout_percentage: number | null;
  score_60_count: number | null;
  score_100_count: number | null;
  score_140_count: number | null;
  score_180_count: number | null;
  high_finish: number | null;
  best_leg: number | null;
  worst_leg: number | null;
  player_score: number | null;
  opponent_score: number | null;

  // Metadata
  imported_at: string;
}

/**
 * Response DTO for retrieving player matches from database
 */
export interface GetPlayerMatchesResponseDTO {
  matches: NakkaPlayerMatchResult[];
  total_count: number;
}
