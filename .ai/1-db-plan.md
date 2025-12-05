# Database Schema

## 1. Tables

### match_types
- id: SERIAL PRIMARY KEY
- name: TEXT NOT NULL UNIQUE  
  *Lookup table for match types (e.g., singles, doubles)*

### tournament_types
- id: SERIAL PRIMARY KEY
- name: TEXT NOT NULL UNIQUE  
  *Lookup table for tournament types (e.g., Leagues + SKO, SKO, DKO)*

### users
- this table is managed by Supabase Auth

### tournaments
- id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- user_id: UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
- name: TEXT NOT NULL
- date: DATE NOT NULL
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()
- tournament_type_id: INTEGER NOT NULL REFERENCES tournament_types(id) DEFAULT 1  
  *Defaults to seed ID=1 ('Leagues + SKO')*

### tournament_match_results
- id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- tournament_id: UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE
- match_type_id: INTEGER NOT NULL REFERENCES match_types(id)
- average_score: NUMERIC(5,2) NOT NULL CHECK (average_score >= 0)
- first_nine_avg: NUMERIC(5,2) NOT NULL CHECK (first_nine_avg >= 0)
- checkout_percentage: NUMERIC(5,2) NOT NULL CHECK (checkout_percentage >= 0 AND checkout_percentage <= 100)
- score_60_count: INTEGER NOT NULL DEFAULT 0 CHECK (score_60_count >= 0)
- score_100_count: INTEGER NOT NULL DEFAULT 0 CHECK (score_100_count >= 0)
- score_140_count: INTEGER NOT NULL DEFAULT 0 CHECK (score_140_count >= 0)
- score_180_count: INTEGER NOT NULL DEFAULT 0 CHECK (score_180_count >= 0)
- high_finish: INTEGER NOT NULL CHECK (high_finish >= 0)
- best_leg: INTEGER NOT NULL CHECK (best_leg >= 0)
- worst_leg: INTEGER NOT NULL CHECK (worst_leg >= 0)
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()
- opponent_id: UUID REFERENCES auth.users(id)
- full_name: TEXT
- Exclusion constraint to prevent overlapping goals per user:
  
  ### goals
- id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- user_id: UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
- target_avg: NUMERIC(5,2) NOT NULL CHECK (target_avg >= 0)
- start_date: DATE NOT NULL
- end_date: DATE NOT NULL
- created_at: TIMESTAMPTZ NOT NULL DEFAULT now()
- Exclusion constraint to prevent overlapping goals per user:
  ```sql
  ALTER TABLE goals
    ADD CONSTRAINT no_overlapping_goals
    EXCLUDE USING GIST (
      user_id WITH =,
      tsrange(start_date, end_date, '[]') WITH &&
    );
  ```

### goal_progress (view)
- Columns: goal_id, user_id, target_avg, start_date, end_date, average_score, tournament_count, progress_percentage
- Definition:
  ```sql
  CREATE VIEW goal_progress AS
  SELECT
    g.id           AS goal_id,
    g.user_id,
    g.target_avg,
    g.start_date,
    g.end_date,
    COALESCE(AVG(r.average_score), 0)            AS average_score,
    COUNT(r.*)                                  AS tournament_count,
    CASE WHEN g.target_avg = 0 THEN 0
         ELSE ROUND((AVG(r.average_score) / g.target_avg) * 100, 2)
    END                                         AS progress_percentage
  FROM goals g
  LEFT JOIN tournaments t
    ON t.user_id = g.user_id
   AND t.date BETWEEN g.start_date AND g.end_date
  LEFT JOIN tournament_match_results r
    ON r.tournament_id = t.id
  GROUP BY g.id;
  ```

  ## 2. Relationships

- auth.users (1) ↔ (∞) tournaments via user_id
- tournaments (1) ↔ (∞) tournament_match_results via tournament_id
- tournament_match_results (∞) ↔ (1) match_types via match_type_id
- auth.users (1) ↔ (∞) goals via user_id

## 3. Indexes

- `CREATE INDEX idx_tournaments_user_date ON tournaments(user_id, date DESC);`
- `CREATE INDEX idx_results_tournament ON tournament_match_results(tournament_id);`

## 4. Row-Level Security Policies

Enable RLS on each user-scoped table and add policies:

```sql
ALTER TABLE tournaments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals           ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_tournaments ON tournaments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY modify_tournaments ON tournaments
  FOR INSERT, UPDATE, DELETE USING (auth.uid() = user_id);

CREATE POLICY select_results ON tournament_match_results
  FOR SELECT USING (
    auth.uid() = (
      SELECT user_id FROM tournaments WHERE id = tournament_id
    )
  );
CREATE POLICY modify_results ON tournament_match_results
  FOR INSERT, UPDATE, DELETE USING (
    auth.uid() = (
      SELECT user_id FROM tournaments WHERE id = tournament_id
    )
  );

CREATE POLICY select_goals ON goals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY modify_goals ON goals
  FOR INSERT, UPDATE, DELETE USING (auth.uid() = user_id);
```

## 5. Notes & Explanations

- Used `UUID` with `gen_random_uuid()` for all primary keys to align with Supabase auth.
- Numeric fields use `NUMERIC(5,2)` and integer counts with `CHECK` constraints for validation.
- Exclusion constraint on `goals` enforces non-overlapping date ranges per user.
- View `goal_progress` aggregates match results into goal windows and computes completion percentage.
- Partitioning deferred; revisit based on growth and performance metrics.