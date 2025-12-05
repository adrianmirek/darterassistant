# API Implementation Plan: Many Matches Support

## Overview

This document outlines the implementation plan for updating models and API objects to support the database schema changes that enable:
1. Multiple match types per tournament (many-to-many relationship)
2. Tournament type classification
3. Opponent tracking (user or free-text name)

## Database Changes Summary

Based on migration `20251203120000_add_tournament_types_and_match_results_columns.sql`:

### New Tables
- `tournament_types` - Lookup table for tournament classification
  - id: SERIAL PRIMARY KEY
  - name: TEXT NOT NULL UNIQUE
  - Seed data: 'Leagues + SKO', 'SKO'

### Modified Tables
- `tournaments` table:
  - Added `tournament_type_id` (INTEGER NOT NULL, FK to tournament_types, default 1)

- `tournament_match_results` table:
  - Added `opponent_id` (UUID, nullable, FK to auth.users)
  - Added `full_name` (TEXT, nullable)

## Implementation Tasks

### 1. Database Types Update

**File**: `src/db/database.types.ts`

**Status**: ⚠️ File appears corrupted with Unicode characters

**Action**: Regenerate database types using Supabase CLI
```bash
npx supabase gen types typescript --local > src/db/database.types.ts
```

**Expected Changes**:
- Add `tournament_types` table type definitions
- Add `tournament_type_id` to tournaments.Row/Insert/Update
- Add `opponent_id` and `full_name` to tournament_match_results.Row/Insert/Update
- Add foreign key relationships

---

### 2. TypeScript Types/DTOs Update

**File**: `src/types.ts`

#### 2.1 Add Tournament Type DTO
```typescript
/**
 * DTO for tournament types (read-only lookup)
 */
export type TournamentTypeDTO = Pick<Tables["tournament_types"]["Row"], "id" | "name">;
```

#### 2.2 Update TournamentSummaryDTO
```typescript
/**
 * Summary view for listing tournaments with aggregated average score
 */
export type TournamentSummaryDTO = Pick<
  Tables["tournaments"]["Row"], 
  "id" | "name" | "date" | "tournament_type_id"
> & {
  average_score: number;
  tournament_type_name?: string; // Optional: include type name for display
};
```

#### 2.3 Update TournamentResultDTO
```typescript
/**
 * Detailed tournament result entry
 */
export interface TournamentResultDTO {
  match_type_id: number;
  average_score: number;
  first_nine_avg: number;
  checkout_percentage: number;
  score_60_count: number;
  score_100_count: number;
  score_140_count: number;
  score_180_count: number;
  high_finish: number;
  best_leg: number;
  worst_leg: number;
  opponent_id: string | null;      // NEW: UUID of opponent user
  full_name: string | null;        // NEW: Free-text opponent name
}
```

#### 2.4 Update CreateTournamentResultCommand
```typescript
/**
 * Command Model for creating a tournament result
 * Uses snake_case to match database schema
 */
export type CreateTournamentResultCommand = Omit<
  Tables["tournament_match_results"]["Insert"], 
  "id" | "tournament_id"
>;
// This now includes opponent_id and full_name as optional fields
```

#### 2.5 Update CreateTournamentCommand
```typescript
/**
 * Command Model for creating a tournament along with its initial result
 */
export interface CreateTournamentCommand {
  name: Tables["tournaments"]["Insert"]["name"];
  date: Tables["tournaments"]["Insert"]["date"];
  tournament_type_id?: Tables["tournaments"]["Insert"]["tournament_type_id"]; // NEW: Optional, defaults to 1
  result: CreateTournamentResultCommand;
}
```

#### 2.6 Update TournamentDetailDTO
```typescript
/**
 * Detailed view for a single tournament including results
 */
export type TournamentDetailDTO = Pick<
  Tables["tournaments"]["Row"], 
  "id" | "name" | "date" | "tournament_type_id"
> & {
  tournament_type_name?: string;   // NEW: Optional type name for display
  results: TournamentResultDTO[];
};
```

---

### 3. Create Tournament Types Service

**File**: `src/lib/services/tournament-type.service.ts` (NEW)

```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type { TournamentTypeDTO } from "../../types";

type ServiceError = { message: string; code?: string } | null;

/**
 * Fetches all tournament types (lookup data)
 */
export async function getTournamentTypes(
  supabase: SupabaseClient
): Promise<{ data: TournamentTypeDTO[] | null; error: ServiceError }> {
  try {
    const { data, error } = await supabase
      .from("tournament_types")
      .select("id, name")
      .order("id", { ascending: true });

    if (error) {
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (error: any) {
    return { 
      data: null, 
      error: { 
        message: error?.message || "Failed to fetch tournament types",
        code: error?.code
      } 
    };
  }
}
```

---

### 4. Update Tournament Service

**File**: `src/lib/services/tournament.service.ts`

#### 4.1 Update `getTournaments` function
- Add `tournament_type_id` to the select query
- Optionally join with `tournament_types` to include name
```typescript
.select(`
  id,
  name,
  date,
  tournament_type_id,
  tournament_types (
    name
  ),
  tournament_match_results (
    average_score
  )
`)
```

#### 4.2 Update `getTournamentById` function
- Add `tournament_type_id` to the select query
- Add `opponent_id` and `full_name` to match results query
- Optionally join with `tournament_types` to include name
```typescript
.select(`
  id,
  name,
  date,
  tournament_type_id,
  tournament_types (
    name
  ),
  tournament_match_results (
    match_type_id,
    average_score,
    first_nine_avg,
    checkout_percentage,
    score_60_count,
    score_100_count,
    score_140_count,
    score_180_count,
    high_finish,
    best_leg,
    worst_leg,
    opponent_id,
    full_name
  )
`)
```

#### 4.3 Update `createTournament` function
- Accept `tournament_type_id` in the insert (optional, defaults to 1)
- Accept `opponent_id` and `full_name` in result data
```typescript
const { data: tournament, error: tournamentError } = await supabase
  .from("tournaments")
  .insert({
    user_id: userId,
    name: command.name,
    date: command.date,
    tournament_type_id: command.tournament_type_id || 1, // Default to 1
  })
  .select("id, created_at")
  .single();

// In result data:
const resultData = {
  tournament_id: tournament.id,
  match_type_id: command.result.match_type_id,
  // ... other fields ...
  opponent_id: command.result.opponent_id || null,
  full_name: command.result.full_name || null,
};
```

---

### 5. Create Tournament Types API Endpoint

**File**: `src/pages/api/tournament-types/index.ts` (NEW)

```typescript
import type { APIRoute } from "astro";
import type { TournamentTypeDTO } from "../../../types";
import { getTournamentTypes } from "../../../lib/services/tournament-type.service";

export const prerender = false;

/**
 * GET /api/tournament-types
 * Retrieves all tournament types (public lookup data)
 * Does NOT require authentication (lookup data)
 */
export const GET: APIRoute = async ({ locals }) => {
  try {
    // Fetch tournament types using service
    const { data, error } = await getTournamentTypes(locals.supabase);

    if (error) {
      console.error("Error fetching tournament types:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const tournamentTypes: TournamentTypeDTO[] = data || [];

    return new Response(JSON.stringify(tournamentTypes), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in GET /api/tournament-types:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

---

### 6. Update Tournaments API Endpoints

#### 6.1 Update `src/pages/api/tournaments/index.ts`

**POST /api/tournaments - Update validation schema**:
```typescript
// Update createTournamentResultSchema to include new fields
const createTournamentResultSchema = z.object({
  match_type_id: z.number().int().positive(),
  average_score: z.number().nonnegative(),
  first_nine_avg: z.number().nonnegative(),
  checkout_percentage: z.number().min(0).max(100),
  score_60_count: z.number().int().min(0),
  score_100_count: z.number().int().min(0),
  score_140_count: z.number().int().min(0),
  score_180_count: z.number().int().min(0),
  high_finish: z.number().int().min(0),
  best_leg: z.number().int().min(0),
  worst_leg: z.number().int().min(0),
  opponent_id: z.string().uuid().nullable().optional(),     // NEW
  full_name: z.string().max(255).nullable().optional(),     // NEW
});

// Update createTournamentSchema to include tournament_type_id
const createTournamentSchema = z.object({
  name: z.string().min(1).max(255),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tournament_type_id: z.number().int().positive().optional(), // NEW: Optional, defaults to 1
  result: createTournamentResultSchema,
});
```

**GET /api/tournaments - No changes needed** (service will return updated data)

#### 6.2 Update `src/pages/api/tournaments/[id].ts`

**GET /api/tournaments/:id - No changes needed** (service will return updated data)

---

### 7. Additional Considerations

#### 7.1 Validation Rules
- `opponent_id` and `full_name` are mutually optional (can have one, both, or neither)
- If `opponent_id` is provided, validate it exists in auth.users
- If `full_name` is provided, validate max length (255 characters)
- `tournament_type_id` defaults to 1 if not provided

#### 7.2 Error Handling
- Foreign key violations for invalid `tournament_type_id` → 400 Bad Request
- Foreign key violations for invalid `opponent_id` → 400 Bad Request
- Invalid UUID format for `opponent_id` → 400 Bad Request

#### 7.3 Backward Compatibility
- All new fields are optional in POST requests
- Existing API clients will continue to work without providing new fields
- GET responses include new fields (clients should ignore unknown fields)

---

## Implementation Order

1. **First**: Regenerate `database.types.ts` using Supabase CLI
2. **Second**: Update `src/types.ts` with new DTOs and updated interfaces
3. **Third**: Create `tournament-type.service.ts`
4. **Fourth**: Update `tournament.service.ts` 
5. **Fifth**: Create `src/pages/api/tournament-types/index.ts`
6. **Sixth**: Update `src/pages/api/tournaments/index.ts` (validation schemas)
7. **Seventh**: Test all endpoints with new fields
8. **Eighth**: Update any frontend components that consume these APIs

---

## Testing Checklist

### Tournament Types API
- [ ] GET /api/tournament-types returns all types
- [ ] Response includes id and name fields
- [ ] Returns 200 status

### Tournaments API - CREATE
- [ ] POST with tournament_type_id works
- [ ] POST without tournament_type_id defaults to 1
- [ ] POST with invalid tournament_type_id returns 400
- [ ] POST with opponent_id works
- [ ] POST with invalid opponent_id (UUID) returns 400
- [ ] POST with full_name works
- [ ] POST with both opponent_id and full_name works

### Tournaments API - READ
- [ ] GET /api/tournaments includes tournament_type_id
- [ ] GET /api/tournaments/:id includes tournament_type_id
- [ ] GET /api/tournaments/:id results include opponent_id and full_name

---

## Assumptions

1. **Tournament Types**: Only used for classification; doesn't change business logic
2. **Opponent Data**: Either opponent_id OR full_name can be provided, both are optional
3. **Backward Compatibility**: Existing tournament data (without opponent info) remains valid
4. **Authentication**: Tournament types endpoint is public (no auth required for lookup data)
5. **Default Behavior**: If no tournament_type_id provided, defaults to 1 ('Leagues + SKO')

---

## Future Enhancements (Not in Scope)

- Validation to ensure opponent_id belongs to an actual user
- API to search/autocomplete opponent names
- Statistics aggregated by opponent
- Filtering tournaments by tournament_type_id
- Custom tournament types (currently only seeded types)

