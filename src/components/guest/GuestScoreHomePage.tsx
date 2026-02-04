import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Delete, CheckCircle, ArrowLeft, BarChart3 } from "lucide-react";
import { useStandaloneMatch } from "@/lib/hooks/useStandaloneMatch";
import type { MatchSetup } from "@/lib/models/standalone-match.models";

interface GuestScoreHomePageProps {
  onSetupStateChange?: (isSetup: boolean) => void;
}

export function GuestScoreHomePage({ onSetupStateChange }: GuestScoreHomePageProps = {}) {
  // Setup form state (local until match created)
  const [isEditingNames, setIsEditingNames] = useState(true);
  const [setupForm, setSetupForm] = useState<MatchSetup>({
    playerName: "Player 1",
    opponentName: "Player 2",
    startScore: 501,
    limitRounds: null,
  });

  // Match state and operations from hook
  const {
    matchState,
    isLoading,
    error,
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
  const playerName = matchState?.playerName || setupForm.playerName;
  const opponentName = matchState?.opponentName || setupForm.opponentName;
  const startScore = matchState?.startScore || setupForm.startScore;
  const playerLegs = matchState?.playerLegs || 0;
  const opponentLegs = matchState?.opponentLegs || 0;
  const rounds = matchState?.rounds || [];
  const activeRoundIndex = matchState?.activeRoundIndex || 0;
  const activePlayer = matchState?.activePlayer || "player";
  const currentInput = getCurrentInput();
  const legFinished = isLegFinished();
  const winner = getWinner();
  const [isMobile, setIsMobile] = useState(false);
  const [checkoutDarts, setCheckoutDarts] = useState<number | null>(null);
  const [showCheckoutInput, setShowCheckoutInput] = useState(false);

  // Ref for active round row to enable auto-scroll
  const activeRowRef = useRef<HTMLDivElement>(null);

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
      if (isMobile || isEditingNames || legFinished) return;

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

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isMobile, isEditingNames, legFinished, handleNumberInput, handleBackspace, hookHandleEnter]);

  // Start scoring handler
  const handleStartScoring = async () => {
    if (setupForm.playerName.trim() && setupForm.opponentName.trim() && setupForm.startScore > 0) {
      try {
        await setupMatch(setupForm);
        await startMatch();
        setIsEditingNames(false);
        if (onSetupStateChange) {
          onSetupStateChange(false);
        }
      } catch (err) {
        console.error("Failed to start match:", err);
      }
    }
  };

  // Start new leg handler
  const handleStartNewLeg = () => {
    startNewLeg();
    setCheckoutDarts(null);
    setShowCheckoutInput(false);
  };

  // Exit handler
  const handleExit = async () => {
    await exitMatch();
    setIsEditingNames(true);
    setCheckoutDarts(null);
    setShowCheckoutInput(false);
    if (onSetupStateChange) {
      onSetupStateChange(true);
    }
  };

  // Show all rounds (scrolling will handle visibility)
  const visibleRounds = rounds;
  const firstVisibleRoundIndex = 0;

  return (
    <div
      className={`${isEditingNames ? "min-h-[calc(100vh-73px)]" : "min-h-screen"} bg-gradient-to-br from-background to-muted/30 flex flex-col`}
    >
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {/* Player Names Setup */}
      {isEditingNames && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border rounded-lg p-6 shadow-lg space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Setup Match</h2>
              <p className="text-sm text-muted-foreground">Enter player names to begin</p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="player1-name" className="text-sm font-medium mb-2 block">
                  Player 1 Name
                </label>
                <Input
                  id="player1-name"
                  type="text"
                  value={setupForm.playerName}
                  onChange={(e) => setSetupForm((prev) => ({ ...prev, playerName: e.target.value }))}
                  placeholder="Enter player 1 name"
                  className="text-lg"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="player2-name" className="text-sm font-medium mb-2 block">
                  Player 2 Name
                </label>
                <Input
                  id="player2-name"
                  type="text"
                  value={setupForm.opponentName}
                  onChange={(e) => setSetupForm((prev) => ({ ...prev, opponentName: e.target.value }))}
                  placeholder="Enter player 2 name"
                  className="text-lg"
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start-score" className="text-sm font-medium mb-2 block">
                    Start Score
                  </label>
                  <div className="space-y-2">
                    <Input
                      id="start-score"
                      type="number"
                      value={setupForm.startScore}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          setSetupForm((prev) => ({ ...prev, startScore: 0 }));
                        } else {
                          const num = parseInt(val);
                          if (!isNaN(num) && num > 0) {
                            setSetupForm((prev) => ({ ...prev, startScore: num }));
                          }
                        }
                      }}
                      placeholder="Enter start score"
                      className="text-lg"
                      min="1"
                      disabled={isLoading}
                    />
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSetupForm((prev) => ({ ...prev, startScore: 301 }))}
                        className="px-3 py-1 text-sm rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                        disabled={isLoading}
                      >
                        301
                      </button>
                      <button
                        type="button"
                        onClick={() => setSetupForm((prev) => ({ ...prev, startScore: 501 }))}
                        className="px-3 py-1 text-sm rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                        disabled={isLoading}
                      >
                        501
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="limit-rounds" className="text-sm font-medium mb-2 block">
                    Limit Rounds
                  </label>
                  <Input
                    id="limit-rounds"
                    type="number"
                    value={setupForm.limitRounds || ""}
                    onChange={(e) =>
                      setSetupForm((prev) => ({
                        ...prev,
                        limitRounds: e.target.value ? parseInt(e.target.value) : null,
                      }))
                    }
                    placeholder="Unlimited"
                    className="text-lg"
                    min="1"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                onClick={handleStartScoring}
                disabled={
                  isLoading ||
                  !setupForm.playerName.trim() ||
                  !setupForm.opponentName.trim() ||
                  setupForm.startScore <= 0
                }
                className="w-full"
                size="lg"
                variant="black"
              >
                {isLoading ? "Starting..." : "Start Match"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Scoring Interface */}
      {!isEditingNames && matchState && (
        <>
          {/* Header - Player Names and Leg Scores */}
          <div className="bg-card border-b sticky top-0 z-10 shadow-sm">
            <div className="container mx-auto px-4 py-4">
              {/* Action Buttons */}
              <div className="max-w-4xl mx-auto mb-2 flex gap-2">
                <Button onClick={handleExit} variant="ghost" size="sm" className="gap-2" disabled={isLoading}>
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-sm">Exit</span>
                </Button>
                <Button
                  onClick={() => {
                    // TODO: Implement stats functionality
                  }}
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="text-sm">Stats</span>
                </Button>
              </div>
              <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto">
                <div className="flex-1 text-center">
                  <div className="font-bold text-xl md:text-2xl truncate mb-2">{playerName}</div>
                  <div className="text-6xl md:text-8xl font-bold text-teal-400 leading-none">
                    {rounds[rounds.length - 1]?.player1ToGo || startScore}
                  </div>
                </div>

                <div className="flex flex-col items-center gap-2 px-4 min-w-fit">
                  <div className="text-5xl md:text-6xl font-bold whitespace-nowrap">
                    {playerLegs} : {opponentLegs}
                  </div>
                  <div className="text-sm md:text-base text-muted-foreground">LEGS</div>
                </div>

                <div className="flex-1 text-center">
                  <div className="font-bold text-xl md:text-2xl truncate mb-2">{opponentName}</div>
                  <div className="text-6xl md:text-8xl font-bold text-purple-400 leading-none">
                    {rounds[rounds.length - 1]?.player2ToGo || startScore}
                  </div>
                </div>
              </div>

              {/* Leg Finished Message */}
              {legFinished && (
                <div className="mt-4 text-center">
                  <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500 px-6 py-3 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-bold text-lg">
                      {winner === "player" ? `${playerName} wins!` : `${opponentName} wins!`}
                    </span>
                  </div>

                  {/* Checkout Darts Input */}
                  {showCheckoutInput && (
                    <div className="mt-4 inline-block">
                      <div className="bg-card border rounded-lg p-4 shadow-lg">
                        <div className="block text-sm font-medium mb-3">How many darts to finish the last round?</div>
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
                    <Button onClick={handleStartNewLeg} className="mt-3 ml-3" size="lg">
                      Start New Leg
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Score Table */}
          <div className="flex-1 overflow-auto pb-4">
            <div className="container mx-auto px-4 py-4">
              <div className="max-w-4xl mx-auto space-y-4">
                {/* Table Header */}
                <div className="bg-card border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
                  <div className="sticky top-0 z-10 bg-card border-b">
                    <div className="grid grid-cols-5 gap-2 p-3 bg-muted/50 font-semibold text-sm">
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
                          className={`grid grid-cols-5 gap-2 p-3 ${isActiveRound && !legFinished ? "bg-muted/30" : ""}`}
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
                            className={`text-center p-2 rounded cursor-pointer transition-all ${
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
                              className={`text-lg font-bold ${
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
                          <div className="text-center p-2 rounded bg-muted/20">
                            <div className="text-lg font-bold text-teal-400">
                              {round.player1Scored !== null && round.player1ToGo > 0
                                ? round.player1ToGo
                                : round.player1Scored !== null && round.player1ToGo === 0
                                  ? 0
                                  : "-"}
                            </div>
                          </div>

                          {/* Darts (3, 6, 9, 12...) */}
                          <div className="text-center p-2 flex items-center justify-center">
                            <div className="text-lg font-bold">{round.round * 3}</div>
                          </div>

                          {/* Player 2 To Go */}
                          <div className="text-center p-2 rounded bg-muted/20">
                            <div className="text-lg font-bold text-purple-400">
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
                            className={`text-center p-2 rounded cursor-pointer transition-all ${
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
                              className={`text-lg font-bold ${
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

                {/* Player Names Row at Bottom */}
                <div className="grid grid-cols-5 gap-2 p-3 bg-card border rounded-lg text-sm font-medium">
                  <div className="text-center text-teal-400 col-span-2">{playerName}</div>
                  <div className="text-center"></div>
                  <div className="text-center text-purple-400 col-span-2">{opponentName}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Keyboard */}
          {isMobile && !legFinished && (
            <div className="bg-card border-t sticky bottom-0 z-10 shadow-lg">
              <div className="container mx-auto px-4 py-4">
                <div className="max-w-sm mx-auto grid grid-cols-3 gap-3">
                  {/* Row 1: 1, 2, 3 */}
                  <Button
                    onClick={() => handleNumberInput("1")}
                    variant="outline"
                    size="lg"
                    className="h-16 text-2xl font-bold"
                    disabled={isLoading}
                  >
                    1
                  </Button>
                  <Button
                    onClick={() => handleNumberInput("2")}
                    variant="outline"
                    size="lg"
                    className="h-16 text-2xl font-bold"
                    disabled={isLoading}
                  >
                    2
                  </Button>
                  <Button
                    onClick={() => handleNumberInput("3")}
                    variant="outline"
                    size="lg"
                    className="h-16 text-2xl font-bold"
                    disabled={isLoading}
                  >
                    3
                  </Button>

                  {/* Row 2: 4, 5, 6 */}
                  <Button
                    onClick={() => handleNumberInput("4")}
                    variant="outline"
                    size="lg"
                    className="h-16 text-2xl font-bold"
                    disabled={isLoading}
                  >
                    4
                  </Button>
                  <Button
                    onClick={() => handleNumberInput("5")}
                    variant="outline"
                    size="lg"
                    className="h-16 text-2xl font-bold"
                    disabled={isLoading}
                  >
                    5
                  </Button>
                  <Button
                    onClick={() => handleNumberInput("6")}
                    variant="outline"
                    size="lg"
                    className="h-16 text-2xl font-bold"
                    disabled={isLoading}
                  >
                    6
                  </Button>

                  {/* Row 3: 7, 8, 9 */}
                  <Button
                    onClick={() => handleNumberInput("7")}
                    variant="outline"
                    size="lg"
                    className="h-16 text-2xl font-bold"
                    disabled={isLoading}
                  >
                    7
                  </Button>
                  <Button
                    onClick={() => handleNumberInput("8")}
                    variant="outline"
                    size="lg"
                    className="h-16 text-2xl font-bold"
                    disabled={isLoading}
                  >
                    8
                  </Button>
                  <Button
                    onClick={() => handleNumberInput("9")}
                    variant="outline"
                    size="lg"
                    className="h-16 text-2xl font-bold"
                    disabled={isLoading}
                  >
                    9
                  </Button>

                  {/* Row 4: Backspace, 0, Enter */}
                  <Button onClick={handleBackspace} variant="outline" size="lg" className="h-16" disabled={isLoading}>
                    <Delete className="h-6 w-6" />
                  </Button>
                  <Button
                    onClick={() => handleNumberInput("0")}
                    variant="outline"
                    size="lg"
                    className="h-16 text-2xl font-bold"
                    disabled={isLoading}
                  >
                    0
                  </Button>
                  <Button
                    onClick={hookHandleEnter}
                    variant="default"
                    size="lg"
                    className="h-16 bg-green-600 hover:bg-green-700"
                    disabled={!currentInput || isLoading}
                  >
                    <CheckCircle className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
