# TopDarter Standalone Matches - Integration Guide

## Overview

This guide explains how to integrate the guest scoring components with the TopDarter standalone matches API.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     UI Components                            │
│  (GuestScoreHomePage, GuestScoreBoard, GuestSetupPage)     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Custom Hook (useStandaloneMatch)                │
│  - State management                                          │
│  - Business logic                                            │
│  - Error handling                                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           Models & Mappers                                   │
│  (standalone-match.models.ts)                               │
│  - Data transformation                                       │
│  - Validation helpers                                        │
│  - LocalStorage utilities                                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           API Service Layer                                  │
│  (standalone-match.service.ts)                              │
│  - HTTP requests                                             │
│  - Error handling                                            │
│  - Response parsing                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              TopDarter REST API                              │
│  /api/v1/matches, /api/v1/match-types, etc.                │
└─────────────────────────────────────────────────────────────┘
```

## Files Created

### 1. Type Definitions

**`src/topdarter.types.ts`** (486 lines)
- All TopDarter API types
- DTOs, Command Models, Response types
- Enums and constants

### 2. Domain Models

**`src/lib/models/standalone-match.models.ts`** (700+ lines)
- UI state models (`RoundScore`, `MatchState`, `MatchSetup`)
- API command builders
- Response mappers (API → UI)
- Helper functions
- LocalStorage utilities
- Calculation functions

### 3. API Service Layer

**`src/lib/services/standalone-match.service.ts`** (600+ lines)
- All API endpoints wrapped as functions
- Error handling with `ApiError` class
- High-level composite operations
- Session management

### 4. React Hook

**`src/lib/hooks/useStandaloneMatch.ts`** (500+ lines)
- Complete state management
- Score entry logic
- Match lifecycle control
- Statistics tracking
- UI helper functions

## Key Models

### UI State Models

```typescript
// Match Setup (from GuestSetupPage)
interface MatchSetup {
  playerName: string;
  opponentName: string;
  startScore: number;
  limitRounds: number | null;
  formatType?: FormatType;
  legsCount?: number;
  checkoutRule?: CheckoutRule;
}

// Round Score (used in scoreboard display)
interface RoundScore {
  round: number;
  player1Scored: number | null;
  player1ToGo: number;
  player2Scored: number | null;
  player2ToGo: number;
}

// Complete Match State
interface MatchState {
  matchId?: string;
  playerName: string;
  opponentName: string;
  startScore: number;
  limitRounds: number | null;
  rounds: RoundScore[];
  activeRoundIndex: number;
  activePlayer: "player" | "opponent";
  currentInput: string;
  playerLegs: number;
  opponentLegs: number;
  legFinished: boolean;
  winner: "player" | "opponent" | null;
  checkoutDarts: number | null;
  matchStatus: MatchStatus;
  sessionId?: string;
  hasLock: boolean;
}
```

## Integration Steps

### Step 1: Update GuestScoreHomePage Component

Replace the existing state management with the hook:

```typescript
import { useStandaloneMatch } from "@/lib/hooks/useStandaloneMatch";

export function GuestScoreHomePage() {
  const {
    matchState,
    isLoading,
    error,
    setupMatch,
    startMatch,
    enterScore,
    handleNumberInput,
    handleBackspace,
    handleEnter,
    handleCellClick,
    completeLeg,
    startNewLeg,
    exitMatch,
  } = useStandaloneMatch({
    autoSave: true,
    autoAcquireLock: true,
    defaultMatchTypeId: "501-uuid", // Get from API
  });

  // Use matchState instead of local state
  const playerName = matchState?.playerName || "Player 1";
  const opponentName = matchState?.opponentName || "Player 2";
  const rounds = matchState?.rounds || [];
  const legFinished = matchState?.legFinished || false;
  
  // ... rest of component
}
```

### Step 2: Update GuestSetupPage Component

```typescript
import { useStandaloneMatch } from "@/lib/hooks/useStandaloneMatch";
import type { MatchSetup } from "@/lib/models/standalone-match.models";

export function GuestSetupPage() {
  const { setupMatch, startMatch, isLoading, error } = useStandaloneMatch();
  
  const [setup, setSetup] = useState<MatchSetup>({
    playerName: "Player 1",
    opponentName: "Player 2",
    startScore: 501,
    limitRounds: null,
  });

  const handleStartMatch = async () => {
    await setupMatch(setup);
    await startMatch();
    // Navigate to score page
    window.location.href = "/score";
  };
  
  // ... rest of component
}
```

### Step 3: Update Score Entry Logic

Replace the existing `handleEnter` function:

```typescript
// Old way (local state)
const handleEnter = useCallback(() => {
  const score = parseInt(currentInput);
  // ... complex local logic
}, [currentInput, rounds, activeRoundIndex]);

// New way (with hook)
const { handleEnter } = useStandaloneMatch();

// Or use enterScore directly for more control
const handleScoreEntry = async () => {
  const score = parseInt(currentInput);
  await enterScore(score);
  setCurrentInput("");
};
```

## API Call Flow Example

### Creating and Starting a Match

```typescript
// 1. User fills setup form
const setup: MatchSetup = {
  playerName: "John",
  opponentName: "Jane",
  startScore: 501,
  limitRounds: null,
};

// 2. Hook creates match via API
await setupMatch(setup);
// → Calls buildCreateMatchCommand(setup)
// → Calls createMatch(command, sessionId)
// → POST /api/v1/matches

// 3. Hook starts match and acquires lock
await startMatch();
// → Calls startNewMatch(command, sessionId, lockCommand)
//   → POST /api/v1/matches (create)
//   → POST /api/v1/matches/{id}/lock (acquire lock)
//   → PATCH /api/v1/matches/{id} (set status to "in_progress")
```

### Recording a Score

```typescript
// 1. User enters score "60" and presses enter
await enterScore(60);

// 2. Hook processes score
// → Calculates remaining score (441)
// → Checks for bust (false)
// → Checks for win (false)
// → Builds throw command

// 3. Sends to API
// → Calls buildCreateThrowCommand(throwEntry)
// → Calls recordThrow(matchId, command, sessionId)
// → POST /api/v1/matches/{id}/legs/throws

// 4. Updates UI state
// → Maps response with mapThrowDtoToRoundScore()
// → Updates rounds array
// → Moves to next player/round
```

## Helper Functions Available

### From Models

```typescript
// Validation
isValidThrowScore(score: number): boolean
isBust(currentScore: number, thrownScore: number): boolean
isWinningThrow(currentScore: number, thrownScore: number): boolean
isCheckoutAttempt(remainingScore: number): boolean

// Calculations
calculateAverage(rounds: RoundScore[], player): number
calculateTotalDarts(completedRounds: number, dartsInLastRound: number): number
recalculateToGoScores(rounds, fromIndex, player, startScore): RoundScore[]
getCurrentDisplayScore(rounds, player, startScore): number

// Navigation
findCurrentActiveCell(rounds): { roundIndex, player } | null
isEditingPreviousRound(rounds, currentRoundIndex): boolean

// Mapping
mapMatchDtoToState(match): Partial<MatchState>
mapThrowDtoToRoundScore(throwDto, currentRounds): RoundScore[]
mapStatsToPlayerMatchStats(stats): PlayerMatchStats

// Builders
buildCreateMatchCommand(setup): CreateMatchCommand
buildCreateThrowCommand(throwEntry): CreateThrowCommand
buildAcquireLockCommand(): AcquireLockCommand

// Session management
getOrCreateSessionId(): string
saveMatchState(state): void
loadMatchState(): MatchState | null
```

### From Service

```typescript
// Match operations
createMatch(command, sessionId): Promise<StandaloneMatchDTO>
getMatch(matchId, sessionId, include?): Promise<StandaloneMatchWithStatsDTO>
updateMatch(matchId, command, sessionId): Promise<Partial<StandaloneMatchDTO>>
listMatches(query, sessionId?): Promise<{ matches, meta }>

// Lock operations
acquireMatchLock(matchId, command, sessionId): Promise<MatchLockDTO>
releaseMatchLock(matchId, sessionId): Promise<void>
getMatchLockStatus(matchId): Promise<LockStatusDTO>

// Score operations
recordThrow(matchId, command, sessionId): Promise<{ throw, meta }>
getMatchLegs(matchId, query?, sessionId?): Promise<{ throws, meta }>
updateThrow(matchId, throwId, command, sessionId): Promise<{ throw, meta }>
recordThrowsBatch(matchId, throws, sessionId): Promise<{ createdCount, throws, meta }>

// Statistics
getMatchStats(matchId, playerNumber?, sessionId?): Promise<StandaloneMatchStatsDTO[]>

// High-level operations
startNewMatch(command, sessionId, lockCommand): Promise<{ match, lock }>
endMatch(matchId, sessionId): Promise<StandaloneMatchWithStatsDTO>
cancelMatch(matchId, sessionId): Promise<void>
pauseMatch(matchId, sessionId): Promise<StandaloneMatchDTO>
resumeMatch(matchId, sessionId, lockCommand): Promise<{ match, lock }>
```

## Error Handling

All API errors are wrapped in the `ApiError` class:

```typescript
try {
  await recordThrow(matchId, command, sessionId);
} catch (error) {
  if (error instanceof ApiError) {
    console.error("API Error:", error.code, error.message);
    // error.code: "VALIDATION_ERROR", "LOCK_REQUIRED", etc.
    // error.status: HTTP status code
    // error.details: Additional error information
  }
}
```

## Session Management

The system uses UUID v4 session IDs stored in localStorage:

```typescript
// Automatically handled by the hook
const sessionId = getOrCreateSessionId();

// Session ID is included in all API requests via X-Session-ID header
// Used for lock management and guest player tracking
```

## Testing Checklist

- [ ] Match creation with guest players
- [ ] Session ID generation and persistence
- [ ] Lock acquisition and auto-extension
- [ ] Score entry (valid scores)
- [ ] Bust detection (score > remaining or remaining = 1)
- [ ] Checkout detection (remaining = 0)
- [ ] Leg completion and statistics
- [ ] Starting new leg
- [ ] Multi-leg match tracking
- [ ] Round recalculation when editing scores
- [ ] Mobile keyboard input
- [ ] Desktop keyboard shortcuts
- [ ] Match pause/resume
- [ ] Match cancellation
- [ ] Lock conflict handling
- [ ] Offline mode (localStorage fallback)
- [ ] Error recovery

## Next Steps

1. **Implement API endpoints** in `/src/pages/api/v1/`
2. **Create database migrations** for topdarter schema
3. **Update components** to use the hook
4. **Test integration** with real API
5. **Add real-time updates** (optional, using Supabase Realtime)
6. **Implement match replay** functionality
7. **Add advanced statistics** calculations
8. **Create match history** view

## Notes

- The current components store everything in localStorage
- The new system can work **both with and without API**
- When `matchId` is present, it syncs with API
- When `matchId` is absent, it works offline (local-only)
- This allows for gradual migration and offline support

