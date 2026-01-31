# View to API Mapping - TopDarter Standalone Matches

## Overview

This document provides a detailed mapping between the current guest scoring views and the TopDarter standalone matches API endpoints. Each UI interaction is mapped to specific API calls, showing the data flow and required transformations.

---

## 1. GuestSetupPage Component

### Current Behavior (Local State)

```typescript
// Current: Stores setup in localStorage only
const handleStartMatch = () => {
  const matchSetup = {
    playerName: playerName.trim(),
    opponentName: opponentName.trim(),
    startScore,
    limitRounds,
  };
  localStorage.setItem("dartMatchSetup", JSON.stringify(matchSetup));
  window.location.href = "/score";
};
```

### API Integration Mapping

| UI Element | Current State | API Endpoint | Data Flow |
|-----------|---------------|--------------|-----------|
| **Player 1 Name Input** | `playerName` state | → Part of POST /matches | `{ guest_name: playerName }` |
| **Player 2 Name Input** | `opponentName` state | → Part of POST /matches | `{ guest_name: opponentName }` |
| **Start Score Input** | `startScore` state | → Part of POST /matches | `start_score: 501/301/etc` |
| **Limit Rounds** | `limitRounds` state | → Not used in API | UI-only feature |
| **Start Match Button** | Navigate to /score | → API call sequence | See flow below |

### API Call Sequence

```typescript
// NEW: API-backed flow
const handleStartMatch = async () => {
  // 1. Build match setup
  const setup: MatchSetup = {
    playerName: playerName.trim(),
    opponentName: opponentName.trim(),
    startScore,
    limitRounds,
    formatType: "unlimited",
    checkoutRule: "double_out",
  };

  // 2. Get match type ID
  const matchTypes = await getMatchTypes(true);
  const matchType501 = matchTypes.find(t => t.default_start_score === startScore);

  // 3. Create match command
  const command = buildCreateMatchCommand(setup, matchType501.id);

  // 4. Create match + acquire lock + start
  const { match, lock } = await startNewMatch(
    command,
    sessionId,
    buildAcquireLockCommand(true)
  );

  // 5. Save match ID and navigate
  localStorage.setItem("currentMatchId", match.id);
  window.location.href = "/score";
};
```

**API Endpoints Used:**
1. `GET /api/v1/match-types?is_active=true` - Get available match types
2. `POST /api/v1/matches` - Create the match
3. `POST /api/v1/matches/:id/lock` - Acquire scoring lock
4. `PATCH /api/v1/matches/:id` - Update status to "in_progress"

**Data Transformations:**
- UI `playerName` → API `player1.guest_name`
- UI `opponentName` → API `player2.guest_name`
- UI `startScore` → API `start_score`

---

## 2. GuestScoreHomePage Component

### Current Behavior (Local State)

**State Variables:**
```typescript
const [playerName, setPlayerName] = useState("Player 1");
const [opponentName, setOpponentName] = useState("Player 2");
const [startScore, setStartScore] = useState(501);
const [limitRounds, setLimitRounds] = useState<number | null>(null);
const [playerLegs, setPlayerLegs] = useState(0);
const [opponentLegs, setOpponentLegs] = useState(0);
const [activePlayer, setActivePlayer] = useState<"player" | "opponent">("player");
const [activeRoundIndex, setActiveRoundIndex] = useState(0);
const [currentInput, setCurrentInput] = useState("");
const [rounds, setRounds] = useState<RoundScore[]>([]);
const [legFinished, setLegFinished] = useState(false);
const [winner, setWinner] = useState<"player" | "opponent" | null>(null);
```

### API Integration Mapping

#### Setup Phase (isEditingNames = true)

| UI Element | Current | API Equivalent | Notes |
|-----------|---------|----------------|-------|
| Player name inputs | Local state | Same as GuestSetupPage | Pre-match setup |
| Start score buttons | Local state | Match type selection | GET /match-types |
| "Start Match" button | Initialize rounds | Create match + lock | POST /matches, POST /lock |

#### Scoring Phase (isEditingNames = false)

| UI Element | Current State | API Endpoint | Data Mapping |
|-----------|---------------|--------------|--------------|
| **Player 1 Score Display** | `rounds[lastRound].player1ToGo` | GET /matches/:id | `start_score - total_scored` |
| **Player 2 Score Display** | `rounds[lastRound].player2ToGo` | GET /matches/:id | `start_score - total_scored` |
| **Legs Display** | `playerLegs : opponentLegs` | GET /matches/:id | `player1_legs_won : player2_legs_won` |
| **Round "Scored" Cells** | `rounds[i].player1Scored` | GET /matches/:id/legs | Sum of 3 throws per round |
| **Round "To Go" Cells** | `rounds[i].player1ToGo` | Calculated from throws | `start_score - cumulative_score` |
| **Mobile Keyboard** | Updates `currentInput` | Same | Local state only |
| **Enter/Submit Score** | Updates rounds locally | POST /matches/:id/legs/throws | See below |

### Score Entry API Flow

```typescript
// CURRENT: Local calculation
const handleEnter = useCallback(() => {
  const score = parseInt(currentInput);
  const currentScore = activeRound.player1ToGo;
  const newScore = currentScore - score;
  
  // Check bust, win, etc. locally
  if (newScore === 0) {
    // Winner!
    setLegFinished(true);
    setWinner(activePlayer);
  }
  // Update rounds array...
}, [currentInput, rounds, activeRoundIndex]);
```

```typescript
// NEW: API-backed with local validation
const handleEnter = async () => {
  const score = parseInt(currentInput);
  
  // Local validation first (fast feedback)
  if (!isValidThrowScore(score)) {
    setError("Invalid score");
    return;
  }
  
  const activeRound = rounds[activeRoundIndex];
  const currentScore = activePlayer === "player" 
    ? activeRound.player1ToGo 
    : activeRound.player2ToGo;
  
  const newScore = currentScore - score;
  const bustOccurred = isBust(currentScore, score);
  const winningThrow = isWinningThrow(currentScore, score);
  
  // Build throw command
  const command: CreateThrowCommand = {
    leg_number: currentLeg,
    set_number: 1,
    player_number: activePlayer === "player" ? 1 : 2,
    throw_number: 3, // Simplified: 3 darts per round
    round_number: activeRound.round,
    score: bustOccurred ? 0 : score,
    remaining_score: bustOccurred ? currentScore : newScore,
    is_checkout_attempt: isCheckoutAttempt(currentScore),
  };
  
  try {
    // Send to API
    const { throw: throwDto, meta } = await recordThrow(
      matchId,
      command,
      sessionId
    );
    
    // Update UI based on response
    const updatedRounds = mapThrowDtoToRoundScore(throwDto, rounds);
    setRounds(updatedRounds);
    
    // Check if leg completed
    if (meta.leg_completed) {
      setLegFinished(true);
      setWinner(activePlayer);
      
      // Fetch updated match state
      const match = await getMatch(matchId, sessionId, ["stats"]);
      setPlayerLegs(match.player1_legs_won);
      setOpponentLegs(match.player2_legs_won);
    }
    
    setCurrentInput("");
  } catch (error) {
    // Handle API errors
    console.error("Error recording throw:", error);
  }
};
```

**API Endpoints Used:**
1. `POST /api/v1/matches/:id/legs/throws` - Record each throw
2. `GET /api/v1/matches/:id?include=stats` - Get updated match state after leg completion

**Data Flow:**
```
User Input (60) 
  ↓
Local Validation (0-180, bust check)
  ↓
Build CreateThrowCommand
  ↓
POST /matches/:id/legs/throws
  ↓
Receive MatchLegThrowDTO + metadata
  ↓
Update rounds array
  ↓
Update UI display
```

### Leg Completion Flow

| UI Interaction | Current | API Flow |
|----------------|---------|----------|
| Score reaches 0 | `setLegFinished(true)` | API triggers `leg_completed: true` in meta |
| Winner declared | `setWinner(activePlayer)` | API returns `winner_player_number` |
| Checkout darts prompt | Local state | Local only (calculate from rounds) |
| Leg counter update | Increment local state | GET /matches/:id → `player1_legs_won`, `player2_legs_won` |
| "Start New Leg" button | Reset rounds array | Create new rounds, continue same match |

```typescript
// NEW: Start new leg
const handleStartNewLeg = () => {
  // Reset local state for new leg
  setRounds(initializeRounds(startScore));
  setActiveRoundIndex(0);
  setActivePlayer("player");
  setLegFinished(false);
  setWinner(null);
  setCheckoutDarts(null);
  
  // Match continues with same matchId
  // Next throw will be leg_number: currentLeg + 1
};
```

### Statistics Display (Future)

| UI Element | Current | API Endpoint |
|-----------|---------|--------------|
| Stats button | Not implemented | GET /matches/:id/stats |
| Average score | Calculate locally | From API `average_score` |
| Checkout % | Calculate locally | From API `successful_checkouts / checkout_attempts` |
| High score | Track locally | From API `scores_100_plus`, `scores_180` |

---

## 3. GuestScoreBoard Component

### Current Behavior

Very similar to GuestScoreHomePage but loads setup from localStorage:

```typescript
// Load match setup from localStorage
useEffect(() => {
  const setupData = localStorage.getItem("dartMatchSetup");
  if (!setupData) {
    window.location.href = "/";
    return;
  }
  const setup = JSON.parse(setupData);
  setPlayerName(setup.playerName);
  // ... initialize state
}, []);
```

### API Integration Mapping

| Component Lifecycle | Current | API Flow |
|---------------------|---------|----------|
| **Mount** | Load from localStorage | GET /matches/:id?include=stats,legs,lock |
| **Resume existing match** | Load saved state | GET /matches/:id + resume lock |
| **Score entry** | Same as GuestScoreHomePage | Same API flow |
| **Unmount/Exit** | Clear localStorage | DELETE /matches/:id/lock |

```typescript
// NEW: Load match from API
useEffect(() => {
  const loadMatch = async () => {
    const matchId = localStorage.getItem("currentMatchId");
    if (!matchId) {
      window.location.href = "/";
      return;
    }
    
    try {
      // Get match with all data
      const match = await getMatch(matchId, sessionId, ["stats", "legs", "lock"]);
      
      // Check if we need to acquire lock
      if (match.lock && !match.lock.is_current_session) {
        // Another session has the lock
        setError("Match is locked by another device");
        return;
      }
      
      if (!match.lock) {
        // Acquire lock
        await acquireMatchLock(
          matchId,
          buildAcquireLockCommand(true),
          sessionId
        );
      }
      
      // Reconstruct rounds from throws
      const rounds = reconstructRoundsFromThrows(match.legs);
      
      // Set state
      setPlayerName(match.player1_guest_name || "Player 1");
      setOpponentName(match.player2_guest_name || "Player 2");
      setStartScore(match.start_score);
      setPlayerLegs(match.player1_legs_won);
      setOpponentLegs(match.player2_legs_won);
      setRounds(rounds);
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading match:", error);
      window.location.href = "/";
    }
  };
  
  loadMatch();
}, []);
```

**Helper Function Needed:**
```typescript
function reconstructRoundsFromThrows(throws: MatchLegThrowDTO[]): RoundScore[] {
  // Group throws by round_number
  // Calculate scored and toGo for each round
  // Return RoundScore[]
}
```

---

## 4. GuestScorePage Component

### Current Behavior

Wrapper component that provides theme and i18n context:

```typescript
export function GuestScorePage() {
  const [lang, setLang] = useState<Language>("en");
  
  return (
    <ThemeProvider>
      <I18nProvider lang={lang}>
        <GuestScoreBoard />
      </I18nProvider>
    </ThemeProvider>
  );
}
```

### API Integration

**No API changes needed** - This is a pure wrapper component. However, we could add:

```typescript
// Optional: Add error boundary for API errors
export function GuestScorePage() {
  return (
    <ErrorBoundary fallback={<ErrorScreen />}>
      <ThemeProvider>
        <I18nProvider lang={lang}>
          <GuestScoreBoard />
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
```

---

## 5. Complete API Mapping Summary

### Match Lifecycle Mapping

| User Journey | UI Components | API Endpoints Called | Data Flow |
|--------------|---------------|---------------------|-----------|
| **1. Setup Match** | GuestSetupPage | GET /match-types<br>POST /matches<br>POST /matches/:id/lock<br>PATCH /matches/:id | Setup → Match Created → Lock Acquired → Status: in_progress |
| **2. Start Scoring** | GuestScoreBoard mount | GET /matches/:id?include=stats,legs,lock | Load/Resume Match |
| **3. Enter Score** | Keyboard → handleEnter | POST /matches/:id/legs/throws | Throw Recorded → Rounds Updated |
| **4. Complete Leg** | Score reaches 0 | POST /matches/:id/legs/throws (winning throw)<br>GET /matches/:id?include=stats | Leg Completed → Stats Updated |
| **5. Start New Leg** | "Start New Leg" button | None (same match continues) | Reset local rounds, increment leg_number |
| **6. View Stats** | "Stats" button (future) | GET /matches/:id/stats | Display Statistics |
| **7. Exit Match** | "Exit" button | DELETE /matches/:id/lock | Release Lock |

### Data Synchronization Points

| Event | Local State Update | API Call | Sync Direction |
|-------|-------------------|----------|----------------|
| **Score Entry** | Update rounds array | POST throws | Local → API |
| **Leg Complete** | Increment leg counter | GET match | API → Local |
| **Match Resume** | Load full state | GET match + legs | API → Local |
| **Edit Score** | Recalculate rounds | PATCH throw + GET legs | Bidirectional |
| **Undo Score** | Remove from rounds | DELETE throw | Local → API |

---

## 6. Component State Mapping

### State That Moves to API

| Local State Variable | API Source | How to Sync |
|---------------------|------------|-------------|
| `matchId` | From `match.id` after creation | One-time on create |
| `playerName` | `match.player1_guest_name` | One-time on create |
| `opponentName` | `match.player2_guest_name` | One-time on create |
| `startScore` | `match.start_score` | One-time on create |
| `playerLegs` | `match.player1_legs_won` | Fetch after each leg |
| `opponentLegs` | `match.player2_legs_won` | Fetch after each leg |
| `legFinished` | `meta.leg_completed` from throw | After each throw |
| `winner` | `meta.winner_player_number` | After winning throw |
| `rounds` (partial) | Derived from `match_legs` | Reconstruct from throws |

### State That Stays Local

| Local State Variable | Why Local | Notes |
|---------------------|-----------|-------|
| `currentInput` | UI input buffer | Transient state |
| `activeRoundIndex` | UI cursor position | Not in API |
| `activePlayer` | UI active cell | Derived from rounds |
| `limitRounds` | UI-only feature | Not in MVP API |
| `checkoutDarts` | UI input | Could be calculated |
| `isMobile` | Device detection | Client-only |
| `showCheckoutInput` | UI modal state | Transient |

### State That Becomes Derived

| Current Local State | New Source | Derivation |
|--------------------|------------|------------|
| `legFinished` | Calculated from throws | Last throw has `remaining_score === 0` |
| `winner` | From API | Last throw's `winner_player_number` |
| Current round scores | Sum of throws | Group throws by round, sum scores |

---

## 7. API Call Patterns

### Pattern 1: Optimistic Update with Rollback

```typescript
// For score entry - show immediately, rollback on error
const enterScore = async (score: number) => {
  // Optimistic update
  const optimisticRounds = updateRoundsLocally(score);
  setRounds(optimisticRounds);
  
  try {
    // Send to API
    const { throw: throwDto } = await recordThrow(matchId, command, sessionId);
    
    // Confirm with API response
    const confirmedRounds = mapThrowDtoToRoundScore(throwDto, rounds);
    setRounds(confirmedRounds);
  } catch (error) {
    // Rollback on error
    setRounds(previousRounds);
    setError("Failed to record score");
  }
};
```

### Pattern 2: API-First with Loading State

```typescript
// For leg completion - wait for API
const completeCheck = async (score: number) => {
  setIsLoading(true);
  
  try {
    const { throw: throwDto, meta } = await recordThrow(matchId, command, sessionId);
    
    if (meta.leg_completed) {
      // Fetch full match state
      const match = await getMatch(matchId, sessionId, ["stats"]);
      
      // Update all state from API
      setPlayerLegs(match.player1_legs_won);
      setOpponentLegs(match.player2_legs_won);
      setLegFinished(true);
    }
  } catch (error) {
    setError("Failed to complete leg");
  } finally {
    setIsLoading(false);
  }
};
```

### Pattern 3: Periodic Sync

```typescript
// Optional: Sync state periodically for multi-device
useEffect(() => {
  const interval = setInterval(async () => {
    if (matchId && !legFinished) {
      const match = await getMatch(matchId, sessionId);
      // Update state if changed
    }
  }, 5000); // Every 5 seconds
  
  return () => clearInterval(interval);
}, [matchId, legFinished]);
```

---

## 8. Implementation Checklist

### GuestSetupPage
- [ ] Replace localStorage-only with API call
- [ ] Add `getMatchTypes()` to load match types
- [ ] Use `startNewMatch()` instead of just saving setup
- [ ] Handle API errors (network, validation)
- [ ] Show loading state during match creation
- [ ] Store `matchId` in localStorage for resume

### GuestScoreHomePage
- [ ] Replace all local state with `useStandaloneMatch` hook
- [ ] Update `handleEnter` to call `recordThrow` API
- [ ] Update leg completion to fetch match state
- [ ] Add lock management (acquire on mount, release on exit)
- [ ] Handle API errors gracefully
- [ ] Add offline mode detection
- [ ] Implement score edit with API sync

### GuestScoreBoard
- [ ] Add match loading on mount
- [ ] Reconstruct rounds from API throws
- [ ] Check and acquire lock if needed
- [ ] Same scoring updates as GuestScoreHomePage
- [ ] Add exit handler to release lock
- [ ] Handle stale/expired locks

### GuestScorePage
- [ ] Add error boundary
- [ ] Add network status detection
- [ ] Show offline indicator if needed

---

## 9. Backward Compatibility

To support gradual migration, the system can work in both modes:

```typescript
// Hybrid approach
const enterScore = async (score: number) => {
  // Always update local state (instant feedback)
  updateLocalState(score);
  
  // Try to sync with API if online and match exists
  if (matchId && navigator.onLine) {
    try {
      await recordThrow(matchId, command, sessionId);
    } catch (error) {
      console.warn("API sync failed, continuing offline:", error);
      // Continue with local-only mode
    }
  }
};
```

This allows:
1. Existing functionality to work offline
2. Gradual migration component-by-component
3. Fallback if API is unavailable
4. Testing without backend

---

## Summary

**Total API Integrations Required:**
- **3 components** need updates (GuestSetupPage, GuestScoreHomePage, GuestScoreBoard)
- **8 API endpoints** will be used regularly
- **5 main data flows** (setup, score entry, leg complete, resume, exit)
- **2 state categories** (API-backed, local-only)

**Migration Priority:**
1. ✅ **Types & Models** (Done)
2. ✅ **Services** (Done)
3. ✅ **Hook** (Done)
4. 🔄 **GuestSetupPage** (Next)
5. 🔄 **GuestScoreHomePage** (Next)
6. 🔄 **GuestScoreBoard** (Next)

All mappings are complete and ready for implementation!

