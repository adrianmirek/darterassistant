# REST API Plan

## 1. Resources
- **MatchType** (match_types): Lookup table for match types (e.g., singles, doubles).
- **Tournament** (tournaments): Stores tournament metadata (name, date, owner).
- **TournamentResult** (tournament_match_results): Stores performance metrics per tournament.
- **Goal** (goals): User-defined improvement targets with date windows.
- **GoalProgress** (goal_progress view): Read-only aggregated view of goal progress.

## 2. Endpoints

### 2.2 Match Types
| Method | Path             | Description               | Request Body | Response Body                         | Success   | Errors                 |
|--------|------------------|---------------------------|--------------|---------------------------------------|-----------|------------------------|
| GET    | /match-types     | List all match types      | n/a          | [{ id: number, name: string }]        | 200 OK    | n/a                    |
| GET    | /match-types/:id | Get single match type     | n/a          | { id: number, name: string }          | 200 OK    | 404 Not Found          |

### 2.3 Tournaments & Results
#### Design: Combined create to match single-page form UX
| Method | Path                | Description                                     | Request Body                                                                    | Response Body                                           | Success     | Errors                                                 |
|--------|---------------------|-------------------------------------------------|---------------------------------------------------------------------------------|---------------------------------------------------------|-------------|--------------------------------------------------------|
| GET    | /tournaments        | List user tournaments with pagination & sorting | ?limit=&offset=&sort=date_desc                                                  | [{ id, name, date, average_score, ... }]                | 200 OK      | 401 Unauthorized                                        |
| GET    | /tournaments/:id    | Get tournament details & results                | n/a                                                                             | { id, name, date, results: { match_type_id, average_score, ... } } | 200 OK      | 401 Unauthorized<br>404 Not Found                        |
| POST   | /tournaments        | Create tournament with result                   | { name, date, result: { match_type_id, average_score, first_nine_avg, checkout_percentage, score_60_count, score_100_count, score_140_count, score_180_count, high_finish, best_leg, worst_leg } } | { id: UUID, created_at }                                   | 201 Created | 400 Bad Request (validation)<br>401 Unauthorized       |

### 2.4 Goals & Progress
| Method | Path                      | Description                         | Request Body                                 | Response Body                                  | Success     | Errors                                                |
|--------|---------------------------|-------------------------------------|----------------------------------------------|------------------------------------------------|-------------|-------------------------------------------------------|
| GET    | /goals                    | List user goals                     | ?limit=&offset                               | [{ id, target_avg, start_date, end_date, created_at }] | 200 OK      | 401 Unauthorized                                     |
| GET    | /goals/:id                | Get goal details                    | n/a                                          | { id, target_avg, start_date, end_date, created_at }    | 200 OK      | 401 Unauthorized<br>404 Not Found                     |
| POST   | /goals                    | Create a new goal                   | { target_avg, start_date, end_date }            | { id: UUID, created_at }                           | 201 Created | 400 Bad Request (validation)<br>409 Conflict (overlap)<br>401 Unauthorized |
| GET    | /goals/progress           | List progress for all goals         | ?limit=&offset                               | [{ goal_id, average_score, tournament_count, progress_percentage }] | 200 OK      | 401 Unauthorized                                     |
| GET    | /goals/:id/progress       | Get progress for a specific goal    | n/a                                          | { goal_id, average_score, tournament_count, progress_percentage } | 200 OK      | 401 Unauthorized<br>404 Not Found                     |

### 2.5 Motivational Feedback
| Method | Path                             | Description                           | Request Body                      | Response Body                          | Success    | Errors                                 |
|--------|----------------------------------|---------------------------------------|-----------------------------------|----------------------------------------|------------|----------------------------------------|
| POST   | /tournaments/:id/feedback        | Generate AI-driven motivational message | n/a or { tone_preferences? }      | { message: string, tone: string }      | 200 OK     | 400 Bad Request<br>401 Unauthorized<br>404 Not Found |

## 3. Authentication and Authorization
- Use Supabase Auth (JWT) in `Authorization: Bearer <token>` headers.
- Middleware verifies token and extracts `userId`.
- Enforce row-level security: API respects Supabase RLS policies on `tournaments`, `tournament_match_results`, and `goals`.
- Unauthenticated requests return 401; unauthorized access attempts return 403 or 404 as appropriate.

## 4. Validation and Business Logic
- **TournamentResult Validation**:
  - average_score, first_nine_avg ≥ 0
  - checkout_percentage between 0 and 100
  - score_*_count ≥ 0
  - high_finish, best_leg, worst_leg ≥ 0
- **Goal Validation**:
  - target_avg ≥ 0
  - start_date ≤ end_date
  - No overlapping goals per user (409 Conflict on violation)
- **Business Logic**:
  - Creation of tournament automatically creates a match result row.
  - Goal progress endpoints use the `goal_progress` view for aggregation.
  - Feedback endpoint calls Openrouter.ai with recent performance trends to adjust tone.
- **Pagination, Sorting, Filtering**:
  - List endpoints support `limit`, `offset` and `sort` query parameters.

## 5. Error Handling
- 400 Bad Request: Validation failures, malformed JSON
- 401 Unauthorized: Missing or invalid token
- 403 Forbidden: Access to another user's resource
- 404 Not Found: Resource does not exist
- 409 Conflict: Duplicate resource (email) or overlapping goal date ranges
- 500 Internal Server Error: Unexpected failures

---

*Assumptions*: 
- Editing and deleting of tournaments and goals are out of scope for MVP.
- Match types are pre-seeded; no creation/update endpoints exposed to client.
- Rate limiting to be implemented globally (e.g., 100 requests/min) via API gateway.
