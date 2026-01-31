# Database Implementation Plan - Standalone Matches

## Overview

This document defines the PostgreSQL database schema for standalone matches in DarterAssistant MVP. Standalone matches are independent darts games not associated with any tournament, supporting both authenticated users and guest players. The schema is designed for Supabase (PostgreSQL) with focus on real-time score entry performance and concurrent viewing.

**Schema Name:** `topdarter`

**Scope:** Standalone matches only (no tournament functionality)

## 1. Tables

### 1.1 Lookup Tables

#### `topdarter.match_types`

Defines game types with default configurations (501, 301, cricket, etc.).

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| name | VARCHAR(100) | NOT NULL, UNIQUE | Match type name (e.g., '501', '301', 'Cricket') |
| default_start_score | INTEGER | NOT NULL, DEFAULT 501, CHECK (default_start_score >= 0) | Default starting score |
| default_checkout_rule | VARCHAR(50) | NOT NULL, DEFAULT 'double_out', CHECK (default_checkout_rule IN ('straight', 'double_out', 'master_out')) | Default checkout rule |
| default_format_type | VARCHAR(50) | NOT NULL, DEFAULT 'first_to', CHECK (default_format_type IN ('first_to', 'best_of', 'unlimited')) | Default format type |
| default_legs_count | INTEGER | CHECK (default_legs_count > 0) | Default number of legs |
| default_sets_count | INTEGER | CHECK (default_sets_count > 0) | Default number of sets |
| description | TEXT | | Match type description |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Whether match type is currently available |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

### 1.2 Match Data

#### `topdarter.matches`

Core match entity for standalone matches.

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| match_type_id | UUID | NOT NULL, REFERENCES topdarter.match_types(id) | Match type |
| player1_user_id | UUID | REFERENCES auth.users(id) ON DELETE CASCADE | Player 1 authenticated user ID |
| player1_guest_name | VARCHAR(255) | | Player 1 guest name |
| player2_user_id | UUID | REFERENCES auth.users(id) ON DELETE CASCADE | Player 2 authenticated user ID |
| player2_guest_name | VARCHAR(255) | | Player 2 guest name |
| start_score | INTEGER | NOT NULL, DEFAULT 501, CHECK (start_score > 0) | Starting score |
| checkout_rule | VARCHAR(50) | NOT NULL, DEFAULT 'double_out', CHECK (checkout_rule IN ('straight', 'double_out', 'master_out')) | Checkout rule |
| format_type | VARCHAR(50) | NOT NULL, DEFAULT 'first_to', CHECK (format_type IN ('first_to', 'best_of', 'unlimited')) | Format type |
| legs_count | INTEGER | CHECK (legs_count > 0) | Number of legs (required for first_to/best_of) |
| sets_count | INTEGER | CHECK (sets_count > 0) | Number of sets |
| current_leg | INTEGER | NOT NULL, DEFAULT 1, CHECK (current_leg > 0) | Current leg number |
| current_set | INTEGER | NOT NULL, DEFAULT 1, CHECK (current_set > 0) | Current set number |
| player1_legs_won | INTEGER | NOT NULL, DEFAULT 0, CHECK (player1_legs_won >= 0) | Player 1 legs won |
| player2_legs_won | INTEGER | NOT NULL, DEFAULT 0, CHECK (player2_legs_won >= 0) | Player 2 legs won |
| player1_sets_won | INTEGER | NOT NULL, DEFAULT 0, CHECK (player1_sets_won >= 0) | Player 1 sets won |
| player2_sets_won | INTEGER | NOT NULL, DEFAULT 0, CHECK (player2_sets_won >= 0) | Player 2 sets won |
| winner_player_number | INTEGER | CHECK (winner_player_number IN (1, 2)) | Winning player (1 or 2) |
| match_status | VARCHAR(50) | NOT NULL, DEFAULT 'setup', CHECK (match_status IN ('setup', 'in_progress', 'paused', 'completed', 'cancelled')) | Match status |
| is_private | BOOLEAN | NOT NULL, DEFAULT false | Privacy flag |
| started_at | TIMESTAMPTZ | | Match start timestamp |
| completed_at | TIMESTAMPTZ | | Match completion timestamp |
| duration_seconds | INTEGER | GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (completed_at - started_at))::INTEGER) STORED | Match duration in seconds |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |
| created_by_user_id | UUID | REFERENCES auth.users(id) ON DELETE SET NULL | Creator user ID |
| updated_by_user_id | UUID | REFERENCES auth.users(id) ON DELETE SET NULL | Last updater user ID |

**Check Constraints:**
- `(player1_user_id IS NOT NULL AND player1_guest_name IS NULL) OR (player1_user_id IS NULL AND player1_guest_name IS NOT NULL)` - Player 1 XOR
- `(player2_user_id IS NOT NULL AND player2_guest_name IS NULL) OR (player2_user_id IS NULL AND player2_guest_name IS NOT NULL)` - Player 2 XOR
- `(format_type IN ('first_to', 'best_of') AND legs_count IS NOT NULL) OR (format_type = 'unlimited')` - Format validation
- `completed_at IS NULL OR completed_at >= started_at` - Time validation

#### `topdarter.match_legs`

Throw-by-throw raw data storage - granular scoring detail.

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| match_id | UUID | NOT NULL, REFERENCES topdarter.matches(id) ON DELETE CASCADE | Match ID |
| leg_number | INTEGER | NOT NULL, CHECK (leg_number > 0) | Leg number |
| set_number | INTEGER | NOT NULL, DEFAULT 1, CHECK (set_number > 0) | Set number |
| player_number | INTEGER | NOT NULL, CHECK (player_number IN (1, 2)) | Player (1 or 2) |
| throw_number | INTEGER | NOT NULL, CHECK (throw_number BETWEEN 1 AND 3) | Throw number (1-3) |
| round_number | INTEGER | NOT NULL, CHECK (round_number > 0) | Round number |
| score | INTEGER | NOT NULL, CHECK (score BETWEEN 0 AND 180) | Score for this throw |
| remaining_score | INTEGER | NOT NULL, CHECK (remaining_score >= 0) | Remaining score after throw |
| is_checkout_attempt | BOOLEAN | NOT NULL, DEFAULT false | Whether this was a checkout attempt |
| winner_player_number | INTEGER | CHECK (winner_player_number IN (1, 2)) | Winner of leg (set when leg completes) |
| winning_checkout | INTEGER | CHECK (winning_checkout BETWEEN 2 AND 170) | Winning checkout score |
| started_at | TIMESTAMPTZ | | Leg start timestamp |
| completed_at | TIMESTAMPTZ | | Leg completion timestamp |
| duration_seconds | INTEGER | GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (completed_at - started_at))::INTEGER) STORED | Leg duration in seconds |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

**Unique Constraint:** `(match_id, leg_number, set_number, player_number, throw_number, round_number)` - Unique throw identification

#### `topdarter.match_stats`

Aggregated match-level statistics per player.

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| match_id | UUID | NOT NULL, REFERENCES topdarter.matches(id) ON DELETE CASCADE | Match ID |
| player_number | INTEGER | NOT NULL, CHECK (player_number IN (1, 2)) | Player (1 or 2) |
| total_score | INTEGER | NOT NULL, DEFAULT 0, CHECK (total_score >= 0) | Total points scored |
| darts_thrown | INTEGER | NOT NULL, DEFAULT 0, CHECK (darts_thrown >= 0) | Total darts thrown |
| rounds_played | INTEGER | NOT NULL, DEFAULT 0, CHECK (rounds_played >= 0) | Total rounds played |
| average_score | NUMERIC(5,2) | GENERATED ALWAYS AS (CASE WHEN darts_thrown > 0 THEN (total_score::NUMERIC / darts_thrown * 3) ELSE 0 END) STORED | Three-dart average |
| first_9_average | NUMERIC(5,2) | CHECK (first_9_average >= 0) | First 9 darts average |
| scores_60_plus | INTEGER | NOT NULL, DEFAULT 0, CHECK (scores_60_plus >= 0) | Rounds scoring 60+ |
| scores_80_plus | INTEGER | NOT NULL, DEFAULT 0, CHECK (scores_80_plus >= 0) | Rounds scoring 80+ |
| scores_100_plus | INTEGER | NOT NULL, DEFAULT 0, CHECK (scores_100_plus >= 0) | Rounds scoring 100+ |
| scores_120_plus | INTEGER | NOT NULL, DEFAULT 0, CHECK (scores_120_plus >= 0) | Rounds scoring 120+ |
| scores_140_plus | INTEGER | NOT NULL, DEFAULT 0, CHECK (scores_140_plus >= 0) | Rounds scoring 140+ |
| scores_170_plus | INTEGER | NOT NULL, DEFAULT 0, CHECK (scores_170_plus >= 0) | Rounds scoring 170+ |
| scores_180 | INTEGER | NOT NULL, DEFAULT 0, CHECK (scores_180 >= 0) | Perfect 180s |
| checkout_attempts | INTEGER | NOT NULL, DEFAULT 0, CHECK (checkout_attempts >= 0) | Checkout attempts |
| successful_checkouts | INTEGER | NOT NULL, DEFAULT 0, CHECK (successful_checkouts >= 0) | Successful checkouts |
| high_finish | INTEGER | CHECK (high_finish BETWEEN 2 AND 170) | Highest checkout |
| finishes_100_plus | INTEGER | NOT NULL, DEFAULT 0, CHECK (finishes_100_plus >= 0) | Checkouts 100+ |
| best_leg_darts | INTEGER | CHECK (best_leg_darts > 0) | Fewest darts to win leg |
| worst_leg_darts | INTEGER | CHECK (worst_leg_darts > 0) | Most darts to win leg |
| legs_won_on_own_throw | INTEGER | NOT NULL, DEFAULT 0, CHECK (legs_won_on_own_throw >= 0) | Holds |
| legs_won_on_opponent_throw | INTEGER | NOT NULL, DEFAULT 0, CHECK (legs_won_on_opponent_throw >= 0) | Breaks |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Unique Constraint:** `(match_id, player_number)` - One stats row per player per match

**Check Constraint:** `successful_checkouts <= checkout_attempts`

#### `topdarter.match_locks`

Session-based locking to prevent concurrent scoring from multiple devices.

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| match_id | UUID | PRIMARY KEY, REFERENCES topdarter.matches(id) ON DELETE CASCADE | Match ID (primary key) |
| locked_by_session_id | VARCHAR(255) | NOT NULL, UNIQUE | Session ID holding the lock |
| device_info | JSONB | NOT NULL, DEFAULT '{}'::jsonb | Device information (browser, OS, etc.) for audit trail |
| locked_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Lock acquisition timestamp |
| expires_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() + INTERVAL '30 minutes' | Lock expiration timestamp |
| auto_extend | BOOLEAN | NOT NULL, DEFAULT true | Auto-extend on activity |
| last_activity_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last activity timestamp |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

## 2. Relationships

### One-to-Many Relationships

1. **topdarter.match_types → topdarter.matches**
   - One match type defines many matches

2. **topdarter.matches → topdarter.match_legs**
   - One match has many legs (throw-by-throw data)

3. **topdarter.matches → topdarter.match_stats**
   - One match has stats for 2 players

4. **topdarter.matches → topdarter.match_locks**
   - One match has at most one lock (1:0..1)

5. **auth.users → topdarter.matches** (via `player1_user_id`, `player2_user_id`, `created_by_user_id`)
   - One user can play in or create many matches

### Relationship Cardinality Summary

- match_types:matches = 1:N
- matches:match_legs = 1:N
- matches:match_stats = 1:2 (one per player)
- matches:match_locks = 1:0..1
- users:matches = N:M (as players or creators)

## 3. Indexes

### Performance Indexes

#### `topdarter.matches`
```sql
-- Recent matches by user
CREATE INDEX idx_matches_player1_user 
  ON topdarter.matches(player1_user_id, created_at DESC)
  WHERE player1_user_id IS NOT NULL;

CREATE INDEX idx_matches_player2_user 
  ON topdarter.matches(player2_user_id, created_at DESC)
  WHERE player2_user_id IS NOT NULL;

-- Live public matches
CREATE INDEX idx_matches_live 
  ON topdarter.matches(match_status, started_at DESC)
  WHERE match_status = 'in_progress' AND is_private = false;

-- Recent completed matches
CREATE INDEX idx_matches_recent_completed 
  ON topdarter.matches(completed_at DESC)
  WHERE match_status = 'completed' AND completed_at > NOW() - INTERVAL '7 days';

-- Match type filtering
CREATE INDEX idx_matches_type 
  ON topdarter.matches(match_type_id, created_at DESC);
```

#### `topdarter.match_legs`
```sql
-- Primary access pattern: sequential throw data
CREATE INDEX idx_match_legs_sequential 
  ON topdarter.match_legs(match_id, leg_number, round_number, throw_number);

-- Leg completion queries
CREATE INDEX idx_match_legs_completion 
  ON topdarter.match_legs(match_id, leg_number, winner_player_number)
  WHERE winner_player_number IS NOT NULL;

-- Player-specific leg data
CREATE INDEX idx_match_legs_player 
  ON topdarter.match_legs(match_id, player_number, leg_number);
```

#### `topdarter.match_stats`
```sql
CREATE INDEX idx_match_stats_match 
  ON topdarter.match_stats(match_id, player_number);
```

#### `topdarter.match_locks`
```sql
-- Expired locks cleanup
CREATE INDEX idx_match_locks_expired 
  ON topdarter.match_locks(expires_at)
  WHERE expires_at < NOW();

-- Session-based lock lookup
CREATE INDEX idx_match_locks_session 
  ON topdarter.match_locks(locked_by_session_id);
```

### Covering Indexes

```sql
-- Match listings with player info
CREATE INDEX idx_matches_listing_with_players 
  ON topdarter.matches(created_at DESC) 
  INCLUDE (player1_user_id, player1_guest_name, player2_user_id, player2_guest_name, match_status);
```

## 4. Triggers and Functions

### 4.1 Timestamp Management

```sql
-- Reusable function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION topdarter.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
CREATE TRIGGER update_match_types_updated_at
  BEFORE UPDATE ON topdarter.match_types
  FOR EACH ROW EXECUTE FUNCTION topdarter.update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON topdarter.matches
  FOR EACH ROW EXECUTE FUNCTION topdarter.update_updated_at_column();

CREATE TRIGGER update_match_stats_updated_at
  BEFORE UPDATE ON topdarter.match_stats
  FOR EACH ROW EXECUTE FUNCTION topdarter.update_updated_at_column();

CREATE TRIGGER update_match_locks_updated_at
  BEFORE UPDATE ON topdarter.match_locks
  FOR EACH ROW EXECUTE FUNCTION topdarter.update_updated_at_column();
```

### 4.2 Match Statistics Updates

```sql
-- Incrementally update match stats when scores are added
CREATE OR REPLACE FUNCTION topdarter.update_match_stats_on_score()
RETURNS TRIGGER AS $$
DECLARE
  round_total INTEGER;
BEGIN
  -- Calculate round total for this player when throw_number = 3 (round complete)
  IF NEW.throw_number = 3 THEN
    SELECT COALESCE(SUM(score), 0) INTO round_total
    FROM topdarter.match_legs
    WHERE match_id = NEW.match_id
      AND leg_number = NEW.leg_number
      AND player_number = NEW.player_number
      AND round_number = NEW.round_number;

    -- Update or insert match stats
    INSERT INTO topdarter.match_stats (
      match_id,
      player_number,
      total_score,
      darts_thrown,
      rounds_played,
      scores_60_plus,
      scores_80_plus,
      scores_100_plus,
      scores_120_plus,
      scores_140_plus,
      scores_170_plus,
      scores_180
    )
    VALUES (
      NEW.match_id,
      NEW.player_number,
      round_total,
      3,
      1,
      CASE WHEN round_total >= 60 THEN 1 ELSE 0 END,
      CASE WHEN round_total >= 80 THEN 1 ELSE 0 END,
      CASE WHEN round_total >= 100 THEN 1 ELSE 0 END,
      CASE WHEN round_total >= 120 THEN 1 ELSE 0 END,
      CASE WHEN round_total >= 140 THEN 1 ELSE 0 END,
      CASE WHEN round_total >= 170 THEN 1 ELSE 0 END,
      CASE WHEN round_total = 180 THEN 1 ELSE 0 END
    )
    ON CONFLICT (match_id, player_number) DO UPDATE SET
      total_score = match_stats.total_score + round_total,
      darts_thrown = match_stats.darts_thrown + 3,
      rounds_played = match_stats.rounds_played + 1,
      scores_60_plus = match_stats.scores_60_plus + CASE WHEN round_total >= 60 THEN 1 ELSE 0 END,
      scores_80_plus = match_stats.scores_80_plus + CASE WHEN round_total >= 80 THEN 1 ELSE 0 END,
      scores_100_plus = match_stats.scores_100_plus + CASE WHEN round_total >= 100 THEN 1 ELSE 0 END,
      scores_120_plus = match_stats.scores_120_plus + CASE WHEN round_total >= 120 THEN 1 ELSE 0 END,
      scores_140_plus = match_stats.scores_140_plus + CASE WHEN round_total >= 140 THEN 1 ELSE 0 END,
      scores_170_plus = match_stats.scores_170_plus + CASE WHEN round_total >= 170 THEN 1 ELSE 0 END,
      scores_180 = match_stats.scores_180 + CASE WHEN round_total = 180 THEN 1 ELSE 0 END;
  END IF;

  -- Track checkout attempts
  IF NEW.is_checkout_attempt THEN
    INSERT INTO topdarter.match_stats (match_id, player_number, checkout_attempts)
    VALUES (NEW.match_id, NEW.player_number, 1)
    ON CONFLICT (match_id, player_number) DO UPDATE SET
      checkout_attempts = match_stats.checkout_attempts + 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_match_stats_on_score
  AFTER INSERT ON topdarter.match_legs
  FOR EACH ROW EXECUTE FUNCTION topdarter.update_match_stats_on_score();
```

### 4.3 Match Leg Completion

```sql
-- Update match legs won and determine match winner when leg completes
CREATE OR REPLACE FUNCTION topdarter.update_match_on_leg_complete()
RETURNS TRIGGER AS $$
DECLARE
  match_legs_count INTEGER;
  match_format VARCHAR(50);
  p1_legs INTEGER;
  p2_legs INTEGER;
  winner INTEGER;
BEGIN
  -- Only process when winner is set (leg completed)
  IF NEW.winner_player_number IS NOT NULL AND 
     (OLD.winner_player_number IS NULL OR OLD.winner_player_number != NEW.winner_player_number) THEN
    
    -- Get match configuration
    SELECT legs_count, format_type, player1_legs_won, player2_legs_won
    INTO match_legs_count, match_format, p1_legs, p2_legs
    FROM topdarter.matches
    WHERE id = NEW.match_id;

    -- Increment legs won for winner
    IF NEW.winner_player_number = 1 THEN
      p1_legs := p1_legs + 1;
    ELSE
      p2_legs := p2_legs + 1;
    END IF;

    -- Update successful checkout stats
    IF NEW.winning_checkout IS NOT NULL THEN
      INSERT INTO topdarter.match_stats (
        match_id,
        player_number,
        successful_checkouts,
        high_finish,
        finishes_100_plus
      )
      VALUES (
        NEW.match_id,
        NEW.winner_player_number,
        1,
        NEW.winning_checkout,
        CASE WHEN NEW.winning_checkout >= 100 THEN 1 ELSE 0 END
      )
      ON CONFLICT (match_id, player_number) DO UPDATE SET
        successful_checkouts = match_stats.successful_checkouts + 1,
        high_finish = GREATEST(match_stats.high_finish, NEW.winning_checkout),
        finishes_100_plus = match_stats.finishes_100_plus + 
          CASE WHEN NEW.winning_checkout >= 100 THEN 1 ELSE 0 END;
    END IF;

    -- Determine match winner based on format
    winner := NULL;
    IF match_format = 'first_to' THEN
      IF p1_legs >= match_legs_count THEN
        winner := 1;
      ELSIF p2_legs >= match_legs_count THEN
        winner := 2;
      END IF;
    ELSIF match_format = 'best_of' THEN
      IF p1_legs > match_legs_count / 2 THEN
        winner := 1;
      ELSIF p2_legs > match_legs_count / 2 THEN
        winner := 2;
      END IF;
    END IF;

    -- Update match
    UPDATE topdarter.matches
    SET 
      player1_legs_won = p1_legs,
      player2_legs_won = p2_legs,
      winner_player_number = COALESCE(winner, winner_player_number),
      match_status = CASE WHEN winner IS NOT NULL THEN 'completed' ELSE match_status END,
      completed_at = CASE WHEN winner IS NOT NULL THEN NOW() ELSE completed_at END
    WHERE id = NEW.match_id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_match_on_leg_complete
  AFTER UPDATE ON topdarter.match_legs
  FOR EACH ROW EXECUTE FUNCTION topdarter.update_match_on_leg_complete();
```

## 5. Row-Level Security (RLS) Policies

### 5.1 Enable RLS on All Tables

```sql
ALTER TABLE topdarter.match_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE topdarter.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE topdarter.match_legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE topdarter.match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE topdarter.match_locks ENABLE ROW LEVEL SECURITY;
```

### 5.2 Match Types Policies

```sql
-- SELECT: Anyone can view active match types
CREATE POLICY "Active match types are viewable by everyone"
  ON topdarter.match_types FOR SELECT
  USING (is_active = true);
```

### 5.3 Matches Policies

```sql
-- SELECT: Public matches and matches where user is a player
CREATE POLICY "Matches are viewable based on privacy settings"
  ON topdarter.matches FOR SELECT
  USING (
    is_private = false
    OR player1_user_id = auth.uid()
    OR player2_user_id = auth.uid()
    OR created_by_user_id = auth.uid()
  );

-- INSERT: Authenticated users can create matches where they are a player
CREATE POLICY "Users can create their own matches"
  ON topdarter.matches FOR INSERT
  WITH CHECK (
    player1_user_id = auth.uid() 
    OR player2_user_id = auth.uid()
    OR created_by_user_id = auth.uid()
  );

-- UPDATE: Match creator or players or lock holder can update
CREATE POLICY "Match participants can update matches"
  ON topdarter.matches FOR UPDATE
  USING (
    created_by_user_id = auth.uid()
    OR player1_user_id = auth.uid()
    OR player2_user_id = auth.uid()
    OR id IN (
      SELECT match_id FROM topdarter.match_locks
      WHERE locked_by_session_id = current_setting('app.session_id', true)
        AND expires_at > NOW()
    )
  );

-- DELETE: Match creator or players can delete
CREATE POLICY "Match participants can delete matches"
  ON topdarter.matches FOR DELETE
  USING (
    created_by_user_id = auth.uid()
    OR player1_user_id = auth.uid()
    OR player2_user_id = auth.uid()
  );
```

### 5.4 Match Legs & Stats Policies

```sql
-- SELECT: Same visibility as parent match
CREATE POLICY "Match legs viewable with match"
  ON topdarter.match_legs FOR SELECT
  USING (
    match_id IN (SELECT id FROM topdarter.matches) -- Inherits match policies
  );

-- INSERT: Only lock holders with valid session can insert
CREATE POLICY "Lock holders can insert match legs"
  ON topdarter.match_legs FOR INSERT
  WITH CHECK (
    match_id IN (
      SELECT ml.match_id FROM topdarter.match_locks ml
      WHERE ml.expires_at > NOW()
        AND ml.locked_by_session_id = current_setting('app.session_id', true)
    )
  );

-- UPDATE: Only lock holders with valid session can update
CREATE POLICY "Lock holders can update match legs"
  ON topdarter.match_legs FOR UPDATE
  USING (
    match_id IN (
      SELECT ml.match_id FROM topdarter.match_locks ml
      WHERE ml.expires_at > NOW()
        AND ml.locked_by_session_id = current_setting('app.session_id', true)
    )
  );

-- DELETE: Match creator or players can delete
CREATE POLICY "Match participants can delete match legs"
  ON topdarter.match_legs FOR DELETE
  USING (
    match_id IN (
      SELECT id FROM topdarter.matches
      WHERE created_by_user_id = auth.uid()
        OR player1_user_id = auth.uid()
        OR player2_user_id = auth.uid()
    )
  );

-- Match Stats: Same as match legs
CREATE POLICY "Match stats viewable with match"
  ON topdarter.match_stats FOR SELECT
  USING (
    match_id IN (SELECT id FROM topdarter.matches)
  );

CREATE POLICY "Match stats auto-updated via triggers"
  ON topdarter.match_stats FOR INSERT
  WITH CHECK (true); -- Service role via triggers

CREATE POLICY "Match stats updated via triggers"
  ON topdarter.match_stats FOR UPDATE
  USING (true); -- Service role via triggers
```

### 5.5 Match Locks Policies

```sql
-- SELECT: Anyone can see if match is locked
CREATE POLICY "Match locks are publicly viewable"
  ON topdarter.match_locks FOR SELECT
  USING (true);

-- INSERT: Anyone with valid session can acquire locks
CREATE POLICY "Sessions can acquire match locks"
  ON topdarter.match_locks FOR INSERT
  WITH CHECK (locked_by_session_id = current_setting('app.session_id', true));

-- UPDATE: Only lock holder (matching session) can extend/update
CREATE POLICY "Lock holders can update their locks"
  ON topdarter.match_locks FOR UPDATE
  USING (locked_by_session_id = current_setting('app.session_id', true));

-- DELETE: Lock holder (matching session) or match participants can release locks
CREATE POLICY "Lock holders and participants can release locks"
  ON topdarter.match_locks FOR DELETE
  USING (
    locked_by_session_id = current_setting('app.session_id', true)
    OR
    match_id IN (
      SELECT id FROM topdarter.matches
      WHERE created_by_user_id = auth.uid()
        OR player1_user_id = auth.uid()
        OR player2_user_id = auth.uid()
    )
  );
```

## 6. Design Decisions and Implementation Notes

### 6.1 Player Identification Strategy

The schema supports both authenticated users and guest players:
- Each match has both `user_id` and `guest_name` columns for each player
- CHECK constraint ensures exactly one is populated per player: `(user_id IS NOT NULL AND guest_name IS NULL) OR (user_id IS NULL AND guest_name IS NOT NULL)`
- This allows flexible match creation with any combination of authenticated/guest players
- Guest players are identified only by name (no persistent user profile)

### 6.2 Match Locking Mechanism

Session-based locking prevents concurrent score entry:

**Lock Acquisition:**
- Single lock per match (match_id as primary key)
- Identified solely by `locked_by_session_id`
- 30-minute expiration with optional auto-extend
- Device info stored as JSONB for audit trail
- Only lock holder can insert/update scores

**Session Management:**
- Application generates cryptographically random session ID (UUID v4)
- Stored in secure HTTP-only cookie
- Application sets PostgreSQL session variable: `SET app.session_id = '<session_id>'`
- RLS policies check `current_setting('app.session_id')` matches `locked_by_session_id`

**Lock Release:**
- Lock holder can release own lock
- Match participants (players/creator) can forcibly release locks
- Locks auto-expire after 30 minutes

### 6.3 Statistics Update Strategy

Real-time incremental updates via triggers:
- INSERT on match_legs → update match_stats (running totals)
- UPDATE on match_legs (leg completion) → update matches (legs won, winner)
- Avoids expensive recalculation from scratch
- Generated columns for calculated fields (average_score, duration_seconds)

### 6.4 Data Granularity

Throw-by-throw detail in match_legs:
- Each throw stored individually with score and remaining_score
- Composite unique key: (match_id, leg_number, set_number, player_number, throw_number, round_number)
- Enables detailed replay, statistics, and analytics
- Aggregated to match_stats for performance

### 6.5 Privacy Controls

Simple privacy model for standalone matches:
- `is_private` flag controls visibility
- Private matches visible only to participants
- Public matches visible to everyone
- RLS policies enforce privacy automatically

### 6.6 Audit Trail

Standard columns across all tables:
- `created_at` (TIMESTAMPTZ, default NOW())
- `updated_at` (TIMESTAMPTZ, auto-updated via trigger)
- `created_by_user_id` (references auth.users) - optional for guest-created matches
- Enables change tracking and accountability

### 6.7 Performance Optimizations

- Composite indexes on sequential throw access patterns
- Partial indexes on live/recent matches
- Covering indexes with frequently accessed columns
- Generated columns to offload calculations to database
- Incremental statistics updates to minimize INSERT overhead

### 6.8 Security Considerations

**Session Security:**
- Session IDs must be cryptographically random (UUID v4 minimum)
- Store in secure HTTP-only cookies with SameSite=Strict
- Consider device fingerprinting for additional validation
- Implement rate limiting at application layer

**Data Access:**
- RLS policies ensure users only see their own matches (unless public)
- Triggers run with service role privileges (bypass RLS)
- Guest players have no persistent identity (no login required)

**Application Layer Responsibilities:**
- Session ID generation and storage
- Setting PostgreSQL session variable before database operations
- Lock acquisition and extension logic
- Match setup and player registration
- Score validation before insertion

## 7. Scalability Considerations

### Current Approach (MVP)
- Single database instance
- No partitioning
- Standard indexes for common queries
- Suitable for thousands of concurrent matches

### Future Optimizations (Post-MVP)
- Table partitioning by date for match_legs (high write volume)
- Read replicas for statistics queries
- Caching layer for frequently accessed match data
- Archive old completed matches to cold storage

## 8. Technology Stack Alignment

Optimized for Supabase (PostgreSQL) with Astro/React frontend:
- Row-Level Security (RLS) policies for authorization
- auth.users table from Supabase Auth (optional for guest matches)
- TIMESTAMPTZ for proper timezone handling
- Generated columns for real-time calculations
- Efficient indexing for real-time queries
- Trigger-based automation for consistency
- JSONB for flexible device info storage

---

**Schema Version:** 1.0.0  
**Last Updated:** 2026-01-18  
**Status:** Ready for Migration Implementation  
**Scope:** Standalone Matches Only

