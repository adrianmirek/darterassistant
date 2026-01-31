/**
 * Standalone Match Models
 *
 * This file contains view models, mappers, and helper objects that bridge
 * the gap between the UI components and the TopDarter API types.
 *
 * These models are specifically designed to work with:
 * - GuestScoreHomePage.tsx
 * - GuestScoreBoard.tsx
 * - GuestSetupPage.tsx
 * - GuestScorePage.tsx
 */

import type {
  CreateMatchCommand,
  CreateThrowCommand,
  StandaloneMatchDTO,
  StandaloneMatchWithStatsDTO,
  StandaloneMatchStatsDTO,
  MatchLegThrowDTO,
  PlayerInfo,
  MatchStatus,
  FormatType,
  CheckoutRule,
  PlayerNumber,
  AcquireLockCommand,
} from "@/topdarter.types";

// ============================================================================
// UI State Models (for component state management)
// ============================================================================

/**
 * Round Score - UI model for displaying scores per round
 * Used in: GuestScoreHomePage, GuestScoreBoard
 */
export interface RoundScore {
  round: number;
  player1Scored: number | null;
  player1ToGo: number;
  player2Scored: number | null;
  player2ToGo: number;
}

/**
 * Match Setup - Configuration for creating a new match
 * Used in: GuestSetupPage, GuestScoreHomePage (setup phase)
 */
export interface MatchSetup {
  playerName: string;
  opponentName: string;
  startScore: number;
  limitRounds: number | null;
  formatType?: FormatType;
  legsCount?: number;
  checkoutRule?: CheckoutRule;
}

/**
 * Match State - Complete UI state for an active match
 * Used in: GuestScoreHomePage, GuestScoreBoard
 */
export interface MatchState {
  // Match configuration
  matchId?: string;
  playerName: string;
  opponentName: string;
  startScore: number;
  limitRounds: number | null;

  // Match progress
  rounds: RoundScore[];
  activeRoundIndex: number;
  activePlayer: "player" | "opponent";
  currentInput: string;

  // Leg tracking
  playerLegs: number;
  opponentLegs: number;
  currentLeg: number; // Add current leg number tracking
  legFinished: boolean;
  winner: "player" | "opponent" | null;
  checkoutDarts: number | null;

  // Match metadata
  matchStatus: MatchStatus;
  sessionId?: string;
  hasLock: boolean;
}

/**
 * Throw Entry - Data for recording a single throw
 * Bridges UI interaction to API CreateThrowCommand
 */
export interface ThrowEntry {
  player: "player" | "opponent";
  roundNumber: number;
  throwNumber: 1 | 2 | 3;
  score: number;
  remainingScore: number;
  isCheckoutAttempt: boolean;
  isBust: boolean;
  isWinningThrow: boolean;
}

/**
 * Leg Summary - Statistics for a completed leg
 * Used for displaying leg results
 */
export interface LegSummary {
  legNumber: number;
  winner: "player" | "opponent";
  winnerDarts: number;
  winningCheckout: number;
  player1Score: number;
  player2Score: number;
  player1Average: number;
  player2Average: number;
}

/**
 * Match Summary - Overall match statistics
 * Used for displaying match statistics
 */
export interface MatchSummary {
  matchId: string;
  playerName: string;
  opponentName: string;
  startScore: number;
  totalLegs: number;
  playerLegsWon: number;
  opponentLegsWon: number;
  matchWinner: "player" | "opponent" | null;
  legs: LegSummary[];
  playerStats: PlayerMatchStats;
  opponentStats: PlayerMatchStats;
  duration?: number; // seconds
  completedAt?: string;
}

/**
 * Player Match Stats - Statistics for a single player in a match
 * Simplified from StandaloneMatchStatsDTO for UI display
 */
export interface PlayerMatchStats {
  totalScore: number;
  dartsThrown: number;
  roundsPlayed: number;
  averageScore: number;
  first9Average: number | null;
  scores60Plus: number;
  scores80Plus: number;
  scores100Plus: number;
  scores120Plus: number;
  scores140Plus: number;
  scores170Plus: number;
  scores180: number;
  checkoutAttempts: number;
  successfulCheckouts: number;
  checkoutPercentage: number;
  highFinish: number | null;
  finishes100Plus: number;
  bestLegDarts: number | null;
  worstLegDarts: number | null;
}

// ============================================================================
// API Command Builders (convert UI models to API commands)
// ============================================================================

/**
 * Build Create Match Command from Match Setup
 */
export function buildCreateMatchCommand(setup: MatchSetup, matchTypeId: string): CreateMatchCommand {
  const player1: PlayerInfo = setup.playerName.trim()
    ? { guest_name: setup.playerName.trim() }
    : { guest_name: "Player 1" };

  const player2: PlayerInfo = setup.opponentName.trim()
    ? { guest_name: setup.opponentName.trim() }
    : { guest_name: "Player 2" };

  return {
    match_type_id: matchTypeId,
    player1,
    player2,
    start_score: setup.startScore,
    checkout_rule: setup.checkoutRule || "double_out",
    format_type: setup.formatType || "unlimited",
    legs_count: setup.legsCount,
    sets_count: null,
    is_private: false,
  };
}

/**
 * Build Create Throw Command from Throw Entry
 */
export function buildCreateThrowCommand(
  throwEntry: ThrowEntry,
  matchId: string,
  legNumber: number,
  setNumber = 1
): CreateThrowCommand {
  return {
    leg_number: legNumber,
    set_number: setNumber,
    player_number: throwEntry.player === "player" ? 1 : 2,
    throw_number: throwEntry.throwNumber,
    round_number: throwEntry.roundNumber,
    score: throwEntry.score,
    remaining_score: throwEntry.remainingScore,
    is_checkout_attempt: throwEntry.isCheckoutAttempt,
  };
}

/**
 * Build Acquire Lock Command with device info
 */
export function buildAcquireLockCommand(autoExtend = true): AcquireLockCommand {
  const deviceInfo = {
    browser: navigator.userAgent,
    os: navigator.platform,
    screen_size: `${window.screen.width}x${window.screen.height}`,
    user_agent: navigator.userAgent,
  };

  return {
    device_info: JSON.stringify(deviceInfo), // Must be a string, not an object
    auto_extend: autoExtend,
  };
}

// ============================================================================
// Response Mappers (convert API responses to UI models)
// ============================================================================

/**
 * Map API Match DTO to Match State
 */
export function mapMatchDtoToState(
  match: StandaloneMatchDTO | StandaloneMatchWithStatsDTO,
  currentRounds: RoundScore[] = []
): Partial<MatchState> {
  return {
    matchId: match.id,
    playerName: match.player1_guest_name || match.player1_user_id || "Player 1",
    opponentName: match.player2_guest_name || match.player2_user_id || "Player 2",
    startScore: match.start_score,
    playerLegs: match.player1_legs_won,
    opponentLegs: match.player2_legs_won,
    matchStatus: match.match_status,
    rounds: currentRounds.length > 0 ? currentRounds : initializeRounds(match.start_score),
  };
}

/**
 * Map API Throw DTO to Round Score update
 */
export function mapThrowDtoToRoundScore(
  throwDto: MatchLegThrowDTO,
  currentRounds: RoundScore[],
  startScore = 501
): RoundScore[] {
  const updatedRounds = [...currentRounds];
  const roundIndex = throwDto.round_number - 1;

  // Ensure the round exists
  while (updatedRounds.length <= roundIndex) {
    updatedRounds.push({
      round: updatedRounds.length + 1,
      player1Scored: null,
      player1ToGo: 0,
      player2Scored: null,
      player2ToGo: 0,
    });
  }

  const round = updatedRounds[roundIndex];
  const player = throwDto.player_number === 1 ? "player" : "opponent";

  if (throwDto.player_number === 1) {
    // Update player 1 based on throw number
    if (throwDto.throw_number === 3 || throwDto.remaining_score === 0) {
      round.player1Scored = throwDto.score;
      round.player1ToGo = throwDto.remaining_score;
    }
  } else {
    // Update player 2 based on throw number
    if (throwDto.throw_number === 3 || throwDto.remaining_score === 0) {
      round.player2Scored = throwDto.score;
      round.player2ToGo = throwDto.remaining_score;
    }
  }

  // Recalculate subsequent rounds for this player (in case editing a previous round)
  if (roundIndex < updatedRounds.length - 1) {
    return recalculateToGoScores(updatedRounds, roundIndex + 1, player, startScore);
  }

  return updatedRounds;
}

/**
 * Map API Stats DTO to Player Match Stats
 */
export function mapStatsToPlayerMatchStats(stats: StandaloneMatchStatsDTO): PlayerMatchStats {
  const checkoutPercentage =
    stats.checkout_attempts > 0 ? (stats.successful_checkouts / stats.checkout_attempts) * 100 : 0;

  return {
    totalScore: stats.total_score,
    dartsThrown: stats.darts_thrown,
    roundsPlayed: stats.rounds_played,
    averageScore: stats.average_score,
    first9Average: stats.first_9_average,
    scores60Plus: stats.scores_60_plus,
    scores80Plus: stats.scores_80_plus,
    scores100Plus: stats.scores_100_plus,
    scores120Plus: stats.scores_120_plus,
    scores140Plus: stats.scores_140_plus,
    scores170Plus: stats.scores_170_plus,
    scores180: stats.scores_180,
    checkoutAttempts: stats.checkout_attempts,
    successfulCheckouts: stats.successful_checkouts,
    checkoutPercentage,
    highFinish: stats.high_finish,
    finishes100Plus: stats.finishes_100_plus,
    bestLegDarts: stats.best_leg_darts,
    worstLegDarts: stats.worst_leg_darts,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Initialize empty rounds for a new leg
 */
export function initializeRounds(startScore: number, count = 4): RoundScore[] {
  const rounds: RoundScore[] = [];
  for (let i = 0; i < count; i++) {
    rounds.push({
      round: i + 1,
      player1Scored: null,
      player1ToGo: i === 0 ? startScore : 0,
      player2Scored: null,
      player2ToGo: i === 0 ? startScore : 0,
    });
  }
  return rounds;
}

/**
 * Calculate if a score is a bust
 */
export function isBust(currentScore: number, thrownScore: number): boolean {
  const remaining = currentScore - thrownScore;
  return remaining < 0 || remaining === 1;
}

/**
 * Calculate if a throw is a winning throw
 */
export function isWinningThrow(currentScore: number, thrownScore: number): boolean {
  return currentScore - thrownScore === 0;
}

/**
 * Calculate if a score is a checkout attempt (remaining <= 170)
 */
export function isCheckoutAttempt(remainingScore: number): boolean {
  return remainingScore > 0 && remainingScore <= 170;
}

/**
 * Get player number from player identifier
 */
export function getPlayerNumber(player: "player" | "opponent"): PlayerNumber {
  return player === "player" ? 1 : 2;
}

/**
 * Get player identifier from player number
 */
export function getPlayerIdentifier(playerNumber: PlayerNumber): "player" | "opponent" {
  return playerNumber === 1 ? "player" : "opponent";
}

/**
 * Calculate total darts thrown in a leg
 */
export function calculateTotalDarts(completedRounds: number, dartsInLastRound: number): number {
  return completedRounds * 3 + dartsInLastRound;
}

/**
 * Calculate average score from rounds
 */
export function calculateAverage(rounds: RoundScore[], player: "player" | "opponent"): number {
  let totalScore = 0;
  let dartsThrown = 0;

  rounds.forEach((round) => {
    const scored = player === "player" ? round.player1Scored : round.player2Scored;
    if (scored !== null) {
      totalScore += scored;
      dartsThrown += 3; // Each round is 3 darts
    }
  });

  if (dartsThrown === 0) return 0;
  return (totalScore / dartsThrown) * 3; // 3-dart average
}

/**
 * Recalculate "To Go" scores from a specific round forward
 */
export function recalculateToGoScores(
  rounds: RoundScore[],
  fromIndex: number,
  player: "player" | "opponent",
  startScore: number
): RoundScore[] {
  const updatedRounds = [...rounds];

  for (let i = fromIndex; i < updatedRounds.length; i++) {
    const round = updatedRounds[i];
    const prevToGo =
      i > 0 ? (player === "player" ? updatedRounds[i - 1].player1ToGo : updatedRounds[i - 1].player2ToGo) : startScore;

    if (player === "player") {
      if (round.player1Scored !== null) {
        const newToGo = prevToGo - round.player1Scored;
        round.player1ToGo = newToGo < 0 || newToGo === 1 ? prevToGo : newToGo;
      } else {
        round.player1ToGo = prevToGo;
      }
    } else {
      if (round.player2Scored !== null) {
        const newToGo = prevToGo - round.player2Scored;
        round.player2ToGo = newToGo < 0 || newToGo === 1 ? prevToGo : newToGo;
      } else {
        round.player2ToGo = prevToGo;
      }
    }
  }

  return updatedRounds;
}

/**
 * Find the current active cell (first unscored position)
 */
export function findCurrentActiveCell(rounds: RoundScore[]): {
  roundIndex: number;
  player: "player" | "opponent";
} | null {
  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i];
    if (round.player1Scored === null) {
      return { roundIndex: i, player: "player" };
    }
    if (round.player2Scored === null) {
      return { roundIndex: i, player: "opponent" };
    }
  }
  return null; // All rounds are complete
}

/**
 * Check if editing a previous round (has future scores)
 */
export function isEditingPreviousRound(rounds: RoundScore[], currentRoundIndex: number): boolean {
  for (let i = currentRoundIndex + 1; i < rounds.length; i++) {
    const round = rounds[i];
    if (round.player1Scored !== null || round.player2Scored !== null) {
      return true;
    }
  }
  return false;
}

/**
 * Validate throw score (0-180)
 */
export function isValidThrowScore(score: number): boolean {
  return !isNaN(score) && score >= 0 && score <= 180;
}

/**
 * Get current display score (most recent "To Go" value)
 */
export function getCurrentDisplayScore(
  rounds: RoundScore[],
  player: "player" | "opponent",
  startScore: number
): number {
  for (let i = rounds.length - 1; i >= 0; i--) {
    const round = rounds[i];
    const toGo = player === "player" ? round.player1ToGo : round.player2ToGo;
    const scored = player === "player" ? round.player1Scored : round.player2Scored;

    if (toGo > 0 || scored !== null) {
      return toGo;
    }
  }
  return startScore;
}

// ============================================================================
// LocalStorage Helpers (for backward compatibility with current components)
// ============================================================================

const STORAGE_KEYS = {
  MATCH_SETUP: "dartMatchSetup",
  MATCH_STATE: "dartMatchState",
  SESSION_ID: "dartSessionId",
} as const;

/**
 * Save match setup to localStorage
 */
export function saveMatchSetup(setup: MatchSetup): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MATCH_SETUP, JSON.stringify(setup));
  } catch (error) {
    console.error("Failed to save match setup:", error);
  }
}

/**
 * Load match setup from localStorage
 */
export function loadMatchSetup(): MatchSetup | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MATCH_SETUP);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Failed to load match setup:", error);
    return null;
  }
}

/**
 * Clear match setup from localStorage
 */
export function clearMatchSetup(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.MATCH_SETUP);
  } catch (error) {
    console.error("Failed to clear match setup:", error);
  }
}

/**
 * Save match state to localStorage
 */
export function saveMatchState(state: MatchState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MATCH_STATE, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to save match state:", error);
  }
}

/**
 * Load match state from localStorage
 */
export function loadMatchState(): MatchState | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MATCH_STATE);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Failed to load match state:", error);
    return null;
  }
}

/**
 * Clear match state from localStorage
 */
export function clearMatchState(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.MATCH_STATE);
  } catch (error) {
    console.error("Failed to clear match state:", error);
  }
}

/**
 * Save session ID to localStorage
 */
export function saveSessionId(sessionId: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SESSION_ID, sessionId);
  } catch (error) {
    console.error("Failed to save session ID:", error);
  }
}

/**
 * Load session ID from localStorage
 */
export function loadSessionId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.SESSION_ID);
  } catch (error) {
    console.error("Failed to load session ID:", error);
    return null;
  }
}

/**
 * Generate a new session ID (UUID v4)
 */
export function generateSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Get or create session ID
 */
export function getOrCreateSessionId(): string {
  let sessionId = loadSessionId();
  if (!sessionId) {
    sessionId = generateSessionId();
    saveSessionId(sessionId);
  }
  return sessionId;
}
