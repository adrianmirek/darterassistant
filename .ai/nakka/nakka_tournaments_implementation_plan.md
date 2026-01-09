# Nakka Tournament Import - Implementation Plan

**Project:** Darter Assistant  
**Feature:** Import completed tournaments from Nakka 01 (n01darts.com)  
**Date:** 2026-01-03  
**Status:** Planning Phase

---

## 1. Executive Summary

This plan describes the implementation of a feature to import completed tournament data from the Nakka 01 platform (n01darts.com) into the Darter Assistant database. The system will allow manual triggering via a dedicated admin view, scrape tournament lists by keyword, and persist data to the database for later match-level processing.

**Key Principles:**
- **No Prisma ORM**: Use existing Supabase client and raw SQL migrations
- **Idempotent Operations**: Safe to re-run imports without duplicates
- **Manual Trigger**: Admin view with React component (no cron jobs)
- **Future-Ready**: Prepare for subsequent match/leg detail scraping

---

## 2. Technology Stack Verification

### ✅ Existing Stack (Use These)
- **Database**: Supabase (PostgreSQL)
- **Database Client**: `@supabase/supabase-js` via `src/db/supabase.client.ts`
- **Database Migrations**: Supabase migrations in `supabase/migrations/*.sql`
- **API Framework**: Astro API routes (`src/pages/api`)
- **Validation**: Zod schemas
- **Frontend**: React 19 components
- **HTTP Client**: Native `fetch` API
- **Type Safety**: TypeScript with database types from `src/db/database.types.ts`

### ❌ NOT Using
- **Prisma ORM**: NOT needed - use Supabase client
- **Axios**: Use native `fetch`
- **Cheerio**: Use native browser or server-side parsing (see options below)
- **DayJS**: Use native `Date` or `date-fns` (already in package.json)

### 📦 Required New Dependencies
```json
{
  "cheerio": "^1.0.0",     // For HTML parsing
  "pino": "^8.17.2"         // For structured logging (optional)
}
```

---

## 3. Database Schema

### 3.1 New Schema: `nakka`

Create a new PostgreSQL schema to isolate Nakka-related data:

```sql
CREATE SCHEMA IF NOT EXISTS nakka;
```

### 3.2 Table: `nakka.tournaments`

Stores tournament metadata scraped from Nakka 01.

```sql
CREATE TABLE IF NOT EXISTS nakka.tournaments (
  -- Primary key
  tournament_id SERIAL PRIMARY KEY,
  
  -- Nakka-specific identifier (unique constraint)
  nakka_identifier TEXT NOT NULL UNIQUE,
  
  -- Tournament metadata
  tournament_date TIMESTAMPTZ NOT NULL,
  tournament_name TEXT NOT NULL,
  href TEXT NOT NULL,
  
  -- Import metadata
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Status tracking for future match imports
  match_import_status TEXT CHECK (match_import_status IN ('in_progress', 'completed', 'failed')),
  match_import_error TEXT,
  
  -- Indexes
  CONSTRAINT valid_date CHECK (tournament_date <= NOW())
);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_nakka_tournaments_date 
  ON nakka.tournaments (tournament_date DESC);

-- Index for identifier lookups
CREATE INDEX IF NOT EXISTS idx_nakka_tournaments_identifier 
  ON nakka.tournaments (nakka_identifier);

-- Index for status-based queries (future use)
CREATE INDEX IF NOT EXISTS idx_nakka_tournaments_status 
  ON nakka.tournaments (match_import_status) 
  WHERE match_import_status IS NOT NULL;
```

### 3.3 Future Tables (Not Implemented Now)

Document placeholders for Phase 2:

```sql
-- Phase 2: Match-level data
-- CREATE TABLE nakka.tournament_matches (...);

-- Phase 3: Leg-level data
-- CREATE TABLE nakka.match_legs (...);

-- Phase 4: Player mapping
-- CREATE TABLE nakka.player_mappings (...);
```

---

## 4. TypeScript Types

### 4.1 Update `src/types.ts`

Add Nakka-specific DTOs:

```typescript
/**
 * Nakka Tournament Entity (from database)
 */
export interface NakkaTournamentEntity {
  tournament_id: number;
  nakka_identifier: string;
  tournament_date: string;
  tournament_name: string;
  href: string;
  imported_at: string;
  last_updated: string;
  match_import_status: 'in_progress' | 'completed' | 'failed' | null;
  match_import_error: string | null;
}

/**
 * DTO for Nakka tournament scraped from HTML
 */
export interface NakkaTournamentScrapedDTO {
  nakka_identifier: string;
  tournament_name: string;
  href: string;
  tournament_date: Date;
  status: 'completed' | 'preparing' | 'ongoing';
}

/**
 * Command for importing Nakka tournaments
 */
export interface ImportNakkaTournamentsCommand {
  keyword: string;
}

/**
 * Response from import operation
 */
export interface ImportNakkaTournamentsResponseDTO {
  inserted: number;
  updated: number;
  skipped: number;
  total_processed: number;
  tournaments: Array<{
    nakka_identifier: string;
    tournament_name: string;
    tournament_date: string;
    action: 'inserted' | 'updated' | 'skipped';
  }>;
}
```

### 4.2 Update `src/db/database.types.ts`

After creating the migration, regenerate types:

```bash
npx supabase gen types typescript --local > src/db/database.types.ts
```

This will automatically include the new `nakka` schema types.

---

## 5. Service Layer

### 5.1 File: `src/lib/services/nakka.service.ts`

Core business logic for Nakka imports.

**Key Functions:**

```typescript
/**
 * Scrapes tournaments from Nakka 01 by keyword
 * @param keyword - Search keyword (e.g., "agawa")
 * @returns Array of scraped tournament DTOs
 */
export async function scrapeTournamentsByKeyword(
  keyword: string
): Promise<NakkaTournamentScrapedDTO[]>

/**
 * Persists scraped tournaments to database (upsert)
 * @param supabase - Supabase client instance
 * @param tournaments - Array of scraped tournaments
 * @returns Import statistics
 */
export async function importTournaments(
  supabase: SupabaseClient,
  tournaments: NakkaTournamentScrapedDTO[]
): Promise<ImportNakkaTournamentsResponseDTO>

/**
 * Main orchestration function
 * @param supabase - Supabase client instance
 * @param keyword - Search keyword
 * @returns Import statistics
 */
export async function syncTournamentsByKeyword(
  supabase: SupabaseClient,
  keyword: string
): Promise<ImportNakkaTournamentsResponseDTO>
```

**Implementation Details:**

#### Scraping Logic

```typescript
import * as cheerio from 'cheerio';
import { parse } from 'date-fns';

const NAKKA_BASE_URL = 'https://n01darts.com/n01/tournament';

export async function scrapeTournamentsByKeyword(
  keyword: string
): Promise<NakkaTournamentScrapedDTO[]> {
  const url = `${NAKKA_BASE_URL}/?keyword=${encodeURIComponent(keyword)}`;
  
  // Fetch HTML
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; DarterAssistant/1.0)',
    },
    signal: AbortSignal.timeout(15000), // 15s timeout
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Nakka tournaments: ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const tournaments: NakkaTournamentScrapedDTO[] = [];
  const now = new Date();

  $('#tournament_list_table tbody tr.t_item').each((_, row) => {
    const $row = $(row);
    
    // Extract attributes
    const nakkaId = $row.attr('tdid'); // e.g., "t_WWGB_9024"
    const status = $row.attr('st'); // "40" = Completed
    const name = $row.attr('t')?.trim() || '';
    
    // Extract href
    const hrefPartial = $row.find('a').attr('href'); // "comp.php?id=t_WWGB_9024"
    const href = `${NAKKA_BASE_URL}/${hrefPartial}`;
    
    // Extract and parse date
    const dateText = $row.find('.t_date')
      .text()
      .replace('Start Date:', '')
      .trim(); // "10/01/2026 15:00"
    
    let parsedDate: Date | null = null;
    if (dateText) {
      try {
        parsedDate = parse(dateText, 'dd/MM/yyyy HH:mm', new Date());
      } catch {
        // Skip rows with invalid dates
        return;
      }
    }

    // Filter criteria:
    // 1. Must have valid nakkaId
    // 2. Must be completed (st="40")
    // 3. Must have valid date in the past
    if (
      nakkaId &&
      status === '40' &&
      parsedDate &&
      parsedDate < now
    ) {
      tournaments.push({
        nakka_identifier: nakkaId,
        tournament_name: name,
        href,
        tournament_date: parsedDate,
        status: 'completed',
      });
    }
  });

  return tournaments;
}
```

#### Database Persistence Logic

```typescript
export async function importTournaments(
  supabase: SupabaseClient,
  tournaments: NakkaTournamentScrapedDTO[]
): Promise<ImportNakkaTournamentsResponseDTO> {
  const result: ImportNakkaTournamentsResponseDTO = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    total_processed: tournaments.length,
    tournaments: [],
  };

  for (const tournament of tournaments) {
    // Check if exists
    const { data: existing } = await supabase
      .from('nakka.tournaments')
      .select('tournament_id')
      .eq('nakka_identifier', tournament.nakka_identifier)
      .single();

    if (existing) {
      // Tournament already exists - skip it
      result.skipped++;
      result.tournaments.push({
        nakka_identifier: tournament.nakka_identifier,
        tournament_name: tournament.tournament_name,
        tournament_date: tournament.tournament_date.toISOString(),
        action: 'skipped',
      });
    } else {
      // Insert new record
      const { error } = await supabase
        .from('nakka.tournaments')
        .insert({
          nakka_identifier: tournament.nakka_identifier,
          tournament_name: tournament.tournament_name,
          tournament_date: tournament.tournament_date.toISOString(),
          href: tournament.href,
          match_import_status: null, // Will be set when match import starts
        });

      if (error) {
        console.error('Failed to insert tournament:', error);
        result.skipped++;
        result.tournaments.push({
          nakka_identifier: tournament.nakka_identifier,
          tournament_name: tournament.tournament_name,
          tournament_date: tournament.tournament_date.toISOString(),
          action: 'skipped',
        });
      } else {
        result.inserted++;
        result.tournaments.push({
          nakka_identifier: tournament.nakka_identifier,
          tournament_name: tournament.tournament_name,
          tournament_date: tournament.tournament_date.toISOString(),
          action: 'inserted',
        });
      }
    }
  }

  return result;
}
```

#### Orchestration Function

```typescript
export async function syncTournamentsByKeyword(
  supabase: SupabaseClient,
  keyword: string
): Promise<ImportNakkaTournamentsResponseDTO> {
  // Step 1: Scrape tournaments
  const scraped = await scrapeTournamentsByKeyword(keyword);

  // Step 2: Import to database
  const result = await importTournaments(supabase, scraped);

  return result;
}
```

---

## 6. API Endpoint

### 6.1 File: `src/pages/api/nakka/sync.ts`

POST endpoint to trigger tournament sync.

**Route:** `POST /api/nakka/sync`

**Request Body:**

```json
{
  "keyword": "agawa"
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "inserted": 12,
    "updated": 0,
    "skipped": 4,
    "total_processed": 16,
    "tournaments": [
      {
        "nakka_identifier": "t_WWGB_9024",
        "tournament_name": "Finał Roku Agawa 2025",
        "tournament_date": "2026-01-10T15:00:00.000Z",
        "action": "inserted"
      }
      // ... more tournaments
    ]
  }
}
```

**Implementation:**

```typescript
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { syncTournamentsByKeyword } from '@/lib/services/nakka.service';

export const prerender = false;

// Validation schema
const syncSchema = z.object({
  keyword: z.string().min(1).max(100),
});

/**
 * POST /api/nakka/sync
 * Triggers tournament import from Nakka 01 by keyword
 */
export const POST: APIRoute = async ({ locals, request }) => {
  try {
    // Authentication check
    if (!locals.user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const validation = syncSchema.safeParse(body);
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: validation.error.errors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { keyword } = validation.data;

    // Execute sync
    const result = await syncTournamentsByKeyword(locals.supabase, keyword);

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in POST /api/nakka/sync:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
```

---

## 7. Admin View (UI) - Out of Scope for Now

**Note:** As per user requirement, UI implementation is excluded from this plan.

**Placeholder for future reference:**
- File: `src/pages/admin/nakka-sync.astro`
- Component: `src/components/nakka/NakkaSyncForm.tsx`
- Route: `/admin/nakka-sync` (protected by auth middleware)

---

## 8. Database Migration

### 8.1 File: `supabase/migrations/20260103000000_create_nakka_schema.sql`

```sql
-- =====================================================================
-- Migration: Create Nakka Schema and Tables
-- Purpose: Store tournament data imported from Nakka 01 platform
-- Date: 2026-01-03
-- =====================================================================

-- Create nakka schema
CREATE SCHEMA IF NOT EXISTS nakka;

-- Create tournaments table in nakka schema
CREATE TABLE IF NOT EXISTS nakka.tournaments (
  -- Primary key
  tournament_id SERIAL PRIMARY KEY,
  
  -- Nakka-specific identifier (unique constraint)
  nakka_identifier TEXT NOT NULL UNIQUE,
  
  -- Tournament metadata
  tournament_date TIMESTAMPTZ NOT NULL,
  tournament_name TEXT NOT NULL,
  href TEXT NOT NULL,
  
  -- Import metadata
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Status tracking for future match imports
  match_import_status TEXT 
    CHECK (match_import_status IN ('in_progress', 'completed', 'failed')),
  match_import_error TEXT,
  
  -- Constraints
  CONSTRAINT valid_date CHECK (tournament_date <= NOW())
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_nakka_tournaments_date 
  ON nakka.tournaments (tournament_date DESC);

CREATE INDEX IF NOT EXISTS idx_nakka_tournaments_identifier 
  ON nakka.tournaments (nakka_identifier);

CREATE INDEX IF NOT EXISTS idx_nakka_tournaments_status 
  ON nakka.tournaments (match_import_status) 
  WHERE match_import_status IS NOT NULL;

-- Add comment
COMMENT ON TABLE nakka.tournaments IS 'Stores tournament metadata imported from Nakka 01 platform (n01darts.com)';
COMMENT ON COLUMN nakka.tournaments.nakka_identifier IS 'Unique identifier from Nakka platform (e.g., t_WWGB_9024)';
COMMENT ON COLUMN nakka.tournaments.match_import_status IS 'Tracks whether match-level data has been imported for this tournament (NULL = not started, in_progress, completed, failed)';
```

### 8.2 Apply Migration

```bash
# Local development
npx supabase migration up

# Regenerate TypeScript types
npx supabase gen types typescript --local > src/db/database.types.ts
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

**File:** `src/lib/services/nakka.service.test.ts`

Test cases:
- ✅ `scrapeTournamentsByKeyword` parses HTML correctly
- ✅ `scrapeTournamentsByKeyword` filters completed tournaments only
- ✅ `scrapeTournamentsByKeyword` filters past dates only
- ✅ `importTournaments` inserts new tournaments
- ✅ `importTournaments` skips existing tournaments (no updates)
- ✅ `importTournaments` handles invalid tournaments gracefully

### 9.2 Integration Tests

**File:** `e2e/nakka/sync-tournaments.spec.ts`

Test cases:
- ✅ POST `/api/nakka/sync` requires authentication
- ✅ POST `/api/nakka/sync` validates request body
- ✅ POST `/api/nakka/sync` imports tournaments successfully
- ✅ POST `/api/nakka/sync` skips existing tournaments (no duplicates)
- ✅ POST `/api/nakka/sync` handles network errors gracefully

### 9.3 Manual Testing Checklist

- [ ] Verify scraping works with keyword "agawa"
- [ ] Verify only completed tournaments are imported
- [ ] Verify only past-dated tournaments are imported
- [ ] Verify insert-only logic works (existing tournaments are skipped)
- [ ] Verify database constraints prevent invalid data
- [ ] Verify API returns correct statistics

---

## 10. Configuration

### 10.1 Environment Variables

No new environment variables required. Uses existing Supabase configuration.

### 10.2 Constants

**File:** `src/lib/constants/nakka.constants.ts`

```typescript
export const NAKKA_BASE_URL = 'https://n01darts.com/n01/tournament';
export const NAKKA_REQUEST_TIMEOUT_MS = 15000;
export const NAKKA_USER_AGENT = 'Mozilla/5.0 (compatible; DarterAssistant/1.0)';

export const NAKKA_STATUS_CODES = {
  COMPLETED: '40',
  PREPARING: '10',
  ONGOING: '20',
} as const;
```

---

## 11. Error Handling

### 11.1 Service Layer

```typescript
export class NakkaSyncError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'NakkaSyncError';
  }
}

// Usage
throw new NakkaSyncError(
  'Failed to parse tournament date',
  'INVALID_DATE',
  { dateText: '10/13/2026' }
);
```

### 11.2 API Layer

- `401`: Authentication required
- `400`: Validation failed
- `500`: Internal server error (with error message)
- `503`: Nakka service unavailable

---

## 12. Security Considerations

### 12.1 Rate Limiting

**Recommendation:** Add rate limiting to prevent abuse:

```typescript
// Future: Add rate limiting middleware
// Max 10 requests per user per hour
```

### 12.2 Input Sanitization

- Keyword is validated via Zod (max 100 chars)
- No SQL injection risk (using parameterized queries)
- No XSS risk (data is not rendered directly)

### 12.3 Authentication

- API endpoint requires authenticated user
- Future: Add role-based access control (admin only)

---

## 13. Performance Considerations

### 13.1 Optimization Strategies

1. **Batch Inserts**: Consider using batch insert for multiple tournaments (Supabase supports this)
2. **Existence Check Optimization**: Use `COUNT(*)` query instead of fetching full records
3. **Concurrent Requests**: If scraping multiple keywords, use `Promise.all()`
4. **Connection Pooling**: Supabase client handles this automatically
5. **Caching**: Future consideration for frequently searched keywords

### 13.2 Expected Performance

- Scraping 30 tournaments: ~2-3 seconds
- Database upsert of 30 tournaments: ~1-2 seconds
- Total end-to-end: ~5 seconds

---

## 14. Deployment Checklist

### Phase 1: Database Setup
- [ ] Create migration file
- [ ] Test migration locally (`npx supabase migration up`)
- [ ] Apply migration to production Supabase instance
- [ ] Regenerate TypeScript types
- [ ] Verify schema in Supabase Studio

### Phase 2: Backend Implementation
- [ ] Install dependencies (`npm install cheerio`)
- [ ] Implement `nakka.service.ts`
- [ ] Add types to `src/types.ts`
- [ ] Create constants file
- [ ] Implement API endpoint
- [ ] Write unit tests
- [ ] Write integration tests

### Phase 3: Testing
- [ ] Run unit tests (`npm run test`)
- [ ] Run integration tests (`npm run test:e2e`)
- [ ] Manual testing with real Nakka data
- [ ] Verify idempotent behavior

### Phase 4: Documentation
- [ ] Update API documentation
- [ ] Add JSDoc comments to service functions
- [ ] Update project README
- [ ] Create user guide for admin view (future)

### Phase 5: Deployment
- [ ] Merge feature branch to main
- [ ] Deploy to staging environment
- [ ] Smoke test on staging
- [ ] Deploy to production
- [ ] Monitor logs for errors

---

## 15. Future Enhancements (Phase 2+)

### Phase 2: Match-Level Scraping
- Scrape individual match results from tournament detail pages
- Store match-level statistics (players, scores, averages)
- Link to existing `tournaments` table for user integration

### Phase 3: Player Mapping
- Identify Nakka players and map to Darter Assistant users
- Allow users to claim their Nakka profile
- Auto-import personal statistics

### Phase 4: Automated Scheduling
- Background job to sync tournaments daily
- Webhook integration for real-time updates
- Email notifications for new tournaments

### Phase 5: Analytics
- Dashboard showing imported tournament statistics
- Trend analysis across multiple tournaments
- Leaderboards and rankings

---

## 16. Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Nakka HTML structure changes | High | Medium | Add scraping tests, monitor errors |
| Rate limiting by Nakka | Medium | Low | Implement retry logic with backoff |
| Invalid date formats | Medium | Medium | Robust date parsing with fallback |
| Duplicate entries | Low | Low | Unique constraint + skip existing logic |
| Network timeouts | Medium | Medium | Set timeout, handle errors gracefully |

---

## 17. Success Criteria

- ✅ Tournaments can be imported by keyword
- ✅ Only completed, past-dated tournaments are imported
- ✅ No duplicate entries in database (existing tournaments skipped)
- ✅ API returns accurate statistics (inserted/skipped counts)
- ✅ Insert-only operations (safe to re-run, existing untouched)
- ✅ All tests pass
- ✅ Zero SQL injection vulnerabilities
- ✅ Performance: < 10 seconds for 50 tournaments

---

## 18. Open Questions

1. **Access Control**: Should this be admin-only, or allow all authenticated users?
   - **Recommendation**: Admin-only for now
   
2. **Keyword Presets**: Should we provide a list of common keywords?
   - **Recommendation**: Yes, add a dropdown in UI (future)
   
3. **Data Retention**: How long to keep imported tournaments?
   - **Recommendation**: No automatic deletion, manual cleanup via admin tool

4. **Match Import Trigger**: When to trigger Phase 2 (match-level import)?
   - **Recommendation**: Manual trigger per tournament, not automatic

---

## 19. Appendix

### A. Example Nakka HTML Structure

```html
<table id="tournament_list_table" class="tournament_list_table">
  <tbody id="user_body">
    <tr id="" class="t_item" tdid="t_WWGB_9024" st="40" t="Finał Roku Agawa 2025">
      <td class="tournament_item">
        <a href="comp.php?id=t_WWGB_9024">
          <div class="t_date">Start Date: 10/01/2026 15:00</div>
          <div class="t_name">
            Finał Roku Agawa 2025
            <span class="status status_40">Completed</span>
          </div>
        </a>
      </td>
    </tr>
  </tbody>
</table>
```

### B. Database Schema Diagram

```
┌─────────────────────────────────────┐
│ nakka.tournaments                   │
├─────────────────────────────────────┤
│ tournament_id (PK)         SERIAL   │
│ nakka_identifier (UNIQUE)  TEXT     │
│ tournament_date            TIMESTAMPTZ │
│ tournament_name            TEXT     │
│ href                       TEXT     │
│ imported_at                TIMESTAMPTZ │
│ last_updated               TIMESTAMPTZ │
│ match_import_status        TEXT     │
│ match_import_error         TEXT     │
└─────────────────────────────────────┘
```

### C. API Flow Diagram

```
User (Admin) → POST /api/nakka/sync
                    ↓
            Validate Authentication
                    ↓
            Validate Request Body (keyword)
                    ↓
            syncTournamentsByKeyword()
                    ↓
        ┌───────────┴──────────┐
        ↓                      ↓
scrapeTournamentsByKeyword()  importTournaments()
        ↓                      ↓
    Fetch HTML           Upsert to DB
        ↓                      ↓
    Parse with Cheerio   Return Stats
        ↓                      ↓
    Filter & Transform        ↓
        └──────────┬───────────┘
                   ↓
        Return Success Response
```

---

**End of Implementation Plan**

