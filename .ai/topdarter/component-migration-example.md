# Component Migration Example - GuestScoreHomePage

## Before & After Comparison

### BEFORE: Local-Only Implementation

```typescript
// GuestScoreHomePage.tsx - CURRENT VERSION
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function GuestScoreHomePage() {
  // ALL LOCAL STATE
  const [playerName, setPlayerName] = useState("Player 1");
  const [opponentName, setOpponentName] = useState("Player 2");
  const [startScore, setStartScore] = useState(501);
  const [playerLegs, setPlayerLegs] = useState(0);
  const [opponentLegs, setOpponentLegs] = useState(0);
  const [activePlayer, setActivePlayer] = useState<"player" | "opponent">("player");
  const [activeRoundIndex, setActiveRoundIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState("");
  const [rounds, setRounds] = useState<RoundScore[]>([]);
  const [legFinished, setLegFinished] = useState(false);
  const [winner, setWinner] = useState<"player" | "opponent" | null>(null);
  const [isEditingNames, setIsEditingNames] = useState(true);

  // LOCAL SCORE CALCULATION
  const handleEnter = useCallback(() => {
    const score = parseInt(currentInput);
    if (isNaN(score) || score < 0 || score > 180) {
      setCurrentInput("");
      return;
    }

    const activeRound = rounds[activeRoundIndex];
    const currentScore = activePlayer === "player" 
      ? activeRound.player1ToGo 
      : activeRound.player2ToGo;
    
    const newScore = currentScore - score;

    // LOCAL BUST CHECK
    if (newScore < 0 || newScore === 1) {
      updateScore(0, currentScore, false);
      setCurrentInput("");
      return;
    }

    // LOCAL WIN CHECK
    if (newScore === 0) {
      updateScore(score, newScore, false);
      setLegFinished(true);
      setWinner(activePlayer);
      if (activePlayer === "player") {
        setPlayerLegs(prev => prev + 1);
      } else {
        setOpponentLegs(prev => prev + 1);
      }
      setCurrentInput("");
      return;
    }

    // LOCAL UPDATE
    updateScore(score, newScore, false);
    setCurrentInput("");
  }, [currentInput, rounds, activeRoundIndex, activePlayer]);

  // LOCAL SETUP
  const handleStartScoring = () => {
    if (playerName.trim() && opponentName.trim() && startScore > 0) {
      setRounds(initializeRounds(startScore));
      setIsEditingNames(false);
    }
  };

  return (
    <div>
      {/* Setup UI */}
      {isEditingNames && (
        <div>
          <Input value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
          <Input value={opponentName} onChange={(e) => setOpponentName(e.target.value)} />
          <Button onClick={handleStartScoring}>Start Match</Button>
        </div>
      )}

      {/* Scoring UI */}
      {!isEditingNames && (
        <div>
          {/* Player scores, rounds table, keyboard */}
        </div>
      )}
    </div>
  );
}
```

---

### AFTER: API-Integrated Implementation

```typescript
// GuestScoreHomePage.tsx - NEW API-INTEGRATED VERSION
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStandaloneMatch } from "@/lib/hooks/useStandaloneMatch";
import type { MatchSetup } from "@/lib/models/standalone-match.models";

export function GuestScoreHomePage() {
  // SETUP STATE (local until match created)
  const [isEditingNames, setIsEditingNames] = useState(true);
  const [setupForm, setSetupForm] = useState<MatchSetup>({
    playerName: "Player 1",
    opponentName: "Player 2",
    startScore: 501,
    limitRounds: null,
  });

  // USE HOOK FOR ALL MATCH STATE AND OPERATIONS
  const {
    matchState,
    isLoading,
    error,
    setupMatch,
    startMatch,
    enterScore,
    handleNumberInput,
    handleBackspace,
    handleEnter: hookHandleEnter,
    handleCellClick,
    completeLeg,
    startNewLeg,
    exitMatch,
    getCurrentInput,
    isLegFinished,
    getWinner,
  } = useStandaloneMatch({
    autoSave: true,
    autoAcquireLock: true,
    defaultMatchTypeId: process.env.MATCH_TYPE_501_ID,
  });

  // DERIVED STATE (from matchState)
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

  // API-BACKED SETUP
  const handleStartScoring = async () => {
    if (!setupForm.playerName.trim() || !setupForm.opponentName.trim()) {
      return;
    }

    try {
      // Setup match (creates match state)
      await setupMatch(setupForm);
      
      // Start match (calls API to create match + acquire lock)
      await startMatch();
      
      // Hide setup form
      setIsEditingNames(false);
    } catch (err) {
      console.error("Failed to start match:", err);
      // Error is also in hook's error state
    }
  };

  // API-BACKED SCORE ENTRY (handled by hook)
  // const handleEnter = hookHandleEnter; // Already handles API calls

  // API-BACKED LEG COMPLETION
  const handleStartNewLeg = () => {
    startNewLeg(); // Hook handles state reset
    // Same matchId continues for next leg
  };

  // CLEANUP ON EXIT
  const handleExit = async () => {
    await exitMatch(); // Releases lock and cleans up
    setIsEditingNames(true);
  };

  // ERROR DISPLAY
  useEffect(() => {
    if (error) {
      // Show error toast/notification
      console.error("Match error:", error);
    }
  }, [error]);

  return (
    <div>
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
        </div>
      )}

      {/* Setup UI */}
      {isEditingNames && (
        <div>
          <Input 
            value={setupForm.playerName} 
            onChange={(e) => setSetupForm(prev => ({ ...prev, playerName: e.target.value }))}
          />
          <Input 
            value={setupForm.opponentName} 
            onChange={(e) => setSetupForm(prev => ({ ...prev, opponentName: e.target.value }))}
          />
          <Input 
            type="number"
            value={setupForm.startScore} 
            onChange={(e) => setSetupForm(prev => ({ ...prev, startScore: parseInt(e.target.value) }))}
          />
          <Button 
            onClick={handleStartScoring}
            disabled={isLoading || !setupForm.playerName.trim() || !setupForm.opponentName.trim()}
          >
            {isLoading ? "Creating Match..." : "Start Match"}
          </Button>
        </div>
      )}

      {/* Scoring UI */}
      {!isEditingNames && matchState && (
        <div>
          {/* Header with Exit */}
          <Button onClick={handleExit} variant="ghost" size="sm">
            Exit
          </Button>

          {/* Player Scores */}
          <div className="flex items-center justify-between">
            <div>
              <div>{playerName}</div>
              <div className="text-6xl">{rounds[rounds.length - 1]?.player1ToGo || startScore}</div>
            </div>
            <div className="text-5xl">{playerLegs} : {opponentLegs}</div>
            <div>
              <div>{opponentName}</div>
              <div className="text-6xl">{rounds[rounds.length - 1]?.player2ToGo || startScore}</div>
            </div>
          </div>

          {/* Leg Finished */}
          {legFinished && (
            <div>
              <div>{winner === "player" ? playerName : opponentName} wins!</div>
              <Button onClick={handleStartNewLeg}>Start New Leg</Button>
            </div>
          )}

          {/* Rounds Table */}
          <div>
            {rounds.map((round, idx) => (
              <div key={idx}>
                {/* Round display - same as before */}
                <div onClick={() => handleCellClick(idx, "player")}>
                  {round.player1Scored || "-"}
                </div>
                <div onClick={() => handleCellClick(idx, "opponent")}>
                  {round.player2Scored || "-"}
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Keyboard - hook handles the logic */}
          <div>
            <Button onClick={() => handleNumberInput("1")}>1</Button>
            <Button onClick={() => handleNumberInput("2")}>2</Button>
            {/* ... more buttons ... */}
            <Button onClick={handleBackspace}>⌫</Button>
            <Button onClick={hookHandleEnter} disabled={!currentInput}>
              Enter
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Key Changes Summary

### 1. State Management

**Before:**
```typescript
// 15+ useState hooks managing local state
const [playerName, setPlayerName] = useState("Player 1");
const [rounds, setRounds] = useState<RoundScore[]>([]);
// ... many more
```

**After:**
```typescript
// Single hook manages all match state
const { matchState, ... } = useStandaloneMatch();

// Derived values instead of state
const playerName = matchState?.playerName || setupForm.playerName;
const rounds = matchState?.rounds || [];
```

### 2. Score Entry Logic

**Before:**
```typescript
// Manual calculation and state updates
const handleEnter = useCallback(() => {
  const score = parseInt(currentInput);
  const newScore = currentScore - score;
  
  if (newScore === 0) {
    setLegFinished(true);
    setWinner(activePlayer);
    setPlayerLegs(prev => prev + 1);
  }
  
  setRounds(/* complex update logic */);
}, [/* many dependencies */]);
```

**After:**
```typescript
// Hook handles everything including API calls
const { handleEnter } = useStandaloneMatch();

// Or for custom logic:
const handleCustomEntry = async () => {
  await enterScore(score); // API call + state update handled
};
```

### 3. Match Lifecycle

**Before:**
```typescript
// No real match entity, just local state
const handleStartScoring = () => {
  setRounds(initializeRounds(startScore));
  setIsEditingNames(false);
};
```

**After:**
```typescript
// Creates actual match in database
const handleStartScoring = async () => {
  await setupMatch(setupForm);  // Prepare match data
  await startMatch();           // POST /matches + acquire lock
  setIsEditingNames(false);
};

// On exit, properly cleanup
const handleExit = async () => {
  await exitMatch(); // DELETE /lock, cleanup state
};
```

### 4. Error Handling

**Before:**
```typescript
// No error handling (local operations can't fail)
setRounds(newRounds);
```

**After:**
```typescript
// Hook provides error state
const { error } = useStandaloneMatch();

useEffect(() => {
  if (error) {
    toast.error(error); // Show to user
  }
}, [error]);

// Or handle in specific operations
try {
  await enterScore(score);
} catch (err) {
  // Handle specific error
}
```

### 5. Loading States

**Before:**
```typescript
// No loading states (instant local updates)
```

**After:**
```typescript
// Hook provides loading state
const { isLoading } = useStandaloneMatch();

// Show loading overlay during API calls
{isLoading && <LoadingSpinner />}

// Disable buttons during operations
<Button disabled={isLoading}>Start Match</Button>
```

---

## Migration Steps for GuestScoreHomePage

### Step 1: Add Hook Import
```typescript
import { useStandaloneMatch } from "@/lib/hooks/useStandaloneMatch";
```

### Step 2: Replace State Variables
```typescript
// Remove:
// const [playerName, setPlayerName] = useState("Player 1");
// const [rounds, setRounds] = useState<RoundScore[]>([]);
// ... etc

// Add:
const { matchState, ... } = useStandaloneMatch();
const rounds = matchState?.rounds || [];
```

### Step 3: Update Setup Handler
```typescript
// Replace handleStartScoring with API-backed version
const handleStartScoring = async () => {
  await setupMatch(setupForm);
  await startMatch();
  setIsEditingNames(false);
};
```

### Step 4: Update Score Entry
```typescript
// Replace local handleEnter with hook version
const { handleEnter } = useStandaloneMatch();
// Or use enterScore() directly
```

### Step 5: Add Cleanup
```typescript
// Add exit handler
const handleExit = async () => {
  await exitMatch();
  setIsEditingNames(true);
};
```

### Step 6: Add Error/Loading UI
```typescript
const { error, isLoading } = useStandaloneMatch();

// Show loading spinner
{isLoading && <LoadingOverlay />}

// Show error message
{error && <ErrorMessage>{error}</ErrorMessage>}
```

### Step 7: Test
- [ ] Setup match creates API match
- [ ] Scores are recorded to API
- [ ] Leg completion updates API
- [ ] Lock is acquired/released
- [ ] Errors are handled gracefully
- [ ] Offline mode works (optional)

---

## Side-by-Side Comparison: Key Functions

### Setup Match

| Aspect | Before (Local) | After (API) |
|--------|----------------|-------------|
| **Function** | `handleStartScoring()` | `handleStartScoring()` |
| **Operations** | Initialize rounds array | Setup + startMatch + API calls |
| **Time** | Instant | ~500ms (network) |
| **Can Fail** | No | Yes (network, validation) |
| **Persisted** | No (lost on refresh) | Yes (in database) |
| **Multi-device** | No | Yes (with lock management) |

### Score Entry

| Aspect | Before (Local) | After (API) |
|--------|----------------|-------------|
| **Function** | `handleEnter()` | `hookHandleEnter()` or `enterScore()` |
| **Validation** | Local only | Local + API validation |
| **Storage** | State array | Database throws |
| **Time** | Instant | ~100-200ms |
| **Rollback** | N/A | On API error |
| **Statistics** | Manual calculation | Auto-calculated by DB |

### Leg Completion

| Aspect | Before (Local) | After (API) |
|--------|----------------|-------------|
| **Detection** | `newScore === 0` | API `meta.leg_completed` |
| **Leg Counter** | Local state increment | Fetch from API |
| **Statistics** | Not tracked | Automatically calculated |
| **History** | Lost on refresh | Persisted in DB |
| **Winner** | Local state | `winner_player_number` from API |

---

## Testing Checklist

### Functional Tests
- [ ] Match creation from setup form
- [ ] Score entry syncs to API
- [ ] Bust detection works correctly
- [ ] Checkout (win) detection works
- [ ] Leg counter increments on leg completion
- [ ] New leg starts correctly
- [ ] Lock is acquired on match start
- [ ] Lock is released on exit
- [ ] Multiple legs in same match
- [ ] Score editing and recalculation

### Error Handling Tests
- [ ] Network error during match creation
- [ ] Network error during score entry
- [ ] Lock conflict (another device has lock)
- [ ] Lock expired during match
- [ ] Invalid score validation
- [ ] API validation errors displayed
- [ ] Graceful fallback to offline mode

### UI/UX Tests
- [ ] Loading spinner during API calls
- [ ] Error messages displayed clearly
- [ ] Buttons disabled during loading
- [ ] Optimistic updates feel instant
- [ ] Error recovery flows work
- [ ] Keyboard shortcuts still work
- [ ] Mobile keyboard functions correctly

### Performance Tests
- [ ] Score entry latency < 200ms
- [ ] Match creation < 1s
- [ ] No UI freezing during API calls
- [ ] Optimistic updates are instant
- [ ] State updates don't cause unnecessary re-renders

---

## Rollback Plan

If API integration causes issues, the hybrid approach allows rollback:

```typescript
const enterScore = async (score: number) => {
  // Always update locally first (instant feedback)
  const updatedRounds = updateLocalRounds(score);
  setRounds(updatedRounds);
  
  // Try API sync (non-blocking)
  if (USE_API && matchId) {
    try {
      await recordThrow(matchId, command, sessionId);
    } catch (error) {
      console.warn("API sync failed, continuing offline");
      // Local state is already updated, continue playing
    }
  }
};
```

This ensures:
1. Existing functionality always works
2. API is an enhancement, not a requirement
3. Graceful degradation if API fails
4. Easy to disable API integration via feature flag

---

## Summary

**Lines Changed:**
- **Before**: ~880 lines
- **After**: ~400 lines (55% reduction)

**State Hooks:**
- **Before**: 15+ useState hooks
- **After**: 2 useState + 1 custom hook

**Complexity:**
- **Before**: All logic in component
- **After**: Logic in hook, component just renders

**Benefits:**
- ✅ Persistent matches across sessions
- ✅ Multi-device support with locks
- ✅ Automatic statistics calculation
- ✅ Match history and replay
- ✅ Cleaner, more maintainable code
- ✅ Reusable match logic
- ✅ Better error handling
- ✅ Loading states for better UX

