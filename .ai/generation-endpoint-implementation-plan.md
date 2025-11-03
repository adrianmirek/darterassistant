# REST API Implementation Plan

## Table of Contents
1. [Match Types Endpoints](#match-types-endpoints)
2. [Tournaments & Results Endpoints](#tournaments--results-endpoints)
3. [Goals & Progress Endpoints](#goals--progress-endpoints)
4. [Motivational Feedback Endpoint](#motivational-feedback-endpoint)

---

# Match Types Endpoints

## GET /match-types

### 1. Endpoint Overview
Retrieves a list of all available match types (e.g., singles, doubles). This is a public lookup endpoint that returns all records from the `match_types` table.

### 2. Request Details
- **HTTP Method**: GET
- **URL Structure**: `/api/match-types`
- **Parameters**:
  - Required: None
  - Optional: None
- **Request Body**: N/A
- **Authentication**: Not required (public lookup data)

### 3. Used Types
- **Response DTO**: `MatchTypeDTO[]`
  ```typescript
  type MatchTypeDTO = {
    id: number;
    name: string;
  }
  ```

### 4. Response Details
- **Success (200 OK)**:
  ```json
  [
    { "id": 1, "name": "Singles" },
    { "id": 2, "name": "Doubles" }
  ]
  ```

### 5. Data Flow
1. Client sends GET request to `/api/match-types`
2. API endpoint queries `match_types` table using Supabase client from `context.locals`
3. Transform database rows to `MatchTypeDTO[]`
4. Return response with status 200

### 6. Security Considerations
- No authentication required (public lookup data)
- Read-only operation with no user-specific data
- No sensitive information exposed
- Consider rate limiting to prevent abuse

### 7. Error Handling
- **500 Internal Server Error**: Database connection failure
  - Log error details
  - Return generic error message to client

### 8. Performance Considerations
- Table contains minimal records (static lookup data)
- Consider caching response (HTTP cache headers or in-memory cache)
- No pagination needed due to small dataset size

### 9. Implementation Steps
1. Create endpoint file: `src/pages/api/match-types/index.ts`
2. Add `export const prerender = false`
3. Implement GET handler:
   - Get Supabase client from `context.locals.supabase`
   - Query `match_types` table: `select('id, name')`
   - Handle errors with try-catch
   - Map results to `MatchTypeDTO[]`
   - Return JSON response with status 200
4. Test endpoint with different scenarios
5. Add error logging if needed

---

## GET /match-types/:id

### 1. Endpoint Overview
Retrieves a single match type by its ID. Returns 404 if the match type doesn't exist.

### 2. Request Details
- **HTTP Method**: GET
- **URL Structure**: `/api/match-types/[id]`
- **Parameters**:
  - Required: `id` (path parameter, integer)
  - Optional: None
- **Request Body**: N/A
- **Authentication**: Not required (public lookup data)

### 3. Used Types
- **Response DTO**: `MatchTypeDTO`
  ```typescript
  type MatchTypeDTO = {
    id: number;
    name: string;
  }
  ```

### 4. Response Details
- **Success (200 OK)**:
  ```json
  { "id": 1, "name": "Singles" }
  ```
- **Error (404 Not Found)**:
  ```json
  { "error": "Match type not found" }
  ```

### 5. Data Flow
1. Client sends GET request to `/api/match-types/1`
2. Extract `id` from URL params (`context.params.id`)
3. Validate `id` is a valid integer
4. Query `match_types` table with filter `eq('id', id)`
5. If no record found, return 404
6. Transform database row to `MatchTypeDTO`
7. Return response with status 200

### 6. Security Considerations
- Validate `id` parameter is a positive integer
- No authentication required (public lookup data)
- No SQL injection risk (using Supabase client parameterized queries)

### 7. Error Handling
- **400 Bad Request**: Invalid `id` parameter (not a number)
  - Return: `{ "error": "Invalid match type ID" }`
- **404 Not Found**: Match type with given ID doesn't exist
  - Return: `{ "error": "Match type not found" }`
- **500 Internal Server Error**: Database connection failure
  - Log error details
  - Return: `{ "error": "Internal server error" }`

### 8. Performance Considerations
- Single record lookup by primary key (very fast)
- Consider caching individual match type responses
- No complex joins or aggregations

### 9. Implementation Steps
1. Create endpoint file: `src/pages/api/match-types/[id].ts`
2. Add `export const prerender = false`
3. Implement GET handler:
   - Extract `id` from `context.params.id`
   - Validate `id` is a valid positive integer using Zod
   - Get Supabase client from `context.locals.supabase`
   - Query `match_types` table: `select('id, name').eq('id', id).single()`
   - Handle `.single()` error (returns error if not found)
   - Return 404 if no record found
   - Map result to `MatchTypeDTO`
   - Return JSON response with status 200
4. Test endpoint with valid ID, invalid ID, and non-existent ID
5. Add appropriate error handling

---

# Tournaments & Results Endpoints

## GET /tournaments

### 1. Endpoint Overview
Retrieves a paginated list of tournaments belonging to the authenticated user, with optional sorting. Each tournament includes an aggregated average score calculated from all its match results.

### 2. Request Details
- **HTTP Method**: GET
- **URL Structure**: `/api/tournaments`
- **Parameters**:
  - Required: None
  - Optional: 
    - `limit` (query parameter, integer, default: 10, max: 100)
    - `offset` (query parameter, integer, default: 0)
    - `sort` (query parameter, string, enum: `date_asc`, `date_desc`, default: `date_desc`)
- **Request Body**: N/A
- **Authentication**: Required (user must be authenticated)

### 3. Used Types
- **Response DTO**: `TournamentSummaryDTO[]`
  ```typescript
  type TournamentSummaryDTO = {
    id: string;
    name: string;
    date: string;
    average_score: number;
  }
  ```

### 4. Response Details
- **Success (200 OK)**:
  ```json
  [
    {
      "id": "uuid-1",
      "name": "Weekly Tournament",
      "date": "2025-10-15",
      "average_score": 45.50
    }
  ]
  ```
- **Error (401 Unauthorized)**:
  ```json
  { "error": "Authentication required" }
  ```

### 5. Data Flow
1. Client sends GET request to `/api/tournaments?limit=10&offset=0&sort=date_desc`
2. Authenticate user using middleware (check `context.locals.user`)
3. Validate query parameters with Zod schema
4. Query `tournaments` table with:
   - Filter: `eq('user_id', userId)`
   - Join: `tournament_match_results` (to calculate average)
   - Order: Based on `sort` parameter
   - Pagination: `range(offset, offset + limit - 1)`
5. Calculate average score for each tournament from joined results
6. Transform to `TournamentSummaryDTO[]`
7. Return response with status 200

### 6. Security Considerations
- **Authentication**: Required via middleware
- **Authorization**: Filter results by `user_id` (users can only see their own tournaments)
- **Input validation**: Validate all query parameters with Zod
- **SQL injection**: Protected by Supabase client parameterized queries
- **Data leakage**: Ensure RLS (Row Level Security) policies are in place on Supabase

### 7. Error Handling
- **400 Bad Request**: Invalid query parameters
  - Return: `{ "error": "Invalid query parameters", "details": [...] }`
- **401 Unauthorized**: User not authenticated
  - Return: `{ "error": "Authentication required" }`
- **500 Internal Server Error**: Database query failure
  - Log error details
  - Return: `{ "error": "Internal server error" }`

### 8. Performance Considerations
- **Pagination**: Implement proper pagination to limit result set size
- **Indexing**: Ensure `tournaments.user_id` and `tournaments.date` are indexed
- **Aggregation**: Calculate average score efficiently (consider using database aggregation)
- **N+1 queries**: Use single query with join to get results
- **Caching**: Consider short-term caching for frequently accessed data

### 9. Implementation Steps
1. Create endpoint file: `src/pages/api/tournaments/index.ts`
2. Add `export const prerender = false`
3. Implement GET handler:
   - Check authentication: `if (!context.locals.user) return 401`
   - Create Zod schema for query parameters:
     ```typescript
     const querySchema = z.object({
       limit: z.coerce.number().int().positive().max(100).default(10),
       offset: z.coerce.number().int().min(0).default(0),
       sort: z.enum(['date_asc', 'date_desc']).default('date_desc')
     });
     ```
   - Parse and validate query parameters
   - Get Supabase client from `context.locals.supabase`
   - Build query with proper joins and aggregation
   - Apply sorting based on `sort` parameter
   - Apply pagination with `range(offset, offset + limit - 1)`
   - Transform results to `TournamentSummaryDTO[]`
   - Return JSON response with status 200
4. Create service function in `src/lib/services/tournament.service.ts`
5. Test with various query parameters and edge cases
6. Add error logging

---

## GET /tournaments/:id

### 1. Endpoint Overview
Retrieves detailed information about a specific tournament, including all its match results. Only the tournament owner can access this endpoint.

### 2. Request Details
- **HTTP Method**: GET
- **URL Structure**: `/api/tournaments/[id]`
- **Parameters**:
  - Required: `id` (path parameter, UUID)
  - Optional: None
- **Request Body**: N/A
- **Authentication**: Required (user must be authenticated and own the tournament)

### 3. Used Types
- **Response DTO**: `TournamentDetailDTO`
  ```typescript
  type TournamentDetailDTO = {
    id: string;
    name: string;
    date: string;
    results: TournamentResultDTO[];
  }
  
  type TournamentResultDTO = {
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
  }
  ```

### 4. Response Details
- **Success (200 OK)**:
  ```json
  {
    "id": "uuid-1",
    "name": "Weekly Tournament",
    "date": "2025-10-15",
    "results": [
      {
        "match_type_id": 1,
        "average_score": 45.50,
        "first_nine_avg": 48.00,
        "checkout_percentage": 35.50,
        "score_60_count": 5,
        "score_100_count": 3,
        "score_140_count": 1,
        "score_180_count": 0,
        "high_finish": 120,
        "best_leg": 15,
        "worst_leg": 35
      }
    ]
  }
  ```
- **Error (401 Unauthorized)**:
  ```json
  { "error": "Authentication required" }
  ```
- **Error (404 Not Found)**:
  ```json
  { "error": "Tournament not found" }
  ```

### 5. Data Flow
1. Client sends GET request to `/api/tournaments/uuid-1`
2. Authenticate user using middleware
3. Extract and validate `id` from path parameters
4. Query `tournaments` table with:
   - Filter: `eq('id', id).eq('user_id', userId)`
   - Join: `tournament_match_results` to get all results
5. If no tournament found, return 404
6. Transform to `TournamentDetailDTO`
7. Return response with status 200

### 6. Security Considerations
- **Authentication**: Required via middleware
- **Authorization**: Filter by both `id` and `user_id` to ensure ownership
- **Input validation**: Validate `id` is a valid UUID with Zod
- **RLS**: Ensure Row Level Security policies are in place
- **Data exposure**: Only return tournament data owned by authenticated user

### 7. Error Handling
- **400 Bad Request**: Invalid UUID format
  - Return: `{ "error": "Invalid tournament ID format" }`
- **401 Unauthorized**: User not authenticated
  - Return: `{ "error": "Authentication required" }`
- **404 Not Found**: Tournament doesn't exist or user doesn't own it
  - Return: `{ "error": "Tournament not found" }`
- **500 Internal Server Error**: Database query failure
  - Log error details
  - Return: `{ "error": "Internal server error" }`

### 8. Performance Considerations
- **Single query with join**: Fetch tournament and results in one query
- **Indexing**: Primary key lookup is fast, ensure foreign keys are indexed
- **Result count**: Most tournaments have few results, no pagination needed
- **Caching**: Consider caching tournament details with short TTL

### 9. Implementation Steps
1. Create endpoint file: `src/pages/api/tournaments/[id].ts`
2. Add `export const prerender = false`
3. Implement GET handler:
   - Check authentication: `if (!context.locals.user) return 401`
   - Extract `id` from `context.params.id`
   - Validate `id` is a valid UUID using Zod
   - Get Supabase client from `context.locals.supabase`
   - Query tournament with join:
     ```typescript
     const { data, error } = await supabase
       .from('tournaments')
       .select(`
         id,
         name,
         date,
         tournament_match_results (*)
       `)
       .eq('id', id)
       .eq('user_id', context.locals.user.id)
       .single();
     ```
   - If error or no data, return 404
   - Transform nested results to `TournamentResultDTO[]`
   - Map to `TournamentDetailDTO`
   - Return JSON response with status 200
4. Create/update service function in `src/lib/services/tournament.service.ts`
5. Test with valid/invalid IDs and unauthorized access
6. Add error logging

---

## POST /tournaments

### 1. Endpoint Overview
Creates a new tournament with an initial match result in a single transaction. This endpoint combines tournament creation and result submission to match the single-page form UX.

### 2. Request Details
- **HTTP Method**: POST
- **URL Structure**: `/api/tournaments`
- **Parameters**:
  - Required: None
  - Optional: None
- **Request Body**: `CreateTournamentCommand`
  ```json
  {
    "name": "Weekly Tournament",
    "date": "2025-10-15",
    "result": {
      "match_type_id": 1,
      "average_score": 45.50,
      "first_nine_avg": 48.00,
      "checkout_percentage": 35.50,
      "score_60_count": 5,
      "score_100_count": 3,
      "score_140_count": 1,
      "score_180_count": 0,
      "high_finish": 120,
      "best_leg": 15,
      "worst_leg": 35
    }
  }
  ```
- **Authentication**: Required (user must be authenticated)

### 3. Used Types
- **Command Model**: `CreateTournamentCommand`
- **Nested Command**: `CreateTournamentResultCommand`
- **Response DTO**: `CreateTournamentResponseDTO`
  ```typescript
  type CreateTournamentResponseDTO = {
    id: string;
    created_at: string;
  }
  ```

### 4. Response Details
- **Success (201 Created)**:
  ```json
  {
    "id": "uuid-1",
    "createdAt": "2025-10-29T12:34:56.789Z"
  }
  ```
- **Error (400 Bad Request)**:
  ```json
  {
    "error": "Validation failed",
    "details": [
      "average_score must be a positive number",
      "match_type_id is required"
    ]
  }
  ```
- **Error (401 Unauthorized)**:
  ```json
  { "error": "Authentication required" }
  ```

### 5. Data Flow
1. Client sends POST request with tournament and result data
2. Authenticate user using middleware
3. Parse and validate request body with Zod schema
4. Start database transaction
5. Insert tournament record with `user_id` from authenticated user
6. Insert tournament_match_results record with `tournament_id` from step 5
7. Commit transaction
8. Return tournament ID and creation timestamp with status 201
9. Rollback transaction if any step fails

### 6. Security Considerations
- **Authentication**: Required via middleware
- **Authorization**: Automatically associate tournament with authenticated user
- **Input validation**: Comprehensive Zod schema validation for all fields
- **SQL injection**: Protected by Supabase client
- **Data integrity**: Use transaction to ensure atomic operation
- **Foreign key validation**: Verify `matchTypeId` exists before insertion
- **Business rules**: Validate date is not in future (optional constraint)

### 7. Error Handling
- **400 Bad Request**: Validation errors
  - Invalid data types
  - Missing required fields
  - Constraint violations (e.g., negative scores, percentage > 100)
  - Invalid `matchTypeId` (foreign key violation)
  - Return detailed validation errors from Zod
- **401 Unauthorized**: User not authenticated
  - Return: `{ "error": "Authentication required" }`
- **500 Internal Server Error**: Database insertion failure
  - Log error details
  - Return: `{ "error": "Failed to create tournament" }`

### 8. Performance Considerations
- **Transaction**: Keep transaction scope minimal
- **Indexes**: Ensure foreign keys are indexed
- **Validation**: Validate before starting transaction
- **Connection pooling**: Handled by Supabase client
- **Response time**: Should be fast (< 500ms) for single insertion

### 9. Implementation Steps
1. Create endpoint file: `src/pages/api/tournaments/index.ts` (add POST handler)
2. Add `export const prerender = false`
3. Create Zod validation schema:
   ```typescript
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
     worst_leg: z.number().int().min(0)
   });
   
   const createTournamentSchema = z.object({
     name: z.string().min(1).max(255),
     date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
     result: createTournamentResultSchema
   });
   ```
4. Implement POST handler:
   - Check authentication
   - Parse request body: `await context.request.json()`
   - Validate with Zod schema
   - Get Supabase client from `context.locals.supabase`
   - Insert tournament:
     ```typescript
     const { data: tournament, error: tournamentError } = await supabase
       .from('tournaments')
       .insert({
         user_id: context.locals.user.id,
         name: body.name,
         date: body.date
       })
       .select('id, created_at')
       .single();
     ```
   - If error, return 500
   - Insert result:
     ```typescript
     const { error: resultError } = await supabase
       .from('tournament_match_results')
       .insert({
         tournament_id: tournament.id,
         match_type_id: body.result.match_type_id,
         average_score: body.result.average_score,
         // ... other fields
       });
     ```
   - If error, handle foreign key violations (return 400 for invalid match_type_id)
   - Return 201 with `CreateTournamentResponseDTO`
5. Create service function in `src/lib/services/tournament.service.ts`
6. Test with valid/invalid data, missing fields, and constraint violations
7. Add comprehensive error logging

---

# Goals & Progress Endpoints

## GET /goals

### 1. Endpoint Overview
Retrieves a paginated list of goals belonging to the authenticated user.

### 2. Request Details
- **HTTP Method**: GET
- **URL Structure**: `/api/goals`
- **Parameters**:
  - Required: None
  - Optional:
    - `limit` (query parameter, integer, default: 10, max: 100)
    - `offset` (query parameter, integer, default: 0)
- **Request Body**: N/A
- **Authentication**: Required (user must be authenticated)

### 3. Used Types
- **Response DTO**: `GoalDTO[]`
  ```typescript
  type GoalDTO = {
    id: string;
    targetAvg: number;
    startDate: string;
    endDate: string;
    createdAt: string;
  }
  ```

### 4. Response Details
- **Success (200 OK)**:
  ```json
  [
    {
      "id": "uuid-1",
      "target_avg": 50.00,
      "start_date": "2025-10-01",
      "end_date": "2025-12-31",
      "created_at": "2025-10-01T10:00:00.000Z"
    }
  ]
  ```
- **Error (401 Unauthorized)**:
  ```json
  { "error": "Authentication required" }
  ```

### 5. Data Flow
1. Client sends GET request to `/api/goals?limit=10&offset=0`
2. Authenticate user using middleware
3. Validate query parameters with Zod schema
4. Query `goals` table with:
   - Filter: `eq('user_id', userId)`
   - Order: By `created_at DESC`
   - Pagination: `range(offset, offset + limit - 1)`
5. Transform to `GoalDTO[]`
6. Return response with status 200

### 6. Security Considerations
- **Authentication**: Required via middleware
- **Authorization**: Filter by `user_id` (users can only see their own goals)
- **Input validation**: Validate query parameters with Zod
- **RLS**: Ensure Row Level Security policies are in place

### 7. Error Handling
- **400 Bad Request**: Invalid query parameters
  - Return: `{ "error": "Invalid query parameters", "details": [...] }`
- **401 Unauthorized**: User not authenticated
  - Return: `{ "error": "Authentication required" }`
- **500 Internal Server Error**: Database query failure
  - Log error details
  - Return: `{ "error": "Internal server error" }`

### 8. Performance Considerations
- **Pagination**: Limit result set size
- **Indexing**: Ensure `goals.user_id` and `goals.created_at` are indexed
- **Query simplicity**: Straightforward SELECT with filter

### 9. Implementation Steps
1. Create endpoint file: `src/pages/api/goals/index.ts`
2. Add `export const prerender = false`
3. Implement GET handler:
   - Check authentication
   - Create Zod schema for query parameters (limit, offset)
   - Parse and validate query parameters
   - Get Supabase client from `context.locals.supabase`
   - Query goals table with user filter and pagination
   - Transform to `GoalDTO[]` (map snake_case to camelCase)
   - Return JSON response with status 200
4. Create service function in `src/lib/services/goal.service.ts`
5. Test with various pagination parameters
6. Add error logging

---

## GET /goals/:id

### 1. Endpoint Overview
Retrieves detailed information about a specific goal. Only the goal owner can access this endpoint.

### 2. Request Details
- **HTTP Method**: GET
- **URL Structure**: `/api/goals/[id]`
- **Parameters**:
  - Required: `id` (path parameter, UUID)
  - Optional: None
- **Request Body**: N/A
- **Authentication**: Required (user must be authenticated and own the goal)

### 3. Used Types
- **Response DTO**: `GoalDTO`
  ```typescript
  type GoalDTO = {
    id: string;
    targetAvg: number;
    startDate: string;
    endDate: string;
    createdAt: string;
  }
  ```

### 4. Response Details
- **Success (200 OK)**:
  ```json
  {
    "id": "uuid-1",
    "target_avg": 50.00,
    "start_date": "2025-10-01",
    "end_date": "2025-12-31",
    "created_at": "2025-10-01T10:00:00.000Z"
  }
  ```
- **Error (401 Unauthorized)**:
  ```json
  { "error": "Authentication required" }
  ```
- **Error (404 Not Found)**:
  ```json
  { "error": "Goal not found" }
  ```

### 5. Data Flow
1. Client sends GET request to `/api/goals/uuid-1`
2. Authenticate user using middleware
3. Extract and validate `id` from path parameters
4. Query `goals` table with:
   - Filter: `eq('id', id).eq('user_id', userId)`
5. If no goal found, return 404
6. Transform to `GoalDTO`
7. Return response with status 200

### 6. Security Considerations
- **Authentication**: Required via middleware
- **Authorization**: Filter by both `id` and `user_id` to ensure ownership
- **Input validation**: Validate `id` is a valid UUID
- **RLS**: Ensure Row Level Security policies are in place

### 7. Error Handling
- **400 Bad Request**: Invalid UUID format
  - Return: `{ "error": "Invalid goal ID format" }`
- **401 Unauthorized**: User not authenticated
  - Return: `{ "error": "Authentication required" }`
- **404 Not Found**: Goal doesn't exist or user doesn't own it
  - Return: `{ "error": "Goal not found" }`
- **500 Internal Server Error**: Database query failure
  - Log error details
  - Return: `{ "error": "Internal server error" }`

### 8. Performance Considerations
- **Primary key lookup**: Very fast
- **No joins**: Simple single-table query
- **Caching**: Consider caching goal details

### 9. Implementation Steps
1. Create endpoint file: `src/pages/api/goals/[id].ts`
2. Add `export const prerender = false`
3. Implement GET handler:
   - Check authentication
   - Extract and validate `id` (UUID format) with Zod
   - Get Supabase client from `context.locals.supabase`
   - Query goal: `.select('*').eq('id', id).eq('user_id', userId).single()`
   - If no result, return 404
   - Transform to `GoalDTO`
   - Return JSON response with status 200
4. Create/update service function in `src/lib/services/goal.service.ts`
5. Test with valid/invalid IDs and unauthorized access
6. Add error logging

---

## POST /goals

### 1. Endpoint Overview
Creates a new goal for the authenticated user. Validates that the goal doesn't overlap with existing goals (enforced by database exclusion constraint).

### 2. Request Details
- **HTTP Method**: POST
- **URL Structure**: `/api/goals`
- **Parameters**:
  - Required: None
  - Optional: None
- **Request Body**: `CreateGoalCommand`
  ```json
  {
    "target_avg": 50.00,
    "start_date": "2025-11-01",
    "end_date": "2025-12-31"
  }
  ```
- **Authentication**: Required (user must be authenticated)

### 3. Used Types
- **Command Model**: `CreateGoalCommand`
- **Response DTO**: `CreateGoalResponseDTO`
  ```typescript
  type CreateGoalResponseDTO = {
    id: string;
    created_at: string;
  }
  ```

### 4. Response Details
- **Success (201 Created)**:
  ```json
  {
    "id": "uuid-1",
    "createdAt": "2025-10-29T12:34:56.789Z"
  }
  ```
- **Error (400 Bad Request)**:
  ```json
  {
    "error": "Validation failed",
    "details": [
      "target_avg must be a positive number",
      "end_date must be after start_date"
    ]
  }
  ```
- **Error (409 Conflict)**:
  ```json
  {
    "error": "Goal dates overlap with an existing goal"
  }
  ```
- **Error (401 Unauthorized)**:
  ```json
  { "error": "Authentication required" }
  ```

### 5. Data Flow
1. Client sends POST request with goal data
2. Authenticate user using middleware
3. Parse and validate request body with Zod schema
4. Validate business rules (e.g., end date after start date)
5. Insert goal record with `user_id` from authenticated user
6. Handle database exclusion constraint violation (overlapping dates)
7. Return goal ID and creation timestamp with status 201

### 6. Security Considerations
- **Authentication**: Required via middleware
- **Authorization**: Automatically associate goal with authenticated user
- **Input validation**: Comprehensive Zod schema validation
- **Date validation**: Ensure valid date formats and logical date ranges
- **Business rules**: Prevent overlapping goals (handled by DB constraint)

### 7. Error Handling
- **400 Bad Request**: Validation errors
  - Invalid data types
  - Missing required fields
  - `target_avg` is negative or zero
  - `end_date` is before `start_date`
  - Invalid date format
  - Return detailed validation errors from Zod
- **401 Unauthorized**: User not authenticated
  - Return: `{ "error": "Authentication required" }`
- **409 Conflict**: Overlapping goal dates (exclusion constraint violation)
  - Detect Postgres error code: `23P01` (exclusion_violation)
  - Return: `{ "error": "Goal dates overlap with an existing goal" }`
- **500 Internal Server Error**: Database insertion failure
  - Log error details
  - Return: `{ "error": "Failed to create goal" }`

### 8. Performance Considerations
- **Constraint checking**: Database handles overlap detection efficiently
- **Index**: GiST index on date range for exclusion constraint
- **Validation**: Validate dates before database insertion
- **Response time**: Should be fast (< 300ms) for single insertion

### 9. Implementation Steps
1. Create endpoint file: `src/pages/api/goals/index.ts` (add POST handler)
2. Add `export const prerender = false`
3. Create Zod validation schema:
   ```typescript
   const createGoalSchema = z.object({
     target_avg: z.number().positive(),
     start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
     end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
   }).refine(
     (data) => new Date(data.end_date) > new Date(data.start_date),
     { message: "end_date must be after start_date" }
   );
   ```
4. Implement POST handler:
   - Check authentication
   - Parse request body: `await context.request.json()`
   - Validate with Zod schema
   - Get Supabase client from `context.locals.supabase`
   - Insert goal:
     ```typescript
     const { data, error } = await supabase
       .from('goals')
       .insert({
         user_id: context.locals.user.id,
         target_avg: body.target_avg,
         start_date: body.start_date,
         end_date: body.end_date
       })
       .select('id, created_at')
       .single();
     ```
   - If error, check for exclusion constraint violation (error code `23P01`)
   - Return 409 for overlap, 500 for other errors
   - Return 201 with `CreateGoalResponseDTO`
5. Create service function in `src/lib/services/goal.service.ts`
6. Test with valid data, overlapping dates, and invalid dates
7. Add comprehensive error logging

---

## GET /goals/progress

### 1. Endpoint Overview
Retrieves aggregated progress information for all goals belonging to the authenticated user. Uses the `goal_progress` database view.

### 2. Request Details
- **HTTP Method**: GET
- **URL Structure**: `/api/goals/progress`
- **Parameters**:
  - Required: None
  - Optional:
    - `limit` (query parameter, integer, default: 10, max: 100)
    - `offset` (query parameter, integer, default: 0)
- **Request Body**: N/A
- **Authentication**: Required (user must be authenticated)

### 3. Used Types
- **Response DTO**: `GoalProgressDTO[]`
  ```typescript
  type GoalProgressDTO = {
    goalId: string;
    averageScore: number;
    tournamentCount: number;
    progressPercentage: number;
  }
  ```

### 4. Response Details
- **Success (200 OK)**:
  ```json
  [
    {
      "goal_id": "uuid-1",
      "average_score": 47.25,
      "tournament_count": 8,
      "progress_percentage": 94.50
    }
  ]
  ```
- **Error (401 Unauthorized)**:
  ```json
  { "error": "Authentication required" }
  ```

### 5. Data Flow
1. Client sends GET request to `/api/goals/progress?limit=10&offset=0`
2. Authenticate user using middleware
3. Validate query parameters with Zod schema
4. Query `goal_progress` view with:
   - Filter: `eq('user_id', userId)`
   - Pagination: `range(offset, offset + limit - 1)`
5. Transform to `GoalProgressDTO[]`
6. Return response with status 200

### 6. Security Considerations
- **Authentication**: Required via middleware
- **Authorization**: Filter by `user_id` (users can only see their own progress)
- **View security**: Ensure RLS policies apply to the view
- **Input validation**: Validate query parameters

### 7. Error Handling
- **400 Bad Request**: Invalid query parameters
  - Return: `{ "error": "Invalid query parameters", "details": [...] }`
- **401 Unauthorized**: User not authenticated
  - Return: `{ "error": "Authentication required" }`
- **500 Internal Server Error**: Database query failure
  - Log error details
  - Return: `{ "error": "Internal server error" }`

### 8. Performance Considerations
- **Database view**: Pre-computed aggregations improve performance
- **Pagination**: Limit result set size
- **Indexing**: View queries benefit from indexes on underlying tables
- **Caching**: Consider caching progress data with short TTL (1-5 minutes)

### 9. Implementation Steps
1. Create endpoint file: `src/pages/api/goals/progress/index.ts`
2. Add `export const prerender = false`
3. Implement GET handler:
   - Check authentication
   - Create Zod schema for query parameters (limit, offset)
   - Parse and validate query parameters
   - Get Supabase client from `context.locals.supabase`
   - Query `goal_progress` view with user filter and pagination
   - Transform to `GoalProgressDTO[]` (map snake_case to camelCase)
   - Return JSON response with status 200
4. Create service function in `src/lib/services/goal.service.ts`
5. Test with various pagination parameters
6. Add error logging

---

## GET /goals/:id/progress

### 1. Endpoint Overview
Retrieves progress information for a specific goal. Uses the `goal_progress` database view.

### 2. Request Details
- **HTTP Method**: GET
- **URL Structure**: `/api/goals/[id]/progress`
- **Parameters**:
  - Required: `id` (path parameter, UUID)
  - Optional: None
- **Request Body**: N/A
- **Authentication**: Required (user must be authenticated and own the goal)

### 3. Used Types
- **Response DTO**: `GoalProgressDTO`
  ```typescript
  type GoalProgressDTO = {
    goalId: string;
    averageScore: number;
    tournamentCount: number;
    progressPercentage: number;
  }
  ```

### 4. Response Details
- **Success (200 OK)**:
  ```json
  {
    "goal_id": "uuid-1",
    "average_score": 47.25,
    "tournament_count": 8,
    "progress_percentage": 94.50
  }
  ```
- **Error (401 Unauthorized)**:
  ```json
  { "error": "Authentication required" }
  ```
- **Error (404 Not Found)**:
  ```json
  { "error": "Goal not found" }
  ```

### 5. Data Flow
1. Client sends GET request to `/api/goals/uuid-1/progress`
2. Authenticate user using middleware
3. Extract and validate `id` from path parameters
4. Query `goal_progress` view with:
   - Filter: `eq('goal_id', id).eq('user_id', userId)`
5. If no result found, return 404
6. Transform to `GoalProgressDTO`
7. Return response with status 200

### 6. Security Considerations
- **Authentication**: Required via middleware
- **Authorization**: Filter by both `goal_id` and `user_id` to ensure ownership
- **Input validation**: Validate `id` is a valid UUID
- **View security**: Ensure RLS policies apply to the view

### 7. Error Handling
- **400 Bad Request**: Invalid UUID format
  - Return: `{ "error": "Invalid goal ID format" }`
- **401 Unauthorized**: User not authenticated
  - Return: `{ "error": "Authentication required" }`
- **404 Not Found**: Goal doesn't exist or user doesn't own it
  - Return: `{ "error": "Goal not found" }`
- **500 Internal Server Error**: Database query failure
  - Log error details
  - Return: `{ "error": "Internal server error" }`

### 8. Performance Considerations
- **Database view**: Pre-computed aggregations
- **Single record lookup**: Fast query
- **Caching**: Consider caching progress data with short TTL

### 9. Implementation Steps
1. Create endpoint file: `src/pages/api/goals/[id]/progress/index.ts`
2. Add `export const prerender = false`
3. Implement GET handler:
   - Check authentication
   - Extract and validate `id` (UUID format) with Zod
   - Get Supabase client from `context.locals.supabase`
   - Query `goal_progress` view: `.select('*').eq('goal_id', id).eq('user_id', userId).single()`
   - If no result, return 404
   - Transform to `GoalProgressDTO`
   - Return JSON response with status 200
4. Create/update service function in `src/lib/services/goal.service.ts`
5. Test with valid/invalid IDs and unauthorized access
6. Add error logging

---

# Motivational Feedback Endpoint

## POST /tournaments/:id/feedback

### 1. Endpoint Overview
Generates an AI-driven motivational message based on tournament results and optional tone preferences. Uses OpenRouter API to communicate with AI models.

### 2. Request Details
- **HTTP Method**: POST
- **URL Structure**: `/api/tournaments/[id]/feedback`
- **Parameters**:
  - Required: `id` (path parameter, UUID)
  - Optional: None
- **Request Body**: `GenerateFeedbackCommand` (optional)
  ```json
  {
    "tone_preferences": {
      "style": "encouraging",
      "level": "casual"
    }
  }
  ```
- **Authentication**: Required (user must be authenticated and own the tournament)

### 3. Used Types
- **Command Model**: `GenerateFeedbackCommand`
- **Response DTO**: `FeedbackResponseDTO`
  ```typescript
  type FeedbackResponseDTO = {
    message: string;
    tone: string;
  }
  ```

### 4. Response Details
- **Success (200 OK)**:
  ```json
  {
    "message": "Great job! Your average score of 45.5 shows solid improvement. Keep up the excellent work!",
    "tone": "encouraging"
  }
  ```
- **Error (400 Bad Request)**:
  ```json
  {
    "error": "Invalid request body"
  }
  ```
- **Error (401 Unauthorized)**:
  ```json
  { "error": "Authentication required" }
  ```
- **Error (404 Not Found)**:
  ```json
  { "error": "Tournament not found" }
  ```

### 5. Data Flow
1. Client sends POST request to `/api/tournaments/uuid-1/feedback`
2. Authenticate user using middleware
3. Extract and validate `id` from path parameters
4. Parse and validate optional request body (tone preferences)
5. Fetch tournament details with results:
   - Query tournament by ID and user_id
   - Include match results for context
6. If tournament not found, return 404
7. Build AI prompt with tournament data and tone preferences
8. Call OpenRouter API with prompt
9. Parse AI response
10. Return feedback message with status 200

### 6. Security Considerations
- **Authentication**: Required via middleware
- **Authorization**: Verify tournament ownership before processing
- **Input validation**: Validate UUID and optional tone preferences
- **API key security**: Store OpenRouter API key in environment variables
- **Rate limiting**: Implement rate limiting to prevent API abuse
- **Cost control**: Monitor API usage and implement spending limits
- **Data exposure**: Don't send user PII to external AI service
- **Timeout**: Set reasonable timeout for AI API calls

### 7. Error Handling
- **400 Bad Request**: Invalid request body or tone preferences
  - Return: `{ "error": "Invalid request body" }`
- **401 Unauthorized**: User not authenticated
  - Return: `{ "error": "Authentication required" }`
- **404 Not Found**: Tournament doesn't exist or user doesn't own it
  - Return: `{ "error": "Tournament not found" }`
- **500 Internal Server Error**: AI API failure or timeout
  - Log error details (without exposing API keys)
  - Return: `{ "error": "Failed to generate feedback" }`
- **503 Service Unavailable**: OpenRouter API is down
  - Return: `{ "error": "Feedback service temporarily unavailable" }`

### 8. Performance Considerations
- **AI API latency**: Expect 1-5 seconds response time
- **Timeout**: Set timeout to 10 seconds for AI API calls
- **Caching**: Consider caching feedback for same tournament (with cache invalidation)
- **Async processing**: Consider async job queue for long-running requests
- **Fallback**: Provide generic message if AI fails
- **Cost optimization**: Use cost-effective models from OpenRouter

### 9. Implementation Steps
1. Create endpoint file: `src/pages/api/tournaments/[id]/feedback/index.ts`
2. Add `export const prerender = false`
3. Create Zod validation schema for tone preferences:
   ```typescript
   const tonePreferencesSchema = z.record(z.any()).optional();
   const generateFeedbackSchema = z.object({
     tone_preferences: tonePreferencesSchema
   }).optional();
   ```
4. Implement POST handler:
   - Check authentication
   - Extract and validate `id` (UUID format)
   - Parse and validate request body (if present)
   - Get Supabase client from `context.locals.supabase`
   - Fetch tournament with results:
     ```typescript
     const { data: tournament, error } = await supabase
       .from('tournaments')
       .select(`
         *,
         tournament_match_results (*)
       `)
       .eq('id', id)
       .eq('user_id', userId)
       .single();
     ```
   - If no tournament, return 404
   - Build AI prompt with tournament data
   - Call OpenRouter API:
     ```typescript
     const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${import.meta.env.OPENROUTER_API_KEY}`,
         'Content-Type': 'application/json'
       },
       body: JSON.stringify({
         model: 'meta-llama/llama-3.1-8b-instruct:free',
         messages: [{ role: 'user', content: prompt }]
       }),
       signal: AbortSignal.timeout(10000) // 10 second timeout
     });
     ```
   - Parse AI response and extract message
   - Return 200 with `FeedbackResponseDTO`
5. Create service function in `src/lib/services/feedback.service.ts`
6. Create AI service helper in `src/lib/services/ai.service.ts`
7. Test with various tournament data and tone preferences
8. Test error scenarios (API failures, timeouts, invalid tournaments)
9. Add comprehensive error logging (without exposing API keys)
10. Implement rate limiting middleware

---

# Common Implementation Guidelines

## Service Layer Architecture

For each endpoint group, create dedicated service files:
- `src/lib/services/tournament.service.ts` - Tournament-related business logic
- `src/lib/services/goal.service.ts` - Goal-related business logic
- `src/lib/services/feedback.service.ts` - Feedback generation logic
- `src/lib/services/ai.service.ts` - AI API integration

Service functions should:
- Accept Supabase client as parameter
- Handle database operations
- Return typed results
- Throw typed errors
- Be unit testable

## Validation Strategy

Use Zod schemas for all input validation:
- Define schemas at the top of endpoint files or in separate validation files
- Validate query parameters, path parameters, and request bodies
- Return detailed validation errors (field-level errors)
- Catch Zod validation errors and return 400 status

## Error Logging

Implement consistent error logging:
- Log errors with context (user ID, request ID, timestamp)
- Don't log sensitive data (passwords, tokens)
- Use structured logging (JSON format)
- Consider error tracking service (Sentry, etc.)

## Response Format

Standardize response format:
- **Success**: Return data directly or in `{ data: ... }` wrapper
- **Error**: Always return `{ error: string, details?: any }` format
- Use appropriate HTTP status codes
- Include timestamps where relevant

## Authentication Flow

Middleware handles authentication:
- User information available in `context.locals.user`
- Supabase client available in `context.locals.supabase`
- Check authentication at the start of each protected endpoint
- Return 401 if user is not authenticated

## Database Best Practices

- Use Supabase client from `context.locals.supabase`
- Use type-safe queries with TypeScript
- Implement proper error handling for database operations
- Use transactions for multi-step operations
- Leverage RLS (Row Level Security) policies for additional security
- Use database views for complex aggregations

## Testing Strategy

For each endpoint, test:
1. Happy path (valid input, successful response)
2. Authentication failures
3. Authorization failures (accessing other users' data)
4. Validation failures (invalid input)
5. Not found scenarios
6. Database errors
7. Rate limiting (where applicable)

## Environment Variables

Required environment variables:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `OPENROUTER_API_KEY` - OpenRouter API key for AI features

Store in `.env` file and never commit to version control.

## Rate Limiting

Implement rate limiting for:
- AI-powered endpoints (feedback generation)
- Write operations (POST endpoints)
- Authentication endpoints (if applicable)

Use middleware or service layer to enforce limits.

## CORS Configuration

Configure CORS appropriately:
- Allow specific origins in production
- Include credentials if needed
- Set appropriate headers in Astro configuration

---

# Summary

This implementation plan provides comprehensive guidance for implementing all REST API endpoints for the Darter Assistant application. Each endpoint includes:

- Clear request/response specifications
- Type definitions for type safety
- Detailed security considerations
- Comprehensive error handling
- Performance optimization strategies
- Step-by-step implementation instructions

Follow these guidelines to ensure consistent, secure, and performant API endpoints that align with the tech stack (Astro, TypeScript, Supabase, React) and implementation rules.

