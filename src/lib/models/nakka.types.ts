// ============================================================================
// NO KEYWORD REQUEST SYSTEM TYPES
// ============================================================================

/**
 * Entity representing a no_keyword record in the database
 */
export interface NoKeywordEntity {
  id: string;
  keyword: string;
  nickname: string;
  user_email: string;
  created_at: string;
}

/**
 * Command Model for submitting a no keyword request
 */
export interface SubmitNoKeywordCommand {
  keyword: string;
  nickname: string;
  user_email?: string; // Optional: email for contact
}

/**
 * Response DTO after submitting a no keyword request
 */
export interface SubmitNoKeywordResponseDTO {
  id: string;
  created_at: string;
  message: string;
}
