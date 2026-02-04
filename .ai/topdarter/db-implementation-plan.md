# Database Implementation Plan - DarterAssistant MVP

## Overview

This document defines the complete PostgreSQL database schema for DarterAssistant MVP, a comprehensive darts scoring system supporting standalone matches and organized tournaments. The schema is designed for Supabase (PostgreSQL) with focus on real-time score entry performance, concurrent viewing, and flexible tournament structures.

**Schema Name:** `topdarter`

**Grants:** `SELECT`, `INSERT`, `DELETE` for authenticated users

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

#### `topdarter.tournament_types`

Defines tournament structures (single elimination, round-robin, Swiss, etc.).

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| name | VARCHAR(100) | NOT NULL, UNIQUE | Tournament type name |
| code | VARCHAR(50) | NOT NULL, UNIQUE | Machine-readable code (e.g., 'single_elimination', 'round_robin') |
| description | TEXT | | Tournament type description |
| supports_groups | BOOLEAN | NOT NULL, DEFAULT false | Whether type supports group stages |
| supports_knockout | BOOLEAN | NOT NULL, DEFAULT true | Whether type supports knockout phases |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Whether type is currently available |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

#### `topdarter.tournament_rounds`

Predefined rounds (final, semi-final, quarter-final, etc.) with phase ordering.

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| name | VARCHAR(100) | NOT NULL | Round name (e.g., 'Final', 'Semi-Final') |
| code | VARCHAR(50) | NOT NULL, UNIQUE | Machine-readable code (e.g., 'final', 'semi_final') |
| phase | VARCHAR(50) | NOT NULL, CHECK (phase IN ('group_stage', 'round_of_64', 'round_of_32', 'round_of_16', 'quarter_final', 'semi_final', 'third_place', 'final')) | Tournament phase |
| phase_order | INTEGER | NOT NULL | Order within tournament progression |
| best_of_legs | INTEGER | CHECK (best_of_legs > 0) | Recommended legs for this round |
| description | TEXT | | Round description |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Unique Constraint:** `(phase, phase_order)` - Ensures unique ordering

### 1.2 Organization Entities

#### `topdarter.dart_clubs`

Organizations that create and manage tournaments.

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| name | VARCHAR(200) | NOT NULL | Club name |
| slug | VARCHAR(200) | NOT NULL, UNIQUE | URL-friendly identifier |
| description | TEXT | | Club description |
| logo_url | TEXT | | URL to club logo |
| location | VARCHAR(200) | | Club location/address |
| website_url | TEXT | | Club website URL |
| contact_email | VARCHAR(255) | | Contact email |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | Whether club is active |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |
| created_by_user_id | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | Creator user ID |
| updated_by_user_id | UUID | REFERENCES auth.users(id) ON DELETE SET NULL | Last updater user ID |

#### `topdarter.club_admins`

Junction table for many-to-many relationship between users and clubs with roles.

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| dart_club_id | UUID | NOT NULL, REFERENCES topdarter.dart_clubs(id) ON DELETE CASCADE | Club ID |
| user_id | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | User ID |
| role | VARCHAR(50) | NOT NULL, DEFAULT 'admin', CHECK (role IN ('owner', 'admin', 'moderator')) | Admin role |
| can_create_tournaments | BOOLEAN | NOT NULL, DEFAULT true | Permission to create tournaments |
| can_edit_club | BOOLEAN | NOT NULL, DEFAULT false | Permission to edit club details |
| can_manage_admins | BOOLEAN | NOT NULL, DEFAULT false | Permission to manage other admins |
| invited_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Invitation timestamp |
| accepted_at | TIMESTAMPTZ | | Acceptance timestamp |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Unique Constraint:** `(dart_club_id, user_id)` - One role per user per club

### 1.3 Tournament Structure

#### `topdarter.tournaments`

Main tournament entity.

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| dart_club_id | UUID | NOT NULL, REFERENCES topdarter.dart_clubs(id) ON DELETE CASCADE | Owning club ID |
| tournament_type_id | UUID | NOT NULL, REFERENCES topdarter.tournament_types(id) | Tournament type |
| name | VARCHAR(255) | NOT NULL | Tournament name |
| description | TEXT | | Tournament description |
| start_date | TIMESTAMPTZ | NOT NULL | Tournament start date/time |
| end_date | TIMESTAMPTZ | | Tournament end date/time |
| location | VARCHAR(200) | | Tournament location |
| max_participants | INTEGER | CHECK (max_participants > 0) | Maximum number of participants |
| registration_deadline | TIMESTAMPTZ | | Registration deadline |
| entry_fee | NUMERIC(10,2) | CHECK (entry_fee >= 0) | Entry fee amount |
| prize_pool | NUMERIC(10,2) | CHECK (prize_pool >= 0) | Prize pool amount |
| visibility | VARCHAR(50) | NOT NULL, DEFAULT 'public', CHECK (visibility IN ('public', 'private', 'unlisted')) | Visibility level |
| tournament_status | VARCHAR(50) | NOT NULL, DEFAULT 'draft', CHECK (tournament_status IN ('draft', 'published', 'registration_open', 'registration_closed', 'in_progress', 'completed', 'cancelled', 'postponed')) | Tournament lifecycle status |
| tournament_config | JSONB | NOT NULL, DEFAULT '{}'::jsonb | Type-specific flexible settings |
| rules | TEXT | | Tournament rules |
| banner_url | TEXT | | Tournament banner image URL |
| referee_password_hash | TEXT | | Hashed password for referee/scoring access |
| allow_guest_referees | BOOLEAN | NOT NULL, DEFAULT true | Allow guests to score with password |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |
| created_by_user_id | UUID | NOT NULL, REFERENCES auth.users(id) ON DELETE CASCADE | Creator user ID |
| updated_by_user_id | UUID | REFERENCES auth.users(id) ON DELETE SET NULL | Last updater user ID |

**Check Constraint:** `end_date IS NULL OR end_date > start_date`

#### `topdarter.tournament_participants`

Players in tournaments - supports both authenticated users and guest players.

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| tournament_id | UUID | NOT NULL, REFERENCES topdarter.tournaments(id) ON DELETE CASCADE | Tournament ID |
| user_id | UUID | REFERENCES auth.users(id) ON DELETE CASCADE | Authenticated user ID (nullable) |
| guest_name | VARCHAR(255) | | Guest player name (nullable) |
| seed_number | INTEGER | CHECK (seed_number > 0) | Seeding position |
| participant_status | VARCHAR(50) | NOT NULL, DEFAULT 'registered', CHECK (participant_status IN ('registered', 'confirmed', 'checked_in', 'withdrawn', 'disqualified')) | Participant status |
| registration_date | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Registration timestamp |
| checked_in_at | TIMESTAMPTZ | | Check-in timestamp |
| notes | TEXT | | Additional notes |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Check Constraint:** `(user_id IS NOT NULL AND guest_name IS NULL) OR (user_id IS NULL AND guest_name IS NOT NULL)` - XOR constraint

**Unique Constraints:**
- `(tournament_id, user_id)` WHERE `user_id IS NOT NULL`
- `(tournament_id, guest_name)` WHERE `guest_name IS NOT NULL`

#### `topdarter.tournament_groups`

For round-robin and group stage tournaments.

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| tournament_id | UUID | NOT NULL, REFERENCES topdarter.tournaments(id) ON DELETE CASCADE | Tournament ID |
| group_name | VARCHAR(100) | NOT NULL | Group name (e.g., 'Group A', 'Group B') |
| group_type | VARCHAR(50) | NOT NULL, DEFAULT 'round_robin', CHECK (group_type IN ('round_robin', 'swiss', 'table_league')) | Group type |
| advance_count | INTEGER | NOT NULL, DEFAULT 2, CHECK (advance_count >= 0) | Number advancing to next phase |
| group_order | INTEGER | NOT NULL | Display order |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Unique Constraint:** `(tournament_id, group_name)` - Unique group names per tournament

#### `topdarter.tournament_standings`

Real-time leaderboard per tournament/group.

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| tournament_id | UUID | NOT NULL, REFERENCES topdarter.tournaments(id) ON DELETE CASCADE | Tournament ID |
| group_id | UUID | REFERENCES topdarter.tournament_groups(id) ON DELETE CASCADE | Group ID (nullable for non-grouped tournaments) |
| participant_id | UUID | NOT NULL, REFERENCES topdarter.tournament_participants(id) ON DELETE CASCADE | Participant ID |
| position | INTEGER | CHECK (position > 0) | Current standing position |
| matches_played | INTEGER | NOT NULL, DEFAULT 0, CHECK (matches_played >= 0) | Matches played |
| matches_won | INTEGER | NOT NULL, DEFAULT 0, CHECK (matches_won >= 0) | Matches won |
| matches_lost | INTEGER | NOT NULL, DEFAULT 0, CHECK (matches_lost >= 0) | Matches lost |
| legs_won | INTEGER | NOT NULL, DEFAULT 0, CHECK (legs_won >= 0) | Total legs won |
| legs_lost | INTEGER | NOT NULL, DEFAULT 0, CHECK (legs_lost >= 0) | Total legs lost |
| leg_difference | INTEGER | GENERATED ALWAYS AS (legs_won - legs_lost) STORED | Calculated leg difference |
| points | INTEGER | NOT NULL, DEFAULT 0, CHECK (points >= 0) | Tournament points |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

**Unique Constraint:** `(tournament_id, group_id, participant_id)` - One standing per participant per group

**Check Constraint:** `matches_played >= (matches_won + matches_lost)`

### 1.4 Match Data

#### `topdarter.matches`

Core match entity - supports standalone and tournament matches.

| Column | Data Type | Constraints | Description |
|--------|-----------|-------------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| tournament_id | UUID | REFERENCES topdarter.tournaments(id) ON DELETE CASCADE | Tournament ID (nullable for standalone) |
| tournament_round_id | UUID | REFERENCES topdarter.tournament_rounds(id) | Tournament round |
| group_id | UUID | REFERENCES topdarter.tournament_groups(id) ON DELETE CASCADE | Group ID for group stage matches |
| match_order | INTEGER | CHECK (match_order > 0) | Order within group stage |
| position_in_round | INTEGER | CHECK (position_in_round > 0) | Position within tournament round |
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
| inherit_tournament_visibility | BOOLEAN | NOT NULL, DEFAULT true | Inherit visibility from tournament |
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

**Composite Index (Primary):** `(match_id, leg_number, round_number, throw_number)` - Fast sequential throw access

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

1. **auth.users → topdarter.dart_clubs** (via `created_by_user_id`)
   - One user creates many clubs

2. **topdarter.dart_clubs → topdarter.tournaments**
   - One club hosts many tournaments

3. **topdarter.tournament_types → topdarter.tournaments**
   - One tournament type defines many tournaments

4. **topdarter.tournaments → topdarter.tournament_participants**
   - One tournament has many participants

5. **topdarter.tournaments → topdarter.tournament_groups**
   - One tournament has many groups

6. **topdarter.tournaments → topdarter.tournament_standings**
   - One tournament has many standings entries

7. **topdarter.tournaments → topdarter.matches**
   - One tournament has many matches (nullable for standalone)

8. **topdarter.tournament_groups → topdarter.matches**
   - One group has many matches

9. **topdarter.tournament_groups → topdarter.tournament_standings**
   - One group has many standings entries

10. **topdarter.tournament_rounds → topdarter.matches**
    - One round definition has many matches

11. **topdarter.tournament_participants → topdarter.tournament_standings**
    - One participant has standings in multiple groups/tournaments

12. **topdarter.match_types → topdarter.matches**
    - One match type defines many matches

13. **topdarter.matches → topdarter.match_legs**
    - One match has many legs

14. **topdarter.matches → topdarter.match_stats**
    - One match has stats for 2 players

15. **topdarter.matches → topdarter.match_locks**
    - One match has at most one lock (1:0..1)

16. **auth.users → topdarter.matches** (via `player1_user_id`, `player2_user_id`)
    - One user plays in many matches

### Many-to-Many Relationships

1. **auth.users ↔ topdarter.dart_clubs** (via `topdarter.club_admins`)
   - Users can admin multiple clubs
   - Clubs can have multiple admins
   - Junction table includes role and permissions

### Relationship Cardinality Summary

- dart_clubs:tournaments = 1:N
- tournaments:tournament_participants = 1:N
- tournaments:tournament_groups = 1:N
- tournaments:tournament_standings = 1:N
- tournaments:matches = 1:N (tournament_id nullable)
- tournament_groups:matches = 1:N
- tournament_groups:tournament_standings = 1:N
- tournament_participants:tournament_standings = 1:N
- matches:match_legs = 1:N
- matches:match_stats = 1:2 (one per player)
- matches:match_locks = 1:0..1
- users:dart_clubs = N:M (via club_admins)

## 3. Indexes

### Performance Indexes

#### `topdarter.dart_clubs`
```sql
CREATE INDEX idx_dart_clubs_slug ON topdarter.dart_clubs(slug);
CREATE INDEX idx_dart_clubs_created_by ON topdarter.dart_clubs(created_by_user_id);
CREATE INDEX idx_dart_clubs_active ON topdarter.dart_clubs(is_active) WHERE is_active = true;
```

#### `topdarter.club_admins`
```sql
CREATE INDEX idx_club_admins_user ON topdarter.club_admins(user_id);
CREATE INDEX idx_club_admins_club ON topdarter.club_admins(dart_club_id);
CREATE INDEX idx_club_admins_role ON topdarter.club_admins(dart_club_id, role);
```

#### `topdarter.tournaments`
```sql
-- Public tournament listings
CREATE INDEX idx_tournaments_public_listing 
  ON topdarter.tournaments(visibility, tournament_status, start_date DESC)
  WHERE visibility = 'public' AND tournament_status IN ('published', 'registration_open', 'in_progress');

-- Club dashboard
CREATE INDEX idx_tournaments_club_dashboard 
  ON topdarter.tournaments(dart_club_id, tournament_status, start_date DESC);

-- Type filtering
CREATE INDEX idx_tournaments_type ON topdarter.tournaments(tournament_type_id);

-- JSONB config
CREATE INDEX idx_tournaments_config ON topdarter.tournaments USING GIN(tournament_config);
```

#### `topdarter.tournament_participants`
```sql
CREATE INDEX idx_tournament_participants_tournament 
  ON topdarter.tournament_participants(tournament_id, participant_status);

CREATE INDEX idx_tournament_participants_user 
  ON topdarter.tournament_participants(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX idx_tournament_participants_status 
  ON topdarter.tournament_participants(tournament_id, participant_status);
```

#### `topdarter.tournament_groups`
```sql
CREATE INDEX idx_tournament_groups_tournament 
  ON topdarter.tournament_groups(tournament_id, group_order);
```

#### `topdarter.tournament_standings`
```sql
CREATE INDEX idx_tournament_standings_tournament 
  ON topdarter.tournament_standings(tournament_id, position);

CREATE INDEX idx_tournament_standings_group 
  ON topdarter.tournament_standings(group_id, position)
  WHERE group_id IS NOT NULL;

CREATE INDEX idx_tournament_standings_participant 
  ON topdarter.tournament_standings(participant_id);
```

#### `topdarter.matches`
```sql
-- Live match viewing
CREATE INDEX idx_matches_live 
  ON topdarter.matches(match_status, started_at DESC)
  WHERE match_status = 'in_progress' AND is_private = false;

-- Tournament fixtures
CREATE INDEX idx_matches_tournament_fixtures 
  ON topdarter.matches(tournament_id, tournament_round_id, position_in_round)
  WHERE tournament_id IS NOT NULL;

-- Group stage matches
CREATE INDEX idx_matches_group 
  ON topdarter.matches(group_id, match_order)
  WHERE group_id IS NOT NULL;

-- Player match history
CREATE INDEX idx_matches_player1_user 
  ON topdarter.matches(player1_user_id, created_at DESC)
  WHERE player1_user_id IS NOT NULL;

CREATE INDEX idx_matches_player2_user 
  ON topdarter.matches(player2_user_id, created_at DESC)
  WHERE player2_user_id IS NOT NULL;

-- Recent completed matches
CREATE INDEX idx_matches_recent_completed 
  ON topdarter.matches(completed_at DESC)
  WHERE match_status = 'completed' AND completed_at > NOW() - INTERVAL '7 days';
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

### Covering Indexes (include frequently accessed columns)

```sql
-- Tournament listings with key details
CREATE INDEX idx_tournaments_listing_with_club 
  ON topdarter.tournaments(start_date DESC) 
  INCLUDE (name, dart_club_id, tournament_status, visibility, max_participants);

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
CREATE TRIGGER update_dart_clubs_updated_at
  BEFORE UPDATE ON topdarter.dart_clubs
  FOR EACH ROW EXECUTE FUNCTION topdarter.update_updated_at_column();

CREATE TRIGGER update_club_admins_updated_at
  BEFORE UPDATE ON topdarter.club_admins
  FOR EACH ROW EXECUTE FUNCTION topdarter.update_updated_at_column();

CREATE TRIGGER update_match_types_updated_at
  BEFORE UPDATE ON topdarter.match_types
  FOR EACH ROW EXECUTE FUNCTION topdarter.update_updated_at_column();

CREATE TRIGGER update_tournament_types_updated_at
  BEFORE UPDATE ON topdarter.tournament_types
  FOR EACH ROW EXECUTE FUNCTION topdarter.update_updated_at_column();

CREATE TRIGGER update_tournament_rounds_updated_at
  BEFORE UPDATE ON topdarter.tournament_rounds
  FOR EACH ROW EXECUTE FUNCTION topdarter.update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON topdarter.tournaments
  FOR EACH ROW EXECUTE FUNCTION topdarter.update_updated_at_column();

CREATE TRIGGER update_tournament_participants_updated_at
  BEFORE UPDATE ON topdarter.tournament_participants
  FOR EACH ROW EXECUTE FUNCTION topdarter.update_updated_at_column();

CREATE TRIGGER update_tournament_groups_updated_at
  BEFORE UPDATE ON topdarter.tournament_groups
  FOR EACH ROW EXECUTE FUNCTION topdarter.update_updated_at_column();

CREATE TRIGGER update_tournament_standings_updated_at
  BEFORE UPDATE ON topdarter.tournament_standings
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

### 4.4 Tournament Standings Updates

```sql
-- Update tournament standings when match completes
CREATE OR REPLACE FUNCTION topdarter.update_tournament_standings_on_match_complete()
RETURNS TRIGGER AS $$
DECLARE
  p1_participant_id UUID;
  p2_participant_id UUID;
  points_win INTEGER := 2;
  points_loss INTEGER := 0;
BEGIN
  -- Only process completed matches with group_id
  IF NEW.match_status = 'completed' AND 
     NEW.group_id IS NOT NULL AND
     NEW.winner_player_number IS NOT NULL AND
     (OLD.match_status IS NULL OR OLD.match_status != 'completed') THEN

    -- Find participant IDs for both players
    IF NEW.player1_user_id IS NOT NULL THEN
      SELECT id INTO p1_participant_id
      FROM topdarter.tournament_participants
      WHERE tournament_id = NEW.tournament_id AND user_id = NEW.player1_user_id;
    ELSE
      SELECT id INTO p1_participant_id
      FROM topdarter.tournament_participants
      WHERE tournament_id = NEW.tournament_id AND guest_name = NEW.player1_guest_name;
    END IF;

    IF NEW.player2_user_id IS NOT NULL THEN
      SELECT id INTO p2_participant_id
      FROM topdarter.tournament_participants
      WHERE tournament_id = NEW.tournament_id AND user_id = NEW.player2_user_id;
    ELSE
      SELECT id INTO p2_participant_id
      FROM topdarter.tournament_participants
      WHERE tournament_id = NEW.tournament_id AND guest_name = NEW.player2_guest_name;
    END IF;

    -- Update standings for player 1
    IF NEW.winner_player_number = 1 THEN
      -- Player 1 won
      INSERT INTO topdarter.tournament_standings (
        tournament_id, group_id, participant_id,
        matches_played, matches_won, matches_lost,
        legs_won, legs_lost, points
      )
      VALUES (
        NEW.tournament_id, NEW.group_id, p1_participant_id,
        1, 1, 0,
        NEW.player1_legs_won, NEW.player2_legs_won, points_win
      )
      ON CONFLICT (tournament_id, group_id, participant_id) DO UPDATE SET
        matches_played = tournament_standings.matches_played + 1,
        matches_won = tournament_standings.matches_won + 1,
        legs_won = tournament_standings.legs_won + NEW.player1_legs_won,
        legs_lost = tournament_standings.legs_lost + NEW.player2_legs_won,
        points = tournament_standings.points + points_win;

      -- Player 2 lost
      INSERT INTO topdarter.tournament_standings (
        tournament_id, group_id, participant_id,
        matches_played, matches_won, matches_lost,
        legs_won, legs_lost, points
      )
      VALUES (
        NEW.tournament_id, NEW.group_id, p2_participant_id,
        1, 0, 1,
        NEW.player2_legs_won, NEW.player1_legs_won, points_loss
      )
      ON CONFLICT (tournament_id, group_id, participant_id) DO UPDATE SET
        matches_played = tournament_standings.matches_played + 1,
        matches_lost = tournament_standings.matches_lost + 1,
        legs_won = tournament_standings.legs_won + NEW.player2_legs_won,
        legs_lost = tournament_standings.legs_lost + NEW.player1_legs_won,
        points = tournament_standings.points + points_loss;
    ELSE
      -- Player 2 won
      INSERT INTO topdarter.tournament_standings (
        tournament_id, group_id, participant_id,
        matches_played, matches_won, matches_lost,
        legs_won, legs_lost, points
      )
      VALUES (
        NEW.tournament_id, NEW.group_id, p2_participant_id,
        1, 1, 0,
        NEW.player2_legs_won, NEW.player1_legs_won, points_win
      )
      ON CONFLICT (tournament_id, group_id, participant_id) DO UPDATE SET
        matches_played = tournament_standings.matches_played + 1,
        matches_won = tournament_standings.matches_won + 1,
        legs_won = tournament_standings.legs_won + NEW.player2_legs_won,
        legs_lost = tournament_standings.legs_lost + NEW.player1_legs_won,
        points = tournament_standings.points + points_win;

      -- Player 1 lost
      INSERT INTO topdarter.tournament_standings (
        tournament_id, group_id, participant_id,
        matches_played, matches_won, matches_lost,
        legs_won, legs_lost, points
      )
      VALUES (
        NEW.tournament_id, NEW.group_id, p1_participant_id,
        1, 0, 1,
        NEW.player1_legs_won, NEW.player2_legs_won, points_loss
      )
      ON CONFLICT (tournament_id, group_id, participant_id) DO UPDATE SET
        matches_played = tournament_standings.matches_played + 1,
        matches_lost = tournament_standings.matches_lost + 1,
        legs_won = tournament_standings.legs_won + NEW.player1_legs_won,
        legs_lost = tournament_standings.legs_lost + NEW.player2_legs_won,
        points = tournament_standings.points + points_loss;
    END IF;

    -- Recalculate positions within group
    WITH ranked_standings AS (
      SELECT 
        id,
        ROW_NUMBER() OVER (
          ORDER BY 
            points DESC,
            leg_difference DESC,
            legs_won DESC,
            matches_won DESC
        ) AS new_position
      FROM topdarter.tournament_standings
      WHERE tournament_id = NEW.tournament_id AND group_id = NEW.group_id
    )
    UPDATE topdarter.tournament_standings ts
    SET position = rs.new_position
    FROM ranked_standings rs
    WHERE ts.id = rs.id;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tournament_standings_on_match_complete
  AFTER UPDATE ON topdarter.matches
  FOR EACH ROW EXECUTE FUNCTION topdarter.update_tournament_standings_on_match_complete();
```

## 5. Row-Level Security (RLS) Policies

### 5.1 Enable RLS on All Tables

```sql
ALTER TABLE topdarter.dart_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE topdarter.club_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE topdarter.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE topdarter.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE topdarter.tournament_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE topdarter.tournament_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE topdarter.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE topdarter.match_legs ENABLE ROW LEVEL SECURITY;
ALTER TABLE topdarter.match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE topdarter.match_locks ENABLE ROW LEVEL SECURITY;
```

### 5.2 Dart Clubs Policies

```sql
-- SELECT: Anyone can view active clubs
CREATE POLICY "Public clubs are viewable by everyone"
  ON topdarter.dart_clubs FOR SELECT
  USING (is_active = true);

-- INSERT: Authenticated users can create clubs
CREATE POLICY "Authenticated users can create clubs"
  ON topdarter.dart_clubs FOR INSERT
  WITH CHECK (auth.uid() = created_by_user_id);

-- UPDATE: Club admins can update their clubs
CREATE POLICY "Club admins can update their clubs"
  ON topdarter.dart_clubs FOR UPDATE
  USING (
    id IN (
      SELECT dart_club_id FROM topdarter.club_admins
      WHERE user_id = auth.uid() AND can_edit_club = true
    )
  );

-- DELETE: Club owners can delete clubs
CREATE POLICY "Club owners can delete their clubs"
  ON topdarter.dart_clubs FOR DELETE
  USING (
    id IN (
      SELECT dart_club_id FROM topdarter.club_admins
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );
```

### 5.3 Club Admins Policies

```sql
-- SELECT: Club admins can view their club's admin list
CREATE POLICY "Club admins can view their club admins"
  ON topdarter.club_admins FOR SELECT
  USING (
    dart_club_id IN (
      SELECT dart_club_id FROM topdarter.club_admins
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: Club admins with manage_admins permission can add admins
CREATE POLICY "Authorized admins can add club admins"
  ON topdarter.club_admins FOR INSERT
  WITH CHECK (
    dart_club_id IN (
      SELECT dart_club_id FROM topdarter.club_admins
      WHERE user_id = auth.uid() AND can_manage_admins = true
    )
  );

-- UPDATE: Club admins with manage_admins permission can update roles
CREATE POLICY "Authorized admins can update club admins"
  ON topdarter.club_admins FOR UPDATE
  USING (
    dart_club_id IN (
      SELECT dart_club_id FROM topdarter.club_admins
      WHERE user_id = auth.uid() AND can_manage_admins = true
    )
  );

-- DELETE: Club admins with manage_admins permission can remove admins
CREATE POLICY "Authorized admins can remove club admins"
  ON topdarter.club_admins FOR DELETE
  USING (
    dart_club_id IN (
      SELECT dart_club_id FROM topdarter.club_admins
      WHERE user_id = auth.uid() AND can_manage_admins = true
    )
  );
```

### 5.4 Tournaments Policies

```sql
-- SELECT: Public/unlisted published tournaments + club admin tournaments
CREATE POLICY "Public tournaments are viewable by everyone"
  ON topdarter.tournaments FOR SELECT
  USING (
    (visibility IN ('public', 'unlisted') AND tournament_status != 'draft')
    OR
    dart_club_id IN (
      SELECT dart_club_id FROM topdarter.club_admins
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: Club admins can create tournaments
CREATE POLICY "Club admins can create tournaments"
  ON topdarter.tournaments FOR INSERT
  WITH CHECK (
    dart_club_id IN (
      SELECT dart_club_id FROM topdarter.club_admins
      WHERE user_id = auth.uid() AND can_create_tournaments = true
    )
  );

-- UPDATE: Club admins can update their tournaments
CREATE POLICY "Club admins can update their tournaments"
  ON topdarter.tournaments FOR UPDATE
  USING (
    dart_club_id IN (
      SELECT dart_club_id FROM topdarter.club_admins
      WHERE user_id = auth.uid()
    )
  );

-- DELETE: Club admins can delete their tournaments
CREATE POLICY "Club admins can delete their tournaments"
  ON topdarter.tournaments FOR DELETE
  USING (
    dart_club_id IN (
      SELECT dart_club_id FROM topdarter.club_admins
      WHERE user_id = auth.uid()
    )
  );
```

### 5.5 Tournament Participants Policies

```sql
-- SELECT: Participants can view participants of tournaments they can see
CREATE POLICY "Tournament participants are viewable with tournament"
  ON topdarter.tournament_participants FOR SELECT
  USING (
    tournament_id IN (
      SELECT id FROM topdarter.tournaments
      WHERE (visibility IN ('public', 'unlisted') AND tournament_status != 'draft')
        OR dart_club_id IN (
          SELECT dart_club_id FROM topdarter.club_admins WHERE user_id = auth.uid()
        )
    )
  );

-- INSERT: Club admins and authenticated users can register
CREATE POLICY "Users can register for tournaments"
  ON topdarter.tournament_participants FOR INSERT
  WITH CHECK (
    (user_id = auth.uid()) -- Self-registration
    OR
    tournament_id IN ( -- Club admin can register anyone
      SELECT t.id FROM topdarter.tournaments t
      JOIN topdarter.club_admins ca ON ca.dart_club_id = t.dart_club_id
      WHERE ca.user_id = auth.uid()
    )
  );

-- UPDATE: Users can update their own participation, club admins can update any
CREATE POLICY "Users can update their participation"
  ON topdarter.tournament_participants FOR UPDATE
  USING (
    user_id = auth.uid()
    OR
    tournament_id IN (
      SELECT t.id FROM topdarter.tournaments t
      JOIN topdarter.club_admins ca ON ca.dart_club_id = t.dart_club_id
      WHERE ca.user_id = auth.uid()
    )
  );

-- DELETE: Users can withdraw, club admins can remove participants
CREATE POLICY "Users can withdraw from tournaments"
  ON topdarter.tournament_participants FOR DELETE
  USING (
    user_id = auth.uid()
    OR
    tournament_id IN (
      SELECT t.id FROM topdarter.tournaments t
      JOIN topdarter.club_admins ca ON ca.dart_club_id = t.dart_club_id
      WHERE ca.user_id = auth.uid()
    )
  );
```

### 5.6 Tournament Groups & Standings Policies

```sql
-- SELECT: Groups viewable with tournament
CREATE POLICY "Tournament groups are viewable with tournament"
  ON topdarter.tournament_groups FOR SELECT
  USING (
    tournament_id IN (
      SELECT id FROM topdarter.tournaments
      WHERE (visibility IN ('public', 'unlisted') AND tournament_status != 'draft')
        OR dart_club_id IN (
          SELECT dart_club_id FROM topdarter.club_admins WHERE user_id = auth.uid()
        )
    )
  );

-- INSERT/UPDATE/DELETE: Club admins only
CREATE POLICY "Club admins can manage tournament groups"
  ON topdarter.tournament_groups FOR ALL
  USING (
    tournament_id IN (
      SELECT t.id FROM topdarter.tournaments t
      JOIN topdarter.club_admins ca ON ca.dart_club_id = t.dart_club_id
      WHERE ca.user_id = auth.uid()
    )
  );

-- SELECT: Standings viewable with tournament
CREATE POLICY "Tournament standings are viewable with tournament"
  ON topdarter.tournament_standings FOR SELECT
  USING (
    tournament_id IN (
      SELECT id FROM topdarter.tournaments
      WHERE (visibility IN ('public', 'unlisted') AND tournament_status != 'draft')
        OR dart_club_id IN (
          SELECT dart_club_id FROM topdarter.club_admins WHERE user_id = auth.uid()
        )
    )
  );

-- INSERT/UPDATE: Automated via triggers (service role)
-- DELETE: Club admins can reset standings
CREATE POLICY "Club admins can delete tournament standings"
  ON topdarter.tournament_standings FOR DELETE
  USING (
    tournament_id IN (
      SELECT t.id FROM topdarter.tournaments t
      JOIN topdarter.club_admins ca ON ca.dart_club_id = t.dart_club_id
      WHERE ca.user_id = auth.uid()
    )
  );
```

### 5.7 Matches Policies

```sql
-- SELECT: Public matches, tournament matches (based on visibility), player matches
CREATE POLICY "Matches are viewable based on privacy settings"
  ON topdarter.matches FOR SELECT
  USING (
    (is_private = false AND (tournament_id IS NULL OR NOT00 inherit_tournament_visibility))
    OR
    (tournament_id IS NOT NULL AND inherit_tournament_visibility AND
      tournament_id IN (
        SELECT id FROM topdarter.tournaments
        WHERE visibility IN ('public', 'unlisted') AND tournament_status != 'draft'
      )
    )
    OR
    player1_user_id = auth.uid()
    OR
    player2_user_id = auth.uid()
    OR
    (tournament_id IS NOT NULL AND tournament_id IN (
      SELECT t.id FROM topdarter.tournaments t
      JOIN topdarter.club_admins ca ON ca.dart_club_id = t.dart_club_id
      WHERE ca.user_id = auth.uid()
    ))
  );

-- INSERT: Authenticated users create standalone, club admins create tournament matches
CREATE POLICY "Users can create matches"
  ON topdarter.matches FOR INSERT
  WITH CHECK (
    (tournament_id IS NULL AND (player1_user_id = auth.uid() OR player2_user_id = auth.uid()))
    OR
    (tournament_id IS NOT NULL AND tournament_id IN (
      SELECT t.id FROM topdarter.tournaments t
      JOIN topdarter.club_admins ca ON ca.dart_club_id = t.dart_club_id
      WHERE ca.user_id = auth.uid()
    ))
  );

-- UPDATE: Match creator or club admin or lock holder
CREATE POLICY "Match creators and admins can update matches"
  ON topdarter.matches FOR UPDATE
  USING (
    created_by_user_id = auth.uid()
    OR
    player1_user_id = auth.uid()
    OR
    player2_user_id = auth.uid()
    OR
    (tournament_id IS NOT NULL AND tournament_id IN (
      SELECT t.id FROM topdarter.tournaments t
      JOIN topdarter.club_admins ca ON ca.dart_club_id = t.dart_club_id
      WHERE ca.user_id = auth.uid()
    ))
    OR
    id IN (
      SELECT match_id FROM topdarter.match_locks
      WHERE locked_by_user_id = auth.uid() AND expires_at > NOW()
    )
  );

-- DELETE: Match creator or club admin
CREATE POLICY "Match creators and admins can delete matches"
  ON topdarter.matches FOR DELETE
  USING (
    created_by_user_id = auth.uid()
    OR
    player1_user_id = auth.uid()
    OR
    player2_user_id = auth.uid()
    OR
    (tournament_id IS NOT NULL AND tournament_id IN (
      SELECT t.id FROM topdarter.tournaments t
      JOIN topdarter.club_admins ca ON ca.dart_club_id = t.dart_club_id
      WHERE ca.user_id = auth.uid()
    ))
  );
```

### 5.8 Match Legs & Stats Policies

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

-- DELETE: Match creator or club admin
CREATE POLICY "Match creators can delete match legs"
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

### 5.9 Match Locks Policies

```sql
-- SELECT: Anyone can see if match is locked
CREATE POLICY "Match locks are publicly viewable"
  ON topdarter.match_locks FOR SELECT
  USING (true);

-- INSERT: Anyone with valid session can acquire locks
-- Note: Password verification happens at application layer before lock acquisition
CREATE POLICY "Sessions can acquire match locks"
  ON topdarter.match_locks FOR INSERT
  WITH CHECK (locked_by_session_id = current_setting('app.session_id', true));

-- UPDATE: Only lock holder (matching session) can extend/update
CREATE POLICY "Lock holders can update their locks"
  ON topdarter.match_locks FOR UPDATE
  USING (locked_by_session_id = current_setting('app.session_id', true));

-- DELETE: Lock holder (matching session) or club admins can release locks
CREATE POLICY "Lock holders and admins can release locks"
  ON topdarter.match_locks FOR DELETE
  USING (
    locked_by_session_id = current_setting('app.session_id', true)
    OR
    match_id IN (
      SELECT m.id FROM topdarter.matches m
      WHERE m.tournament_id IN (
        SELECT t.id FROM topdarter.tournaments t
        JOIN topdarter.club_admins ca ON ca.dart_club_id = t.dart_club_id
        WHERE ca.user_id = auth.uid()
      )
    )
  );
```

## 6. Additional Notes and Design Decisions

### 6.1 Player Identification Strategy

The schema supports both authenticated users and guest players through a flexible XOR constraint pattern:
- Each match/participant has both `user_id` and `guest_name` columns
- CHECK constraint ensures exactly one is populated: `(user_id IS NOT NULL AND guest_name IS NULL) OR (user_id IS NULL AND guest_name IS NOT NULL)`
- This allows tournaments to mix authenticated and guest players seamlessly

### 6.2 Match Locking Mechanism

Session-based locking prevents concurrent score entry with simplified session-only identification:

**Lock Acquisition:**
- Single lock per match (match_id as primary key)
- Identified solely by `locked_by_session_id` (no user_id or name tracking)
- 30-minute expiration with optional auto-extend
- Device info stored as JSONB for audit trail and debugging
- Lock holders have INSERT permission on match_legs via RLS policy
- Spectators can view in real-time without locks

**Tournament Referee Access:**
- Tournaments can set `referee_password_hash` for scoring access control
- Anyone (authenticated or guest) who provides correct password can acquire lock
- `allow_guest_referees` flag enables/disables guest referee access per tournament
- No distinction between authenticated users and guests at database level
- Application layer verifies password before allowing lock acquisition

**Session Management:**
- Application must set PostgreSQL session variable: `SET app.session_id = '<session_id>'`
- RLS policies check if `current_setting('app.session_id')` matches `locked_by_session_id`
- Session ID should be cryptographically random and stored in secure HTTP-only cookie
- Same session ID used throughout user's scoring session for lock identification

**Lock Release:**
- Lock holder (matching session_id) can release their own lock
- Club admins can forcibly release locks (for dispute resolution)
- Locks auto-expire after 30 minutes of inactivity

### 6.3 Statistics Update Strategy

Real-time incremental updates via triggers:
- INSERT on match_legs → update match_stats (running totals)
- UPDATE on match_legs (leg completion) → update matches (legs won)
- UPDATE on matches (completion) → update tournament_standings
- Avoids expensive recalculation from scratch
- Generated columns for calculated fields (average_score, leg_difference, duration_seconds)

### 6.4 Tournament Structure Flexibility

Support for multiple tournament formats:
- `tournament_config` JSONB column for type-specific settings
- Predefined `tournament_rounds` with phase ordering
- Optional group stage via `tournament_groups`
- Direct match linkage via `tournament_round_id` and `position_in_round` (no junction table)
- Bracket logic handled at application layer (not in database)

### 6.5 Visibility and Privacy Controls

Multi-level visibility system:
- Tournament level: `visibility` (public/private/unlisted) + `tournament_status`
- Match level: `is_private` + `inherit_tournament_visibility`
- RLS policies enforce visibility rules automatically
- Club admins always see their tournaments/matches

### 6.6 Data Granularity

Throw-by-throw detail in match_legs:
- Each throw stored individually with score and remaining_score
- Composite unique key: (match_id, leg_number, set_number, player_number, throw_number, round_number)
- Enables detailed replay, statistics, and analytics
- Aggregated to match_stats for performance

### 6.7 Audit Trail

Standard columns across all tables:
- `created_at` (TIMESTAMPTZ, default NOW())
- `updated_at` (TIMESTAMPTZ, auto-updated via trigger)
- `created_by_user_id` (references auth.users)
- `updated_by_user_id` (references auth.users)
- Enables change tracking and accountability

### 6.8 Scalability Considerations

Performance optimizations for growth:
- Composite indexes on access patterns (sequential throws, tournament listings)
- Partial indexes on active/recent data (live matches, recent completions)
- Covering indexes with INCLUDE for frequently accessed columns
- GIN indexes on JSONB columns
- Generated columns to offload calculations to database
- Table partitioning deferred until scale demands (not MVP)

### 6.9 Guest Referee Implementation Notes

**Password Verification Flow:**
1. User/guest requests to score a tournament match
2. Application prompts for tournament referee password
3. Application verifies password hash against `tournaments.referee_password_hash`
4. On success, application generates/retrieves session ID and sets `app.session_id` in PostgreSQL
5. Application allows user/guest to acquire lock on `match_locks` table
6. RLS policies permit score insertion for valid session ID or authenticated user

**Security Considerations:**
- Password should be hashed using bcrypt/argon2 before storing in `referee_password_hash`
- Session IDs must be cryptographically random and unguessable (UUID v4 or similar)
- Session expiration should align with or be shorter than lock expiration
- Device info (browser, OS, IP) stored for audit trail and debugging
- Consider rate limiting password attempts at application layer
- Session hijacking mitigation: validate device_info fingerprint on lock operations

**Application Layer Responsibilities:**
- Password hashing and verification
- Session ID generation (cryptographically random UUID)
- Session storage in secure HTTP-only cookie
- Setting PostgreSQL session variable before database operations: `SET app.session_id = 'uuid'`
- Lock acquisition API with password verification
- Session cleanup on logout/expiration
- Optional: Device fingerprinting for additional security

### 6.10 Unresolved Issues for Post-MVP

The following items were discussed but deferred:
1. **Tournament Scoring Rules**: Points for win/draw/loss configurable per tournament (recommend JSONB in tournament_config)
2. **Tiebreaker Logic**: Standings tiebreaker order specification (currently: points → leg_difference → legs_won → matches_won)
3. **Match Lock Extension**: Auto-extend behavior on score activity vs. explicit extension
4. **Checkout Validation**: Database-level enforcement of checkout rules (currently frontend only)
5. **Phase Advancement**: Automated tournament phase progression triggers
6. **Historical Archival**: Table partitioning strategy for long-term data
7. **Soft Deletes**: Hard delete vs. soft delete strategy (currently hard deletes)
8. **Bracket Display Logic**: Application layer documentation for bracket navigation without next_match_id
9. **Referee Session Expiration**: Strategy for handling expired sessions vs. expired locks

### 6.11 Technology Stack Alignment

Optimized for Supabase (PostgreSQL) with Astro/React frontend:
- Row-Level Security (RLS) policies for authorization
- auth.users table from Supabase Auth
- JSONB for flexible configuration storage
- TIMESTAMPTZ for proper timezone handling
- Generated columns for real-time calculations
- Efficient indexing for real-time queries
- Trigger-based automation for consistency

---

**Schema Version:** 1.0.0  
**Last Updated:** 2026-01-17  
**Status:** Ready for Migration Implementation

