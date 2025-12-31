# REST API Plan: Tournaments List with Pagination

## Overview

This document outlines the REST API design for retrieving paginated tournament lists with aggregated statistics and match details.

## Tech Stack Considerations

- **Astro 5**: API routes in `src/pages/api` directory
- **TypeScript 5**: Strong typing for request/response models
- **Supabase**: Database client for function calls and authentication
- **Security**: User authentication via Supabase sessions

---

## API Endpoint Specification

### 1. Get Tournaments (Paginated)

Retrieves a paginated list of tournaments for the authenticated user with aggregated statistics and match details.

#### Endpoint Details

```
GET /api/tournaments
```

#### Authentication

- **Required**: Yes
- **Method**: Supabase session cookie
- **Scope**: Authenticated users only

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `start_date` | ISO 8601 Date | Yes | - | Start of date range filter (YYYY-MM-DD) |
| `end_date` | ISO 8601 Date | Yes | - | End of date range filter (YYYY-MM-DD) |
| `page_size` | Integer | No | 20 | Number of records per page (1-100) |
| `page` | Integer | No | 1 | Page number (1-based indexing) |

#### Request Example

```http
GET /api/tournaments/list?start_date=2024-01-01&end_date=2024-12-31&page_size=20&page=1
```

#### Response Schema

**Success Response (200 OK)**

```typescript
{
  "success": true,
  "data": {
    "tournaments": TournamentListItem[],
    "pagination": {
      "current_page": number,
      "page_size": number,
      "total_count": number,
      "total_pages": number,
      "has_next_page": boolean,
      "has_previous_page": boolean
    }
  }
}
```

**TournamentListItem Type**

```typescript
{
  "tournament_id": string,          // UUID
  "tournament_name": string,
  "tournament_date": string,        // ISO 8601 date
  "final_place": number | null,
  "tournament_type": string,
  "ai_feedback": string | null,
  
  // Aggregated Statistics
  "statistics": {
    "tournament_avg": number,       // Average score across all matches
    "total_180s": number,
    "total_140_plus": number,
    "total_100_plus": number,
    "total_60_plus": number,
    "avg_checkout_percentage": number,
    "best_high_finish": number,
    "best_leg": number
  },
  
  // Match Details
  "matches": MatchDetail[]
}
```

**MatchDetail Type**

```typescript
{
  "match_id": string,               // UUID
  "opponent": string,
  "result": string,                 // Format: "3-2"
  "player_score": number,
  "opponent_score": number,
  "match_type": string,
  "average_score": number,
  "first_nine_avg": number,
  "checkout_percentage": number,
  "high_finish": number,
  "score_180s": number,
  "score_140_plus": number,
  "score_100_plus": number,
  "score_60_plus": number,
  "best_leg": number,
  "worst_leg": number,
  "created_at": string              // ISO 8601 timestamp
}
```

#### Error Responses

**400 Bad Request - Invalid Parameters**

```typescript
{
  "success": false,
  "error": {
    "code": "INVALID_PARAMETERS",
    "message": "Invalid query parameters",
    "details": {
      "start_date": "Required field missing",
      "page_size": "Must be between 1 and 100"
    }
  }
}
```

**401 Unauthorized - Not Authenticated**

```typescript
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**500 Internal Server Error**

```typescript
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred",
    "details": "Error message for debugging (only in development)"
  }
}
```

---

## Implementation Details

### File Structure

```
src/
├── pages/
│   └── api/
│       └── tournaments.ts         # Main endpoint implementation
├── types.ts                       # Shared TypeScript types
├── lib/
│   ├── api/
│   │   ├── tournaments.service.ts # Business logic
│   │   └── validators.ts          # Request validation
│   └── utils/
│       ├── api-response.ts        # Response formatting utilities
│       └── pagination.ts          # Pagination helpers
└── db/
    ├── client.ts                  # Supabase client
    └── types.ts                   # Database types
```

### Type Definitions (src/types.ts)

```typescript
// Tournament List DTOs
export interface TournamentListItem {
  tournament_id: string;
  tournament_name: string;
  tournament_date: string;
  final_place: number | null;
  tournament_type: string;
  ai_feedback: string | null;
  statistics: TournamentStatistics;
  matches: MatchDetail[];
}

export interface TournamentStatistics {
  tournament_avg: number;
  total_180s: number;
  total_140_plus: number;
  total_100_plus: number;
  total_60_plus: number;
  avg_checkout_percentage: number;
  best_high_finish: number;
  best_leg: number;
}

export interface MatchDetail {
  match_id: string;
  opponent: string;
  result: string;
  player_score: number;
  opponent_score: number;
  match_type: string;
  average_score: number;
  first_nine_avg: number;
  checkout_percentage: number;
  high_finish: number;
  score_180s: number;
  score_140_plus: number;
  score_100_plus: number;
  score_60_plus: number;
  best_leg: number;
  worst_leg: number;
  created_at: string;
}

export interface PaginationMetadata {
  current_page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Request Query Parameters
export interface GetTournamentsPaginatedQuery {
  start_date: string;
  end_date: string;
  page_size?: number;
  page?: number;
}
```

### Validation Rules

#### Query Parameters Validation

1. **start_date**
   - Required: Yes
   - Format: ISO 8601 date (YYYY-MM-DD)
   - Validation: Must be a valid date

2. **end_date**
   - Required: Yes
   - Format: ISO 8601 date (YYYY-MM-DD)
   - Validation: Must be a valid date and >= start_date

3. **page_size**
   - Required: No
   - Default: 20
   - Range: 1 to 100
   - Validation: Must be a positive integer

4. **page**
   - Required: No
   - Default: 1
   - Range: >= 1
   - Validation: Must be a positive integer

### Database Function Mapping

The API endpoint will call the `get_tournaments_paginated` database function with the following parameter mapping:

| API Parameter | DB Function Parameter | Transformation |
|---------------|----------------------|----------------|
| User from session | `p_user_id` | Extract from Supabase auth |
| `start_date` | `p_start_date` | Parse ISO date to DATE |
| `end_date` | `p_end_date` | Parse ISO date to DATE |
| `page_size` | `p_page_size` | Direct mapping (default: 20) |
| `page` | `p_page_number` | Direct mapping (default: 1) |

### Response Transformation

The database function returns snake_case fields, which are preserved in the API response (consistent with existing codebase):

```typescript
// Database row transformation
tournament_id        → tournament_id
tournament_name      → tournament_name
tournament_date      → tournament_date
final_place          → final_place
tournament_type_name → tournament_type
ai_feedback          → ai_feedback
tournament_avg       → statistics.tournament_avg
total_180s           → statistics.total_180s
total_140_plus       → statistics.total_140_plus
total_100_plus       → statistics.total_100_plus
total_60_plus        → statistics.total_60_plus
avg_checkout_percentage → statistics.avg_checkout_percentage
best_high_finish     → statistics.best_high_finish
best_leg             → statistics.best_leg
matches              → matches (JSONB array)
total_count          → pagination.total_count
```

### Pagination Metadata Calculation

```typescript
const total_pages = Math.ceil(total_count / page_size);
const has_next_page = current_page < total_pages;
const has_previous_page = current_page > 1;
```

---

## Security Considerations

### Authentication & Authorization

1. **Session Validation**
   - Validate Supabase session from cookies
   - Extract user ID from authenticated session
   - Return 401 if not authenticated

2. **Row-Level Security**
   - Database function uses `SECURITY DEFINER`
   - Ensures users can only access their own tournaments
   - User ID filtering happens at database level

### Input Validation

1. **SQL Injection Prevention**
   - Use parameterized queries via Supabase client
   - Validate all input types before database call

2. **Date Range Validation**
   - Validate date format and logical constraints
   - Prevent excessively large date ranges (e.g., max 5 years)

3. **Pagination Boundaries**
   - Enforce maximum page size (100)
   - Validate positive integers for page numbers

### Rate Limiting

Consider implementing rate limiting for API endpoints:
- Limit: 100 requests per minute per user
- Use middleware or edge function for enforcement

---

## Error Handling Strategy

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_PARAMETERS` | 400 | Invalid or missing query parameters |
| `INVALID_DATE_RANGE` | 400 | End date is before start date |
| `UNAUTHORIZED` | 401 | User not authenticated |
| `FORBIDDEN` | 403 | User doesn't have access |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `DATABASE_ERROR` | 500 | Database operation failed |

### Error Response Format

All errors follow the consistent format:

```typescript
{
  success: false,
  error: {
    code: string,        // Machine-readable error code
    message: string,     // Human-readable error message
    details?: unknown    // Additional context (only in development)
  }
}
```

---

## Performance Considerations

### Database Optimization

1. **Indexing**
   - Ensure indexes on: `tournaments.user_id`, `tournaments.date`
   - Composite index on `(user_id, date)` for filtered queries

2. **Query Efficiency**
   - Function uses CTEs for efficient aggregation
   - JSONB aggregation for match details
   - Single database round-trip

3. **Pagination Strategy**
   - Offset/limit pagination (good for small datasets)
   - Consider cursor-based pagination for large datasets

### Caching Strategy

1. **Response Caching**
   - Cache tournament lists per user
   - Cache key: `tournaments:${userId}:${startDate}:${endDate}:${page}:${pageSize}`
   - TTL: 5 minutes (tournaments don't change frequently)

2. **Cache Invalidation**
   - Invalidate on tournament creation/update/delete
   - Pattern-based invalidation: `tournaments:${userId}:*`

### Response Optimization

1. **Field Selection**
   - Current: Returns all fields
   - Future: Consider sparse fieldsets (`?fields=...`)

2. **Compression**
   - Enable gzip/brotli compression for API responses
   - Significant savings for JSONB match arrays

---

## Testing Strategy

### Unit Tests

1. **Validation Functions**
   - Test date format validation
   - Test pagination parameter validation
   - Test edge cases (negative numbers, invalid dates)

2. **Transformation Functions**
   - Test snake_case to camelCase conversion
   - Test pagination metadata calculation
   - Test JSONB match array transformation

### Integration Tests

1. **API Endpoint Tests (Supertest)**
   - Test successful paginated response
   - Test with various page sizes
   - Test date range filtering
   - Test authentication requirement
   - Test error responses

2. **Database Function Tests**
   - Test with sample tournament data
   - Verify aggregation calculations
   - Test pagination accuracy

### E2E Tests (Playwright)

1. **User Workflows**
   - Load tournaments list page
   - Verify pagination controls
   - Test date range filtering
   - Verify tournament details display

---

## Future Enhancements

### Sorting

Add sorting capability:
```
?sortBy=date&sortOrder=desc
?sortBy=tournamentAvg&sortOrder=desc
```

### Additional Filters

```
?tournamentType=League
?finalPlace=1
?minAverage=75
```

### Export Functionality

```
GET /api/tournaments/export?format=csv&startDate=...&endDate=...
```

### Search

```
?search=tournament_name
```

### Sparse Fieldsets

```
?fields=tournamentId,tournamentName,statistics
```

---

## API Versioning

Current: No versioning (initial release)

Future strategy:
- URL versioning: `/api/v1/tournaments`
- Header versioning: `Accept: application/vnd.darterassistant.v1+json`

Recommendation: Implement versioning from the start for future-proofing.

---

## Documentation

### OpenAPI Specification

Generate OpenAPI 3.0 specification for:
- Interactive API documentation
- Client SDK generation
- API testing tools

### API Changelog

Maintain changelog for API modifications:
- Breaking changes
- New features
- Deprecations
- Bug fixes

---

## Monitoring & Logging

### Metrics to Track

1. **Performance Metrics**
   - Response time (p50, p95, p99)
   - Database query duration
   - Cache hit rate

2. **Usage Metrics**
   - Request count per endpoint
   - Most common date ranges
   - Average page size requested

3. **Error Metrics**
   - Error rate by error code
   - 4xx vs 5xx errors
   - Failed authentication attempts

### Logging Strategy

Log the following for each request:
- Request ID (for tracing)
- User ID
- Query parameters
- Response status
- Duration
- Errors (with stack traces)

---

## Implementation Checklist

- [ ] Define TypeScript types in `src/types.ts`
- [ ] Create Supabase client wrapper in `src/db/client.ts`
- [ ] Implement validation utilities in `src/lib/api/validators.ts`
- [ ] Create transformation helpers in `src/lib/utils/pagination.ts`
- [ ] Implement service layer in `src/lib/api/tournaments.service.ts`
- [ ] Create API endpoint in `src/pages/api/tournaments.ts`
- [ ] Write unit tests for validators and transformers
- [ ] Write integration tests with Supertest
- [ ] Add error handling and logging
- [ ] Implement rate limiting (if required)
- [ ] Generate OpenAPI specification
- [ ] Add monitoring and metrics
- [ ] Write API documentation
- [ ] Test with Playwright (E2E)
- [ ] Security audit

---

## Related Documentation

- Database Schema: `9-database-schema-creation.md`
- Database Functions: `20251231000000_add_get_tournaments_paginated_function.sql`
- Tech Stack: `12-tech-stack.md`
- Authentication Flow: (TBD)
- Frontend Integration: (TBD)

