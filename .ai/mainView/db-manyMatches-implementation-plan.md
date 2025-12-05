You are an AI assistant whose task is to help plan for database, endpoints and finally to the UI. Your goal is to generate a the whole implementation plan for database according to the description provided below.
Please carefully review the following information:


# Database changes
1. The relation between tournaments and tournament_match_results is appropriated - there is a relation one tournaments to many matches. That's fine.
2. Add the table tournament_types in the same way as match_types table:
- id: SERIAL PRIMARY KEY
- name: TEXT NOT NULL UNIQUE  
  *Lookup table for match types (e.g., Leagues + SKO, SKO, DKO)*
3. Add relation to tournament_types table to the table tournament
4. Add two columns opponent_id (nullable, as FK to the auth.users.id) and full_name (nullable) to the table tournament_match_results - full_name column will be updated for opponents that are not yet registered.

## Implementation Plan
1. Create table `tournament_types` with columns:
   - `id`: SERIAL PRIMARY KEY
   - `name`: TEXT NOT NULL UNIQUE
2. Alter `tournaments` to add nullable `tournament_type_id`.
3. Backfill existing `tournaments` rows with default type.
4. Alter `tournament_type_id` to NOT NULL and add FK to `tournament_types(id)`.
5. Alter `tournament_match_results` to add nullable `opponent_id` and `full_name`.
6. Backfill existing `tournament_match_results` rows setting both new columns to NULL.
7. Add FK constraint on `opponent_id` referencing `auth.users(id)`.
8. Test migrations and update ORM models.
