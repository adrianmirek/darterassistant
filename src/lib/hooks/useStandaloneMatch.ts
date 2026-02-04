/**
 * useStandaloneMatch Hook
 *
 * Custom React hook for managing standalone match state and operations.
 * Integrates with the TopDarter API and provides all functionality needed
 * by the guest scoring components.
 *
 * Features:
 * - Match setup and creation
 * - Score entry and validation
 * - Lock management
 * - Statistics calculation
 * - State persistence
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  MatchSetup,
  MatchState,
  ThrowEntry,
  PlayerMatchStats,
  MatchSummary,
} from "@/lib/models/standalone-match.models";
import {
  buildCreateMatchCommand,
  buildCreateThrowCommand,
  buildAcquireLockCommand,
  mapThrowDtoToRoundScore,
  mapStatsToPlayerMatchStats,
  initializeRounds,
  isBust,
  isWinningThrow,
  isCheckoutAttempt,
  recalculateToGoScores,
  findCurrentActiveCell,
  isValidThrowScore,
  getCurrentDisplayScore,
  getOrCreateSessionId,
  saveMatchState,
  loadMatchState,
  clearMatchState,
} from "@/lib/models/standalone-match.models";
import {
  startNewMatch,
  getMatch,
  updateMatch,
  recordThrow,
  acquireMatchLock,
  getMatchStats,
  endMatch,
  ApiError,
} from "@/lib/services/standalone-match.service";

// ============================================================================
// Hook Return Type
// ============================================================================

export interface UseStandaloneMatchReturn {
  // Match state
  matchState: MatchState | null;
  isLoading: boolean;
  error: string | null;

  // Match setup
  setupMatch: (setup: MatchSetup) => Promise<MatchState>;
  startMatch: (providedState?: MatchState) => Promise<void>;

  // Score entry
  enterScore: (score: number) => Promise<void>;
  undoLastScore: () => Promise<void>;
  editScore: (roundIndex: number, player: "player" | "opponent", score: number) => Promise<void>;

  // Match control
  pauseMatch: () => Promise<void>;
  resumeMatch: () => Promise<void>;
  completeLeg: (dartsInLastRound: number) => Promise<void>;
  startNewLeg: () => void;
  exitMatch: () => Promise<void>;

  // UI helpers
  handleNumberInput: (num: string) => void;
  handleBackspace: () => void;
  handleEnter: () => void;
  handleCellClick: (roundIndex: number, player: "player" | "opponent") => void;
  switchPlayer: () => void;

  // Statistics
  getPlayerStats: (player: "player" | "opponent") => PlayerMatchStats | null;
  getMatchSummary: () => MatchSummary | null;

  // Utilities
  getCurrentInput: () => string;
  getActivePlayer: () => "player" | "opponent";
  getActiveRoundIndex: () => number;
  isLegFinished: () => boolean;
  getWinner: () => "player" | "opponent" | null;
}

// ============================================================================
// Hook Configuration
// ============================================================================

interface UseStandaloneMatchOptions {
  autoSave?: boolean;
  autoAcquireLock?: boolean;
  defaultMatchTypeId?: string;
}

const DEFAULT_OPTIONS: UseStandaloneMatchOptions = {
  autoSave: true,
  autoAcquireLock: true,
  defaultMatchTypeId: "550e8400-e29b-41d4-a716-446655440501", // UUID for "501" match type (from database)
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function useStandaloneMatch(options: UseStandaloneMatchOptions = {}): UseStandaloneMatchReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Session management
  const sessionId = useRef<string>(getOrCreateSessionId());

  // State
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentInput, setCurrentInput] = useState("");
  const [playerStats, setPlayerStats] = useState<PlayerMatchStats | null>(null);
  const [opponentStats, setOpponentStats] = useState<PlayerMatchStats | null>(null);

  // Load saved state on mount
  useEffect(() => {
    const savedState = loadMatchState();
    console.log("📂 Loading saved state on mount:", {
      exists: !!savedState,
      matchId: savedState?.matchId,
      hasLock: savedState?.hasLock,
      status: savedState?.matchStatus,
    });

    if (savedState) {
      setMatchState(savedState);

      // If match is in progress but has no lock, try to acquire one
      if (
        savedState.matchId &&
        !savedState.matchId.startsWith("local-") &&
        savedState.matchStatus === "in_progress" &&
        !savedState.hasLock
      ) {
        console.log("🔄 Match loaded without lock, attempting to acquire...");

        acquireMatchLock(savedState.matchId, sessionId.current, buildAcquireLockCommand(true))
          .then((lock) => {
            console.log("✅ Lock acquired after reload:", lock.match_id);
            setMatchState((prev) => (prev ? { ...prev, hasLock: true } : prev));
          })
          .catch((error) => {
            console.warn("⚠️ Could not acquire lock after reload:", error);
            // Continue without lock - will work in local-only mode
          });
      }
    }
  }, []);

  // Auto-save state changes
  useEffect(() => {
    if (opts.autoSave && matchState) {
      console.log("💾 Auto-saving match state:", {
        matchId: matchState.matchId,
        hasLock: matchState.hasLock,
        status: matchState.matchStatus,
      });
      saveMatchState(matchState);
    }
  }, [matchState, opts.autoSave]);

  // ============================================================================
  // Error Handling
  // ============================================================================

  const handleError = useCallback((err: unknown) => {
    if (err instanceof ApiError) {
      setError(err.message);
      console.error("API Error:", err.code, err.message, err.details);
    } else if (err instanceof Error) {
      setError(err.message);
      console.error("Error:", err);
    } else {
      setError("An unexpected error occurred");
      console.error("Unknown error:", err);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================================
  // Match Setup
  // ============================================================================

  const setupMatch = useCallback(
    async (setup: MatchSetup): Promise<MatchState> => {
      console.log("🎬 setupMatch called with:", setup);
      console.log("📊 Current matchState before setup:", matchState);

      clearError();
      setIsLoading(true);

      try {
        // Initialize match state
        const initialState: MatchState = {
          playerName: setup.playerName,
          opponentName: setup.opponentName,
          startScore: setup.startScore,
          limitRounds: setup.limitRounds,
          rounds: initializeRounds(setup.startScore),
          activeRoundIndex: 0,
          activePlayer: "player",
          currentInput: "",
          playerLegs: 0,
          opponentLegs: 0,
          currentLeg: 1, // Start with leg 1
          legFinished: false,
          winner: null,
          checkoutDarts: null,
          matchStatus: "setup",
          hasLock: false,
        };

        console.log("🆕 Setting new match state (status: setup)");
        setMatchState(initialState);
        return initialState;
      } catch (err) {
        handleError(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [opts.defaultMatchTypeId, clearError, handleError]
  );

  const startMatch = useCallback(
    async (providedState?: MatchState) => {
      // Use provided state or fall back to current matchState
      const stateToUse = providedState || matchState;

      console.log("🚀 startMatch called");
      console.log("📊 Current matchState:", {
        exists: !!stateToUse,
        matchId: stateToUse?.matchId,
        status: stateToUse?.matchStatus,
        hasLock: stateToUse?.hasLock,
      });

      if (!stateToUse) {
        setError("No match state to start");
        console.error("❌ Cannot start match: matchState is null");
        return;
      }

      clearError();
      setIsLoading(true);

      try {
        // Build setup from current state
        const setup: MatchSetup = {
          playerName: stateToUse.playerName,
          opponentName: stateToUse.opponentName,
          startScore: stateToUse.startScore,
          limitRounds: stateToUse.limitRounds,
          formatType: "unlimited",
          checkoutRule: "double_out",
        };

        const command = buildCreateMatchCommand(setup, opts.defaultMatchTypeId ?? "");

        // Try to start the match via API
        try {
          const { match, lock } = await startNewMatch(command, sessionId.current);

          console.log("🔐 Match start response:", {
            matchId: match.id,
            lockReceived: !!lock,
            lockMatchId: lock?.match_id,
          });

          // Update state with API response
          setMatchState((prev) => {
            if (!prev) return prev;
            const newState = {
              ...prev,
              matchId: match.id,
              matchStatus: "in_progress" as const,
              hasLock: !!lock, // Set based on whether we got a lock
              sessionId: sessionId.current,
            };

            console.log("🔄 Updating match state:", {
              prevMatchId: prev?.matchId,
              newMatchId: newState.matchId,
              hasLock: newState.hasLock,
            });

            return newState;
          });

          console.log("✅ Match created in database:", match.id, "hasLock:", !!lock);
        } catch (apiError) {
          // API not available - work in local-only mode
          console.warn("⚠️ API not available, working in local-only mode:", apiError);

          // Create a local pseudo-matchId for tracking
          const localMatchId = `local-${crypto.randomUUID()}`;

          setMatchState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              matchId: localMatchId,
              matchStatus: "in_progress",
              hasLock: false, // No API lock in local mode
              sessionId: sessionId.current,
            };
          });

          console.log("📱 Match running locally:", localMatchId);
        }
      } catch (err) {
        handleError(err);
      } finally {
        setIsLoading(false);
      }
    },
    [matchState, opts.defaultMatchTypeId, clearError, handleError]
  );

  // ============================================================================
  // Score Entry
  // ============================================================================

  const enterScore = useCallback(
    async (score: number) => {
      if (!matchState || matchState.legFinished) {
        return;
      }

      if (!isValidThrowScore(score)) {
        setError("Invalid score (must be 0-180)");
        return;
      }

      clearError();

      const { rounds, activeRoundIndex, activePlayer, startScore, matchId } = matchState;
      const activeRound = rounds[activeRoundIndex];

      if (!activeRound) {
        setError("No active round");
        return;
      }

      // Get current score - for editing a round, we need the score from the PREVIOUS round
      // For a new round, we use getCurrentDisplayScore
      const isEditingExistingScore =
        activePlayer === "player" ? activeRound.player1Scored !== null : activeRound.player2Scored !== null;

      let currentScore: number;
      if (isEditingExistingScore && activeRoundIndex > 0) {
        // Editing: get score from previous round
        const prevRound = rounds[activeRoundIndex - 1];
        currentScore = activePlayer === "player" ? prevRound.player1ToGo : prevRound.player2ToGo;
      } else if (activeRoundIndex === 0) {
        // First round always starts at startScore
        currentScore = startScore;
      } else {
        // New round: find the last scored round for this player
        currentScore = getCurrentDisplayScore(rounds, activePlayer, startScore);
      }

      const newScore = currentScore - score;
      const bustOccurred = isBust(currentScore, score);
      const winningThrow = isWinningThrow(currentScore, score);
      const checkoutAttemptFlag = isCheckoutAttempt(currentScore);

      // Calculate throw number (1-3)
      const throwNumber = 3; // Simplified - assume 3 darts per round

      // Create throw entry
      const throwEntry: ThrowEntry = {
        player: activePlayer,
        roundNumber: activeRound.round,
        throwNumber: throwNumber as 1 | 2 | 3,
        score: bustOccurred ? 0 : score,
        remainingScore: bustOccurred ? currentScore : newScore,
        isCheckoutAttempt: checkoutAttemptFlag,
        isBust: bustOccurred,
        isWinningThrow: winningThrow,
      };

      // Check if we should try API (real matchId, not local)
      const isLocalMode = !matchId || matchId.startsWith("local-");

      console.log("🎯 Score entry debug:", {
        matchId,
        isLocalMode,
        hasLock: matchState.hasLock,
        willCallAPI: !isLocalMode && matchState.hasLock,
      });

      if (!isLocalMode && matchState.hasLock) {
        // API mode - send to database
        try {
          const command = buildCreateThrowCommand(
            throwEntry,
            matchId,
            matchState.currentLeg, // Use current leg number from state
            1 // Current set number
          );

          console.log("📤 Sending throw command to API:", command);

          const { throw: throwDto, meta } = await recordThrow(matchId, command, sessionId.current);

          console.log("✅ Score saved to database:", throwDto.id);

          // Update rounds based on API response
          const updatedRounds = mapThrowDtoToRoundScore(throwDto, rounds, startScore);

          // Check if leg or match completed
          if (meta.leg_completed) {
            setMatchState((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                rounds: updatedRounds,
                legFinished: true,
                winner: activePlayer,
              };
            });

            // Fetch updated stats if match not completed
            if (!meta.match_completed && matchId) {
              const stats = await getMatchStats(matchId, undefined, sessionId.current);
              if (stats.length >= 2) {
                setPlayerStats(mapStatsToPlayerMatchStats(stats[0]));
                setOpponentStats(mapStatsToPlayerMatchStats(stats[1]));
              }
            }

            return;
          }

          // Update state with new rounds
          setMatchState((prev) => {
            if (!prev) return prev;

            const activeCell = findCurrentActiveCell(updatedRounds);

            // If no active cell found, all existing rounds are complete - create a new round
            if (!activeCell) {
              updatedRounds.push({
                round: updatedRounds.length + 1,
                player1Scored: null,
                player1ToGo: updatedRounds[updatedRounds.length - 1].player1ToGo,
                player2Scored: null,
                player2ToGo: updatedRounds[updatedRounds.length - 1].player2ToGo,
              });

              return {
                ...prev,
                rounds: updatedRounds,
                activePlayer: "player",
                activeRoundIndex: updatedRounds.length - 1,
              };
            }

            return {
              ...prev,
              rounds: updatedRounds,
              activePlayer: activeCell.player,
              activeRoundIndex: activeCell.roundIndex,
            };
          });
        } catch (err) {
          console.error("❌ Failed to save score to database:", err);
          handleError(err);
          // Fallback to local mode on API error
          updateLocalScore(throwEntry);
        }
      } else {
        // Local-only mode (no API available or local matchId)
        console.log("📱 Score saved locally only");
        updateLocalScore(throwEntry);
      }
    },
    [matchState, clearError, handleError]
  );

  // Helper function for local score updates
  const updateLocalScore = useCallback((throwEntry: ThrowEntry) => {
    setMatchState((prev) => {
      if (!prev) return prev;

      const { rounds, activeRoundIndex, startScore } = prev;
      const updatedRounds = [...rounds];
      const activeRound = updatedRounds[activeRoundIndex];

      // Update the round
      if (throwEntry.player === "player") {
        activeRound.player1Scored = throwEntry.score;
        activeRound.player1ToGo = throwEntry.remainingScore;
      } else {
        activeRound.player2Scored = throwEntry.score;
        activeRound.player2ToGo = throwEntry.remainingScore;
      }

      // Recalculate subsequent rounds for this player (in case editing a previous round)
      if (activeRoundIndex < updatedRounds.length - 1) {
        const recalculatedRounds = recalculateToGoScores(
          updatedRounds,
          activeRoundIndex + 1,
          throwEntry.player,
          startScore
        );
        updatedRounds.splice(0, updatedRounds.length, ...recalculatedRounds);
      }

      // Check for win
      if (throwEntry.isWinningThrow) {
        const newLegsWon = throwEntry.player === "player" ? prev.playerLegs + 1 : prev.opponentLegs + 1;

        return {
          ...prev,
          rounds: updatedRounds,
          legFinished: true,
          winner: throwEntry.player,
          playerLegs: throwEntry.player === "player" ? newLegsWon : prev.playerLegs,
          opponentLegs: throwEntry.player === "opponent" ? newLegsWon : prev.opponentLegs,
        };
      }

      // Move to next cell
      const activeCell = findCurrentActiveCell(updatedRounds);

      // If no active cell found, all existing rounds are complete - create a new round
      if (!activeCell) {
        updatedRounds.push({
          round: updatedRounds.length + 1,
          player1Scored: null,
          player1ToGo: updatedRounds[updatedRounds.length - 1].player1ToGo,
          player2Scored: null,
          player2ToGo: updatedRounds[updatedRounds.length - 1].player2ToGo,
        });
        // Set next cell to player 1 of the new round
        const nextPlayer = "player";
        const nextRoundIndex = updatedRounds.length - 1;

        return {
          ...prev,
          rounds: updatedRounds,
          activePlayer: nextPlayer,
          activeRoundIndex: nextRoundIndex,
        };
      }

      const nextPlayer = activeCell.player;
      const nextRoundIndex = activeCell.roundIndex;

      return {
        ...prev,
        rounds: updatedRounds,
        activePlayer: nextPlayer,
        activeRoundIndex: nextRoundIndex,
      };
    });
  }, []);

  const undoLastScore = useCallback(async () => {
    // TODO: Implement undo functionality with API
    console.warn("Undo not yet implemented");
  }, []);

  const editScore = useCallback(async () => {
    // TODO: Implement edit functionality with API
    console.warn("Edit not yet implemented");
  }, []);

  // ============================================================================
  // Match Control
  // ============================================================================

  const pauseMatch = useCallback(async () => {
    if (!matchState?.matchId) return;

    try {
      await updateMatch(matchState.matchId, { match_status: "paused" }, sessionId.current);

      setMatchState((prev) => (prev ? { ...prev, matchStatus: "paused" } : prev));
    } catch (err) {
      handleError(err);
    }
  }, [matchState?.matchId, handleError]);

  const resumeMatch = useCallback(async () => {
    if (!matchState?.matchId) return;

    try {
      await updateMatch(matchState.matchId, { match_status: "in_progress" }, sessionId.current);

      setMatchState((prev) => (prev ? { ...prev, matchStatus: "in_progress" } : prev));
    } catch (err) {
      handleError(err);
    }
  }, [matchState?.matchId, handleError]);

  const completeLeg = useCallback(
    async (dartsInLastRound: number) => {
      if (!matchState) return;

      setMatchState((prev) =>
        prev
          ? {
              ...prev,
              checkoutDarts: prev.activeRoundIndex * 3 + dartsInLastRound,
            }
          : prev
      );
    },
    [matchState]
  );

  const startNewLeg = useCallback(async () => {
    if (!matchState?.matchId) return;

    try {
      console.log("🔄 Starting new leg, fetching updated match data...");
      // Fetch updated match state from API to get latest leg counts
      const updatedMatch = await getMatch(matchState.matchId, sessionId.current, ["stats"]);

      console.log("✅ Updated match data:", {
        player1_legs_won: updatedMatch.player1_legs_won,
        player2_legs_won: updatedMatch.player2_legs_won,
        match_status: updatedMatch.match_status,
      });

      setMatchState((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          // Update leg counts from database
          playerLegs: updatedMatch.player1_legs_won,
          opponentLegs: updatedMatch.player2_legs_won,
          currentLeg: prev.currentLeg + 1, // Increment leg number
          // Reset leg state
          rounds: initializeRounds(prev.startScore),
          activeRoundIndex: 0,
          activePlayer: "player",
          currentInput: "",
          legFinished: false,
          winner: null,
          checkoutDarts: null,
        };
      });
    } catch (err) {
      console.error("❌ Error fetching updated match state:", err);
      // Fall back to just resetting the leg without updating counts
      setMatchState((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          rounds: initializeRounds(prev.startScore),
          activeRoundIndex: 0,
          activePlayer: "player",
          currentInput: "",
          legFinished: false,
          winner: null,
          checkoutDarts: null,
        };
      });
    }
  }, [matchState?.matchId]);

  const exitMatch = useCallback(async () => {
    if (matchState?.matchId && matchState.hasLock) {
      try {
        await endMatch(matchState.matchId, sessionId.current);
      } catch (err) {
        console.error("Error ending match:", err);
      }
    }

    clearMatchState();
    setMatchState(null);
    setPlayerStats(null);
    setOpponentStats(null);
  }, [matchState]);

  // ============================================================================
  // UI Helpers
  // ============================================================================

  const handleNumberInput = useCallback((num: string) => {
    setCurrentInput((prev) => (prev.length < 3 ? prev + num : prev));
  }, []);

  const handleBackspace = useCallback(() => {
    setCurrentInput((prev) => prev.slice(0, -1));
  }, []);

  const handleEnter = useCallback(() => {
    const score = parseInt(currentInput);
    if (!isNaN(score)) {
      enterScore(score);
      setCurrentInput("");
    }
  }, [currentInput, enterScore]);

  const handleCellClick = useCallback(
    (roundIndex: number, player: "player" | "opponent") => {
      if (matchState?.legFinished) return;

      setMatchState((prev) =>
        prev
          ? {
              ...prev,
              activeRoundIndex: roundIndex,
              activePlayer: player,
            }
          : prev
      );
      setCurrentInput("");
    },
    [matchState?.legFinished]
  );

  const switchPlayer = useCallback(() => {
    setMatchState((prev) =>
      prev
        ? {
            ...prev,
            activePlayer: prev.activePlayer === "player" ? "opponent" : "player",
          }
        : prev
    );
  }, []);

  // ============================================================================
  // Statistics
  // ============================================================================

  const getPlayerStats = useCallback(
    (player: "player" | "opponent") => {
      return player === "player" ? playerStats : opponentStats;
    },
    [playerStats, opponentStats]
  );

  const getMatchSummary = useCallback((): MatchSummary | null => {
    if (!matchState) return null;

    // TODO: Build complete match summary from state and stats
    return null;
  }, [matchState]);

  // ============================================================================
  // Utilities
  // ============================================================================

  const getCurrentInput = useCallback(() => currentInput, [currentInput]);
  const getActivePlayer = useCallback(() => matchState?.activePlayer || "player", [matchState]);
  const getActiveRoundIndex = useCallback(() => matchState?.activeRoundIndex || 0, [matchState]);
  const isLegFinished = useCallback(() => matchState?.legFinished || false, [matchState]);
  const getWinner = useCallback(() => matchState?.winner || null, [matchState]);

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  return {
    matchState,
    isLoading,
    error,

    setupMatch,
    startMatch,

    enterScore,
    undoLastScore,
    editScore,

    pauseMatch,
    resumeMatch,
    completeLeg,
    startNewLeg,
    exitMatch,

    handleNumberInput,
    handleBackspace,
    handleEnter,
    handleCellClick,
    switchPlayer,

    getPlayerStats,
    getMatchSummary,

    getCurrentInput,
    getActivePlayer,
    getActiveRoundIndex,
    isLegFinished,
    getWinner,
  };
}
