import type { Database } from "./db/database.types";

// Alias for tables in the public schema
type Tables = Database["public"]["Tables"];

/**
 * DTO for match types (read-only lookup)
 */
export type MatchTypeDTO = Pick<Tables["match_types"]["Row"], "id" | "name">;

/**
 * Summary view for listing tournaments with aggregated average score
 */
export type TournamentSummaryDTO = Pick<Tables["tournaments"]["Row"], "id" | "name" | "date"> & {
  average_score: number;
};

/**
 * Detailed tournament result entry
 */
export interface TournamentResultDTO {
  match_type_id: number;
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
}

/**
 * Detailed view for a single tournament including results
 */
export type TournamentDetailDTO = Pick<Tables["tournaments"]["Row"], "id" | "name" | "date"> & {
  results: TournamentResultDTO[];
};

/**
 * Command Model for creating a tournament result (nested under CreateTournamentCommand)
 * Uses snake_case to match database schema
 */
export type CreateTournamentResultCommand = Omit<Tables["tournament_match_results"]["Insert"], "id" | "tournament_id">;

/**
 * Command Model for creating a tournament along with its initial result
 */
export interface CreateTournamentCommand {
  name: Tables["tournaments"]["Insert"]["name"];
  date: Tables["tournaments"]["Insert"]["date"];
  result: CreateTournamentResultCommand;
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
export type TonePreferencesDTO = Record<string, any>;

/**
 * Command Model for generating motivational feedback
 */
export interface GenerateFeedbackCommand {
  tone_preferences?: TonePreferencesDTO;
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
 */
export interface RegisterResponseDTO {
  user: UserDTO;
  session: SessionDTO;
}

/**
 * Response DTO for login
 */
export interface LoginResponseDTO {
  user: UserDTO;
  session: SessionDTO;
}
