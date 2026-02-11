import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Delete, CheckCircle, ArrowLeft, BarChart3 } from "lucide-react";
import { useStandaloneMatch } from "@/lib/hooks/useStandaloneMatch";
import { loadMatchSetup, loadMatchState } from "@/lib/models/standalone-match.models";

interface GuestScoreBoardProps {
  onExit?: () => void;
}

export function GuestScoreBoard({ onExit }: GuestScoreBoardProps = {}) {
  const [isMobile, setIsMobile] = useState(false);
  const [checkoutDarts, setCheckoutDarts] = useState<number | null>(null);
  const [showCheckoutInput, setShowCheckoutInput] = useState(false);

  // Ref for active round row to enable auto-scroll
  const activeRowRef = useRef<HTMLDivElement>(null);

  // Ref to track if we've initialized the match
  const hasInitialized = useRef(false);

  // Match state and operations from hook
  const {
    matchState,
    setupMatch,
    startMatch,
    handleNumberInput,
    handleBackspace,
    handleEnter: hookHandleEnter,
    handleCellClick,
    startNewLeg,
    exitMatch,
    getCurrentInput,
    isLegFinished,
    getWinner,
  } = useStandaloneMatch({
    autoSave: true,
    autoAcquireLock: false, // No API lock for local-only mode
    defaultMatchTypeId: "550e8400-e29b-41d4-a716-446655440501", // UUID for "501" match type (from database)
  });

  // Derived state from matchState
  const playerName = matchState?.playerName || "";
  const opponentName = matchState?.opponentName || "";
  const startScore = matchState?.startScore || 501;
  const playerLegs = matchState?.playerLegs || 0;
  const opponentLegs = matchState?.opponentLegs || 0;
  const rounds = matchState?.rounds || [];
  const activeRoundIndex = matchState?.activeRoundIndex || 0;
  const activePlayer = matchState?.activePlayer || "player";
  const currentInput = getCurrentInput();
  const legFinished = isLegFinished();
  const winner = getWinner();

  // Load match setup from localStorage on mount
  useEffect(() => {
    // Prevent double initialization
    if (hasInitialized.current) {
      return;
    }

    const loadMatch = async () => {
      console.log("🏁 GuestScoreBoard: Starting match initialization");

      // Check localStorage directly (don't rely on matchState which may not be set yet)
      const savedMatchState = loadMatchState();

      if (savedMatchState && savedMatchState.matchId) {
        console.log("✅ Match already exists in localStorage:", {
          matchId: savedMatchState.matchId,
          status: savedMatchState.matchStatus,
          hasLock: savedMatchState.hasLock,
        });
        console.log("⏳ Waiting for hook to load state...");
        hasInitialized.current = true;
        return; // No loading state change needed
      }

      const setup = loadMatchSetup();
      if (!setup) {
        // No setup found, go back to setup page
        console.log("❌ No setup found, returning to setup");
        if (onExit) {
          onExit();
        } else {
          window.location.href = "/";
        }
        return;
      }

      console.log("📋 Setup loaded from localStorage:", setup);

      try {
        console.log("⏳ Calling setupMatch...");
        const initialState = await setupMatch(setup);
        console.log("✅ setupMatch completed");

        console.log("⏳ Calling startMatch...");
        await startMatch(initialState);
        console.log("✅ startMatch completed");

        hasInitialized.current = true;
      } catch (error) {
        console.error("❌ Error loading match setup:", error);
        if (onExit) {
          onExit();
        } else {
          window.location.href = "/";
        }
      }
    };

    loadMatch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-scroll to active round
  useEffect(() => {
    if (activeRowRef.current && !legFinished) {
      activeRowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeRoundIndex, legFinished]);

  // Show checkout input when leg finishes
  useEffect(() => {
    if (legFinished && !showCheckoutInput && checkoutDarts === null) {
      setShowCheckoutInput(true);
    }
  }, [legFinished, showCheckoutInput, checkoutDarts]);

  // Handle keyboard events for desktop
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isMobile || legFinished) return;

      // Ignore if user is typing in an input field or if Chrome translation is interfering
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable ||
        // Check if Chrome translation is active
        target.hasAttribute("data-translate") ||
        target.closest("[translate]")
      ) {
        return;
      }

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleNumberInput(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "Enter") {
        e.preventDefault();
        hookHandleEnter();
      }
    };

    // Use capture phase to ensure we catch events before Chrome translation interferes
    window.addEventListener("keydown", handleKeyPress, true);
    return () => window.removeEventListener("keydown", handleKeyPress, true);
  }, [isMobile, legFinished, handleNumberInput, handleBackspace, hookHandleEnter]);

  // Start new leg handler
  const handleStartNewLeg = () => {
    startNewLeg();
    setCheckoutDarts(null);
    setShowCheckoutInput(false);
  };

  // Exit handler
  const handleExit = async () => {
    await exitMatch();

    // Use callback for SPA navigation or fallback to page navigation
    if (onExit) {
      onExit();
    } else {
      // Fallback for backward compatibility (if used standalone)
      window.location.href = "/";
    }
  };

  // Get current display score (most recent "To Go" value)
  const getCurrentDisplayScore = (player: "player" | "opponent") => {
    for (let i = rounds.length - 1; i >= 0; i--) {
      const round = rounds[i];
      const toGo = player === "player" ? round.player1ToGo : round.player2ToGo;
      const scored = player === "player" ? round.player1Scored : round.player2Scored;

      if (toGo > 0 || scored !== null) {
        return toGo;
      }
    }
    return startScore;
  };

  // Show all rounds (scrolling will handle visibility)
  const visibleRounds = rounds;
  const firstVisibleRoundIndex = 0;

  // Show content immediately - data comes from localStorage so it's instant
  // Only show loading if hook is genuinely loading (which should be brief)
  const showContent = matchState !== null;

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-background to-muted/30 flex flex-col transition-opacity duration-200 ${showContent ? "opacity-100" : "opacity-0"}`}
      translate="no"
    >
      {/* Header - Player Names and Leg Scores */}
      <div className="bg-card border-b sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
          {/* Action Buttons */}
          <div className="max-w-4xl mx-auto mb-2 flex gap-2">
            <Button onClick={handleExit} variant="ghost" size="sm" className="gap-1 sm:gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Exit</span>
            </Button>
            <Button
              onClick={() => {
                // TODO: Implement stats functionality
              }}
              variant="ghost"
              size="sm"
              className="gap-1 sm:gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Stats</span>
            </Button>
          </div>
          <div className="flex items-center justify-between gap-2 sm:gap-4 max-w-4xl mx-auto">
            <div
              className={`flex-1 text-center min-w-0 transition-all rounded-lg p-2 ${
                activePlayer === "player" && !legFinished ? "bg-teal-500/10 ring-2 ring-teal-500" : ""
              }`}
            >
              <div className="font-bold text-sm sm:text-lg md:text-2xl truncate mb-1 sm:mb-2">{playerName}</div>
              <div className="text-4xl sm:text-6xl md:text-8xl font-bold text-teal-400 leading-none">
                {getCurrentDisplayScore("player")}
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 sm:gap-2 px-2 sm:px-4 min-w-fit flex-shrink-0">
              <div className="text-3xl sm:text-5xl md:text-6xl font-bold whitespace-nowrap">
                {playerLegs} : {opponentLegs}
              </div>
              <div className="text-xs sm:text-sm md:text-base text-muted-foreground">LEGS</div>
            </div>

            <div
              className={`flex-1 text-center min-w-0 transition-all rounded-lg p-2 ${
                activePlayer === "opponent" && !legFinished ? "bg-purple-500/10 ring-2 ring-purple-500" : ""
              }`}
            >
              <div className="font-bold text-sm sm:text-lg md:text-2xl truncate mb-1 sm:mb-2">{opponentName}</div>
              <div className="text-4xl sm:text-6xl md:text-8xl font-bold text-purple-400 leading-none">
                {getCurrentDisplayScore("opponent")}
              </div>
            </div>
          </div>

          {/* Leg Finished Message */}
          {legFinished && (
            <div className="mt-2 sm:mt-4 text-center px-2">
              <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500 px-3 sm:px-6 py-2 sm:py-3 rounded-lg">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                <span className="font-bold text-base sm:text-lg">
                  {winner === "player" ? `${playerName} wins!` : `${opponentName} wins!`}
                </span>
              </div>

              {/* Checkout Darts Input */}
              {showCheckoutInput && (
                <div className="mt-3 sm:mt-4 inline-block">
                  <div className="bg-card border rounded-lg p-3 sm:p-4 shadow-lg">
                    <p className="block text-sm font-medium mb-3">How many darts to finish the last round?</p>
                    <div className="flex gap-3 justify-center">
                      {[1, 2, 3].map((dartsInLastRound) => (
                        <Button
                          key={dartsInLastRound}
                          onClick={() => {
                            const totalDarts = activeRoundIndex * 3 + dartsInLastRound;
                            setCheckoutDarts(totalDarts);
                            setShowCheckoutInput(false);
                          }}
                          variant="outline"
                          size="lg"
                          className="text-lg font-bold min-w-[60px]"
                        >
                          {dartsInLastRound}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {checkoutDarts !== null && !showCheckoutInput && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Finished in {checkoutDarts} {checkoutDarts === 1 ? "dart" : "darts"}
                </div>
              )}

              {!showCheckoutInput && (
                <Button onClick={handleStartNewLeg} className="mt-2 sm:mt-3 ml-2 sm:ml-3" size="lg">
                  Start New Leg
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Score Table */}
      <div className="flex-1 overflow-auto pb-2 sm:pb-4">
        <div className="container mx-auto px-2 sm:px-4 py-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Table Header */}
            <div className="bg-card border rounded-lg overflow-hidden max-h-[400px] sm:max-h-[500px] overflow-y-auto relative">
              <div className="sticky top-0 z-[5] bg-card border-b">
                <div className="grid grid-cols-5 gap-1 sm:gap-2 p-2 sm:p-3 bg-muted/50 font-semibold text-xs sm:text-sm">
                  <div className="text-center text-teal-400">Scored</div>
                  <div className="text-center text-teal-400">To Go</div>
                  <div className="text-center">Darts</div>
                  <div className="text-center text-purple-400">To Go</div>
                  <div className="text-center text-purple-400">Scored</div>
                </div>
              </div>

              {/* Score Rows */}
              <div className="divide-y">
                {visibleRounds.map((round, idx) => {
                  const actualRoundIndex = firstVisibleRoundIndex + idx;
                  const isActiveRound = actualRoundIndex === activeRoundIndex;
                  const isPlayer1Active = isActiveRound && activePlayer === "player" && !legFinished;
                  const isPlayer2Active = isActiveRound && activePlayer === "opponent" && !legFinished;

                  return (
                    <div
                      key={actualRoundIndex}
                      ref={isActiveRound ? activeRowRef : null}
                      className={`grid grid-cols-5 gap-1 sm:gap-2 p-2 sm:p-3 ${
                        isActiveRound && !legFinished ? "bg-muted/30" : ""
                      }`}
                    >
                      {/* Player 1 Scored */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleCellClick(actualRoundIndex, "player")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleCellClick(actualRoundIndex, "player");
                          }
                        }}
                        className={`text-center p-1 sm:p-2 rounded cursor-pointer transition-all ${
                          isPlayer1Active
                            ? "bg-teal-500/20 border-2 border-teal-500 font-bold"
                            : round.player1Scored !== null && round.player1Scored >= 100
                              ? "bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500"
                              : round.player1Scored !== null
                                ? "bg-teal-500/10 hover:bg-teal-500/20"
                                : "hover:bg-teal-500/10"
                        }`}
                      >
                        <div
                          className={`text-base sm:text-lg font-bold ${
                            round.player1Scored !== null && round.player1Scored >= 100 ? "text-amber-400" : ""
                          }`}
                        >
                          {isPlayer1Active && currentInput
                            ? currentInput
                            : round.player1Scored !== null
                              ? round.player1Scored
                              : "-"}
                        </div>
                      </div>

                      {/* Player 1 To Go */}
                      <div className="text-center p-1 sm:p-2 rounded bg-muted/20">
                        <div className="text-base sm:text-lg font-bold text-teal-400">
                          {round.player1Scored !== null && round.player1ToGo > 0
                            ? round.player1ToGo
                            : round.player1Scored !== null && round.player1ToGo === 0
                              ? 0
                              : "-"}
                        </div>
                      </div>

                      {/* Darts (3, 6, 9, 12...) */}
                      <div className="text-center p-1 sm:p-2 flex items-center justify-center">
                        <div className="text-base sm:text-lg font-bold">{round.round * 3}</div>
                      </div>

                      {/* Player 2 To Go */}
                      <div className="text-center p-1 sm:p-2 rounded bg-muted/20">
                        <div className="text-base sm:text-lg font-bold text-purple-400">
                          {round.player2Scored !== null && round.player2ToGo > 0
                            ? round.player2ToGo
                            : round.player2Scored !== null && round.player2ToGo === 0
                              ? 0
                              : "-"}
                        </div>
                      </div>

                      {/* Player 2 Scored */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleCellClick(actualRoundIndex, "opponent")}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleCellClick(actualRoundIndex, "opponent");
                          }
                        }}
                        className={`text-center p-1 sm:p-2 rounded cursor-pointer transition-all ${
                          isPlayer2Active
                            ? "bg-purple-500/20 border-2 border-purple-500 font-bold"
                            : round.player2Scored !== null && round.player2Scored >= 100
                              ? "bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500"
                              : round.player2Scored !== null
                                ? "bg-purple-500/10 hover:bg-purple-500/20"
                                : "hover:bg-purple-500/10"
                        }`}
                      >
                        <div
                          className={`text-base sm:text-lg font-bold ${
                            round.player2Scored !== null && round.player2Scored >= 100 ? "text-amber-400" : ""
                          }`}
                        >
                          {isPlayer2Active && currentInput
                            ? currentInput
                            : round.player2Scored !== null
                              ? round.player2Scored
                              : "-"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Keyboard */}
      {isMobile && !legFinished && (
        <div className="bg-card border-t sticky bottom-0 z-20 shadow-lg safe-area-bottom" translate="no">
          <div className="container mx-auto px-3 py-3">
            <div className="max-w-sm mx-auto grid grid-cols-3 gap-2">
              {/* Row 1: 1, 2, 3 */}
              <Button
                onClick={() => handleNumberInput("1")}
                variant="outline"
                size="lg"
                className="h-14 sm:h-16 text-xl sm:text-2xl font-bold"
              >
                1
              </Button>
              <Button
                onClick={() => handleNumberInput("2")}
                variant="outline"
                size="lg"
                className="h-14 sm:h-16 text-xl sm:text-2xl font-bold"
              >
                2
              </Button>
              <Button
                onClick={() => handleNumberInput("3")}
                variant="outline"
                size="lg"
                className="h-14 sm:h-16 text-xl sm:text-2xl font-bold"
              >
                3
              </Button>

              {/* Row 2: 4, 5, 6 */}
              <Button
                onClick={() => handleNumberInput("4")}
                variant="outline"
                size="lg"
                className="h-14 sm:h-16 text-xl sm:text-2xl font-bold"
              >
                4
              </Button>
              <Button
                onClick={() => handleNumberInput("5")}
                variant="outline"
                size="lg"
                className="h-14 sm:h-16 text-xl sm:text-2xl font-bold"
              >
                5
              </Button>
              <Button
                onClick={() => handleNumberInput("6")}
                variant="outline"
                size="lg"
                className="h-14 sm:h-16 text-xl sm:text-2xl font-bold"
              >
                6
              </Button>

              {/* Row 3: 7, 8, 9 */}
              <Button
                onClick={() => handleNumberInput("7")}
                variant="outline"
                size="lg"
                className="h-14 sm:h-16 text-xl sm:text-2xl font-bold"
              >
                7
              </Button>
              <Button
                onClick={() => handleNumberInput("8")}
                variant="outline"
                size="lg"
                className="h-14 sm:h-16 text-xl sm:text-2xl font-bold"
              >
                8
              </Button>
              <Button
                onClick={() => handleNumberInput("9")}
                variant="outline"
                size="lg"
                className="h-14 sm:h-16 text-xl sm:text-2xl font-bold"
              >
                9
              </Button>

              {/* Row 4: Backspace, 0, Enter */}
              <Button onClick={handleBackspace} variant="outline" size="lg" className="h-14 sm:h-16">
                <Delete className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
              <Button
                onClick={() => handleNumberInput("0")}
                variant="outline"
                size="lg"
                className="h-14 sm:h-16 text-xl sm:text-2xl font-bold"
              >
                0
              </Button>
              <Button
                onClick={hookHandleEnter}
                variant="default"
                size="lg"
                className="h-14 sm:h-16 bg-green-600 hover:bg-green-700"
                disabled={!currentInput}
              >
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
