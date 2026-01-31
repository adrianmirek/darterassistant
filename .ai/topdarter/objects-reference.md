# TopDarter Objects Reference

## Quick Reference: UI ↔ API Mapping

### Match Setup Flow

| UI Component | UI Model | Builder Function | API Command | API Endpoint |
|-------------|----------|------------------|-------------|--------------|
| GuestSetupPage | `MatchSetup` | `buildCreateMatchCommand()` | `CreateMatchCommand` | POST /matches |
| Setup form data | Player names, scores | → | player1, player2, start_score | → |

### Score Entry Flow

| UI Action | UI Model | Builder Function | API Command | API Endpoint |
|-----------|----------|------------------|-------------|--------------|
| Enter score | `ThrowEntry` | `buildCreateThrowCommand()` | `CreateThrowCommand` | POST /matches/:id/legs/throws |
| Round display | `RoundScore` | `mapThrowDtoToRoundScore()` | ← `MatchLegThrowDTO` | ← Response |

### Match State Flow

| UI Display | UI Model | Mapper Function | API DTO | API Endpoint |
|------------|----------|-----------------|---------|--------------|
| Scoreboard | `MatchState` | `mapMatchDtoToState()` | ← `StandaloneMatchDTO` | ← GET /matches/:id |
| Player stats | `PlayerMatchStats` | `mapStatsToPlayerMatchStats()` | ← `StandaloneMatchStatsDTO` | ← GET /matches/:id/stats |

## All Objects by Category

### 1. UI State Models (src/lib/models/standalone-match.models.ts)

**Setup & Configuration**
```typescript
MatchSetup {
  playerName: string
  opponentName: string
  startScore: number
  limitRounds: number | null
  formatType?: FormatType
  legsCount?: number
  checkoutRule?: CheckoutRule
}
```

**Gameplay State**
```typescript
RoundScore {
  round: number
  player1Scored: number | null
  player1ToGo: number
  player2Scored: number | null
  player2ToGo: number
}

MatchState {
  // Configuration
  matchId?: string
  playerName: string
  opponentName: string
  startScore: number
  limitRounds: number | null
  
  // Gameplay
  rounds: RoundScore[]
  activeRoundIndex: number
  activePlayer: "player" | "opponent"
  currentInput: string
  
  // Scoring
  playerLegs: number
  opponentLegs: number
  legFinished: boolean
  winner: "player" | "opponent" | null
  checkoutDarts: number | null
  
  // System
  matchStatus: MatchStatus
  sessionId?: string
  hasLock: boolean
}

ThrowEntry {
  player: "player" | "opponent"
  roundNumber: number
  throwNumber: 1 | 2 | 3
  score: number
  remainingScore: number
  isCheckoutAttempt: boolean
  isBust: boolean
  isWinningThrow: boolean
}
```

**Statistics & Summary**
```typescript
PlayerMatchStats {
  totalScore: number
  dartsThrown: number
  roundsPlayed: number
  averageScore: number
  first9Average: number | null
  scores60Plus: number
  scores80Plus: number
  scores100Plus: number
  scores120Plus: number
  scores140Plus: number
  scores170Plus: number
  scores180: number
  checkoutAttempts: number
  successfulCheckouts: number
  checkoutPercentage: number
  highFinish: number | null
  finishes100Plus: number
  bestLegDarts: number | null
  worstLegDarts: number | null
}

LegSummary {
  legNumber: number
  winner: "player" | "opponent"
  winnerDarts: number
  winningCheckout: number
  player1Score: number
  player2Score: number
  player1Average: number
  player2Average: number
}

MatchSummary {
  matchId: string
  playerName: string
  opponentName: string
  startScore: number
  totalLegs: number
  playerLegsWon: number
  opponentLegsWon: number
  matchWinner: "player" | "opponent" | null
  legs: LegSummary[]
  playerStats: PlayerMatchStats
  opponentStats: PlayerMatchStats
  duration?: number
  completedAt?: string
}
```

### 2. API Types (src/topdarter.types.ts)

**Enums**
```typescript
CheckoutRule = "straight" | "double_out" | "master_out"
FormatType = "first_to" | "best_of" | "unlimited"
MatchStatus = "setup" | "in_progress" | "paused" | "completed" | "cancelled"
PlayerNumber = 1 | 2
```

**Match Types**
```typescript
StandaloneMatchTypeDTO {
  id: string
  name: string
  default_start_score: number
  default_checkout_rule: CheckoutRule
  default_format_type: FormatType
  default_legs_count: number | null
  default_sets_count: number | null
  description: string | null
  is_active: boolean
}
```

**Matches**
```typescript
CreateMatchCommand {
  match_type_id: string
  player1: PlayerInfo
  player2: PlayerInfo
  start_score: number
  checkout_rule: CheckoutRule
  format_type: FormatType
  legs_count?: number
  sets_count?: number | null
  is_private?: boolean
}

UpdateMatchCommand {
  match_status?: MatchStatus
  is_private?: boolean
}

StandaloneMatchDTO {
  id: string
  match_type_id: string
  player1_user_id: string | null
  player1_guest_name: string | null
  player2_user_id: string | null
  player2_guest_name: string | null
  start_score: number
  checkout_rule: CheckoutRule
  format_type: FormatType
  legs_count: number | null
  sets_count: number | null
  current_leg: number
  current_set: number
  player1_legs_won: number
  player2_legs_won: number
  player1_sets_won: number
  player2_sets_won: number
  winner_player_number: PlayerNumber | null
  match_status: MatchStatus
  is_private: boolean
  started_at: string | null
  completed_at: string | null
  duration_seconds: number | null
  created_at: string
  updated_at: string
  created_by_user_id: string | null
}
```

**Match Legs (Throws)**
```typescript
CreateThrowCommand {
  leg_number: number
  set_number?: number
  player_number: PlayerNumber
  throw_number: 1 | 2 | 3
  round_number: number
  score: number
  remaining_score: number
  is_checkout_attempt?: boolean
}

MatchLegThrowDTO {
  id: string
  match_id: string
  leg_number: number
  set_number: number
  player_number: PlayerNumber
  throw_number: 1 | 2 | 3
  round_number: number
  score: number
  remaining_score: number
  is_checkout_attempt: boolean
  winner_player_number: PlayerNumber | null
  winning_checkout: number | null
  started_at: string | null
  completed_at: string | null
  duration_seconds: number | null
  created_at: string
}
```

**Statistics**
```typescript
StandaloneMatchStatsDTO {
  id?: string
  match_id?: string
  player_number: PlayerNumber
  total_score: number
  darts_thrown: number
  rounds_played: number
  average_score: number
  first_9_average: number | null
  scores_60_plus: number
  scores_80_plus: number
  scores_100_plus: number
  scores_120_plus: number
  scores_140_plus: number
  scores_170_plus: number
  scores_180: number
  checkout_attempts: number
  successful_checkouts: number
  high_finish: number | null
  finishes_100_plus: number
  best_leg_darts: number | null
  worst_leg_darts: number | null
  legs_won_on_own_throw: number
  legs_won_on_opponent_throw: number
  created_at?: string
  updated_at?: string
}
```

**Locks**
```typescript
AcquireLockCommand {
  device_info?: DeviceInfo
  auto_extend?: boolean
}

UpdateLockCommand {
  auto_extend?: boolean
}

MatchLockDTO {
  match_id: string
  locked_by_session_id: string
  device_info: DeviceInfo
  locked_at: string
  expires_at: string
  auto_extend: boolean
  last_activity_at: string
  created_at?: string
  updated_at?: string
}

LockStatusDTO = 
  | { match_id, is_locked: true, locked_by_session_id, locked_at, expires_at, is_current_session, time_remaining_seconds }
  | { match_id, is_locked: false }
```

### 3. Builder Functions

**Convert UI → API**
```typescript
buildCreateMatchCommand(setup: MatchSetup) → CreateMatchCommand
buildCreateThrowCommand(throwEntry: ThrowEntry) → CreateThrowCommand
buildAcquireLockCommand(autoExtend?: boolean) → AcquireLockCommand
```

### 4. Mapper Functions

**Convert API → UI**
```typescript
mapMatchDtoToState(match: StandaloneMatchDTO) → Partial<MatchState>
mapThrowDtoToRoundScore(throwDto: MatchLegThrowDTO, currentRounds) → RoundScore[]
mapStatsToPlayerMatchStats(stats: StandaloneMatchStatsDTO) → PlayerMatchStats
```

### 5. Helper Functions

**Validation**
```typescript
isValidThrowScore(score: number) → boolean
isBust(currentScore: number, thrownScore: number) → boolean
isWinningThrow(currentScore: number, thrownScore: number) → boolean
isCheckoutAttempt(remainingScore: number) → boolean
isEditingPreviousRound(rounds: RoundScore[], currentRoundIndex: number) → boolean
```

**Calculation**
```typescript
calculateAverage(rounds: RoundScore[], player: "player" | "opponent") → number
calculateTotalDarts(completedRounds: number, dartsInLastRound: number) → number
getCurrentDisplayScore(rounds: RoundScore[], player: "player" | "opponent", startScore: number) → number
```

**Data Manipulation**
```typescript
initializeRounds(startScore: number, count?: number) → RoundScore[]
recalculateToGoScores(rounds, fromIndex, player, startScore) → RoundScore[]
findCurrentActiveCell(rounds: RoundScore[]) → { roundIndex: number, player: "player" | "opponent" } | null
```

**Conversion**
```typescript
getPlayerNumber(player: "player" | "opponent") → PlayerNumber
getPlayerIdentifier(playerNumber: PlayerNumber) → "player" | "opponent"
```

**Storage**
```typescript
saveMatchSetup(setup: MatchSetup) → void
loadMatchSetup() → MatchSetup | null
clearMatchSetup() → void
saveMatchState(state: MatchState) → void
loadMatchState() → MatchState | null
clearMatchState() → void
getOrCreateSessionId() → string
generateSessionId() → string
```

### 6. API Service Functions

**Match Operations**
```typescript
createMatch(command: CreateMatchCommand, sessionId: string) → Promise<StandaloneMatchDTO>
getMatch(matchId: string, sessionId: string, include?: string[]) → Promise<StandaloneMatchWithStatsDTO>
updateMatch(matchId: string, command: UpdateMatchCommand, sessionId: string) → Promise<Partial<StandaloneMatchDTO>>
deleteMatch(matchId: string, sessionId: string) → Promise<void>
listMatches(query: ListMatchesQuery, sessionId?: string) → Promise<{ matches, meta }>
```

**Lock Operations**
```typescript
acquireMatchLock(matchId, command, sessionId) → Promise<MatchLockDTO>
updateMatchLock(matchId, command, sessionId) → Promise<MatchLockDTO>
releaseMatchLock(matchId, sessionId) → Promise<void>
getMatchLockStatus(matchId) → Promise<LockStatusDTO>
```

**Score Operations**
```typescript
recordThrow(matchId, command, sessionId) → Promise<{ throw: MatchLegThrowDTO, meta }>
getMatchLegs(matchId, query?, sessionId?) → Promise<{ throws, meta }>
updateThrow(matchId, throwId, command, sessionId) → Promise<{ throw, meta }>
deleteThrow(matchId, throwId, sessionId) → Promise<void>
recordThrowsBatch(matchId, throws, sessionId) → Promise<{ createdCount, throws, meta }>
```

**Statistics Operations**
```typescript
getMatchStats(matchId, playerNumber?, sessionId?) → Promise<StandaloneMatchStatsDTO[]>
```

**High-Level Operations**
```typescript
startNewMatch(command, sessionId, lockCommand) → Promise<{ match, lock }>
completeLeg(matchId, sessionId) → Promise<StandaloneMatchWithStatsDTO>
endMatch(matchId, sessionId) → Promise<StandaloneMatchWithStatsDTO>
cancelMatch(matchId, sessionId) → Promise<void>
resumeMatch(matchId, sessionId, lockCommand) → Promise<{ match, lock }>
pauseMatch(matchId, sessionId) → Promise<StandaloneMatchDTO>
```

### 7. React Hook Interface

```typescript
useStandaloneMatch(options?) → {
  // State
  matchState: MatchState | null
  isLoading: boolean
  error: string | null
  
  // Setup
  setupMatch: (setup: MatchSetup) → Promise<void>
  startMatch: () → Promise<void>
  
  // Score Entry
  enterScore: (score: number) → Promise<void>
  undoLastScore: () → Promise<void>
  editScore: (roundIndex, player, score) → Promise<void>
  
  // Control
  pauseMatch: () → Promise<void>
  resumeMatch: () → Promise<void>
  completeLeg: (dartsInLastRound: number) → Promise<void>
  startNewLeg: () → void
  exitMatch: () → Promise<void>
  
  // UI Helpers
  handleNumberInput: (num: string) → void
  handleBackspace: () → void
  handleEnter: () → void
  handleCellClick: (roundIndex, player) → void
  switchPlayer: () → void
  
  // Getters
  getPlayerStats: (player) → PlayerMatchStats | null
  getMatchSummary: () → MatchSummary | null
  getCurrentInput: () → string
  getActivePlayer: () → "player" | "opponent"
  getActiveRoundIndex: () → number
  isLegFinished: () → boolean
  getWinner: () → "player" | "opponent" | null
}
```

## Object Transformation Examples

### Example 1: Match Setup → API Creation

```typescript
// UI Input (GuestSetupPage)
const setup: MatchSetup = {
  playerName: "John",
  opponentName: "Jane",
  startScore: 501,
  limitRounds: null,
};

// Builder transforms to API command
const command = buildCreateMatchCommand(setup, "501-uuid");
// {
//   match_type_id: "501-uuid",
//   player1: { guest_name: "John" },
//   player2: { guest_name: "Jane" },
//   start_score: 501,
//   checkout_rule: "double_out",
//   format_type: "unlimited",
//   ...
// }

// API creates match
const match = await createMatch(command, sessionId);
// Returns: StandaloneMatchDTO with id, status, etc.

// Mapper transforms to UI state
const stateUpdate = mapMatchDtoToState(match);
// { matchId: "abc-123", playerName: "John", ... }
```

### Example 2: Score Entry → API Throw

```typescript
// UI Action (GuestScoreBoard)
const throwEntry: ThrowEntry = {
  player: "player",
  roundNumber: 1,
  throwNumber: 3,
  score: 60,
  remainingScore: 441,
  isCheckoutAttempt: false,
  isBust: false,
  isWinningThrow: false,
};

// Builder transforms to API command
const command = buildCreateThrowCommand(throwEntry, matchId, 1, 1);
// {
//   leg_number: 1,
//   set_number: 1,
//   player_number: 1,
//   throw_number: 3,
//   round_number: 1,
//   score: 60,
//   remaining_score: 441,
//   is_checkout_attempt: false,
// }

// API records throw
const { throw: throwDto, meta } = await recordThrow(matchId, command, sessionId);
// Returns: MatchLegThrowDTO + metadata

// Mapper updates rounds
const updatedRounds = mapThrowDtoToRoundScore(throwDto, currentRounds);
// Updates RoundScore[] with new score and remaining
```

### Example 3: Statistics Retrieval

```typescript
// API fetch
const stats = await getMatchStats(matchId, 1, sessionId);
// Returns: StandaloneMatchStatsDTO[]

// Mapper transforms to UI format
const playerStats = mapStatsToPlayerMatchStats(stats[0]);
// {
//   totalScore: 540,
//   dartsThrown: 27,
//   averageScore: 60.00,
//   checkoutPercentage: 66.67,
//   ...
// }
```

## Summary

- **50+ types/interfaces** total
- **3 builder functions** (UI → API)
- **3 mapper functions** (API → UI)
- **20+ helper functions** (validation, calculation, storage)
- **20+ API service functions** (HTTP requests)
- **1 comprehensive React hook** (useStandaloneMatch)

All objects are strongly typed and flow through the architecture from UI → Models → Services → API and back.

