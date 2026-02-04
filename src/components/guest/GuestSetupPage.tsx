import { useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStandaloneMatch } from "@/lib/hooks/useStandaloneMatch";
import type { MatchSetup } from "@/lib/models/standalone-match.models";
import { saveMatchSetup } from "@/lib/models/standalone-match.models";

export function GuestSetupPage() {
  const [setup, setSetup] = useState<MatchSetup>({
    playerName: "Player 1",
    opponentName: "Player 2",
    startScore: 501,
    limitRounds: null,
  });
  const [showLoading, setShowLoading] = useState(false);

  const { setupMatch, startMatch, error } = useStandaloneMatch({
    autoSave: true,
    autoAcquireLock: true,
    defaultMatchTypeId: "550e8400-e29b-41d4-a716-446655440501", // UUID for "501" match type (from database)
  });

  const handleStartMatch = async () => {
    if (setup.playerName.trim() && setup.opponentName.trim() && setup.startScore > 0) {
      // Only show loading overlay if operation takes longer than 200ms
      const loadingTimeout = setTimeout(() => setShowLoading(true), 200);

      try {
        // Save setup to localStorage for backward compatibility
        saveMatchSetup(setup);

        // Setup match (creates match state)
        const initialState = await setupMatch(setup);

        // Start match (calls API to create match + acquire lock)
        // Note: In current implementation, this will work offline
        // When API is ready, it will automatically use the API
        await startMatch(initialState);

        // Clear loading timeout and state before navigating
        clearTimeout(loadingTimeout);
        setShowLoading(false);

        // Navigate to score page (localStorage is synchronous, so state is already saved)
        window.location.href = "/score";
      } catch (err) {
        clearTimeout(loadingTimeout);
        setShowLoading(false);
        console.error("Failed to start match:", err);
        // Error is also available in the error state from hook
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] bg-gradient-to-br from-background to-muted/30 flex flex-col">
      {/* Loading Overlay - only shows if operation takes > 200ms */}
      {showLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-card border rounded-lg p-6 shadow-xl">
            <div className="flex flex-col items-center gap-3">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm font-medium">Starting match...</p>
            </div>
          </div>
        </div>
      )}

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
                value={setup.playerName}
                onChange={(e) => setSetup((prev) => ({ ...prev, playerName: e.target.value }))}
                placeholder="Enter player 1 name"
                className="text-lg"
                disabled={showLoading}
              />
            </div>

            <div>
              <label htmlFor="player2-name" className="text-sm font-medium mb-2 block">
                Player 2 Name
              </label>
              <Input
                id="player2-name"
                type="text"
                value={setup.opponentName}
                onChange={(e) => setSetup((prev) => ({ ...prev, opponentName: e.target.value }))}
                placeholder="Enter player 2 name"
                className="text-lg"
                disabled={showLoading}
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
                    value={setup.startScore}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        setSetup((prev) => ({ ...prev, startScore: 0 }));
                      } else {
                        const num = parseInt(val);
                        if (!isNaN(num) && num > 0) {
                          setSetup((prev) => ({ ...prev, startScore: num }));
                        }
                      }
                    }}
                    placeholder="Enter start score"
                    className="text-lg"
                    min="1"
                    disabled={showLoading}
                  />
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSetup((prev) => ({ ...prev, startScore: 301 }))}
                      className="px-3 py-1 text-sm rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={showLoading}
                    >
                      301
                    </button>
                    <button
                      type="button"
                      onClick={() => setSetup((prev) => ({ ...prev, startScore: 501 }))}
                      className="px-3 py-1 text-sm rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={showLoading}
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
                  value={setup.limitRounds || ""}
                  onChange={(e) =>
                    setSetup((prev) => ({
                      ...prev,
                      limitRounds: e.target.value ? parseInt(e.target.value) : null,
                    }))
                  }
                  placeholder="Unlimited"
                  className="text-lg"
                  min="1"
                  disabled={showLoading}
                />
              </div>
            </div>

            <Button
              onClick={handleStartMatch}
              disabled={showLoading || !setup.playerName.trim() || !setup.opponentName.trim() || setup.startScore <= 0}
              className="w-full"
              size="lg"
            >
              {showLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Creating Match...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Match
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
