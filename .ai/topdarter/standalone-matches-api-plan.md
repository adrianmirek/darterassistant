# REST API Plan - Standalone Matches

## Overview

This document defines the REST API endpoints for standalone matches in DarterAssistant MVP. The API is designed to support both authenticated users and guest players, with session-based locking for concurrent score entry prevention and real-time statistics calculation.

**Base URL:** `/api/v1`

**Database Schema:** `topdarter`

**Authentication:** Optional (supports both authenticated users and guests via session-based identification)

---

## 1. Resources

| Resource | Database Table | Description |
|----------|----------------|-------------|
| Match Types | `topdarter.match_types` | Available game types with default configurations (501, 301, Cricket, etc.) |
| Matches | `topdarter.matches` | Core match entity for standalone matches |
| Match Legs | `topdarter.match_legs` | Throw-by-throw scoring data |
| Match Stats | `topdarter.match_stats` | Aggregated match statistics per player |
| Match Locks | `topdarter.match_locks` | Session-based locking mechanism |

---

## 2. Endpoints

### 2.1 Match Types

#### GET /match-types

Get list of available match types with default configurations.

**Authentication:** None required

**Query Parameters:**
- `is_active` (boolean, optional) - Filter by active status (default: true)

**Request:** None

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "501",
      "default_start_score": 501,
      "default_checkout_rule": "double_out",
      "default_format_type": "first_to",
      "default_legs_count": 3,
      "default_sets_count": null,
      "description": "Standard 501 game with double-out checkout",
      "is_active": true
    }
  ],
  "meta": {
    "count": 1
  }
}
```

**Error Responses:**
- `500 Internal Server Error` - Database error

---

#### GET /match-types/:id

Get specific match type details.

**Authentication:** None required

**Path Parameters:**
- `id` (uuid, required) - Match type ID

**Request:** None

**Response (200 OK):**
```json
{
  "data": {
    "id": "uuid",
    "name": "501",
    "default_start_score": 501,
    "default_checkout_rule": "double_out",
    "default_format_type": "first_to",
    "default_legs_count": 3,
    "default_sets_count": null,
    "description": "Standard 501 game with double-out checkout",
    "is_active": true,
    "created_at": "2026-01-20T10:00:00Z",
    "updated_at": "2026-01-20T10:00:00Z"
  }
}
```

**Error Responses:**
- `404 Not Found` - Match type not found
- `500 Internal Server Error` - Database error

---

### 2.2 Matches

#### POST /matches

Create a new match (setup phase).

**Authentication:** Optional (session-based)

**Headers:**
- `X-Session-ID` (string, required) - Cryptographic session ID (UUID v4)
- `Authorization` (string, optional) - Bearer token for authenticated users

**Request:**
```json
{
  "match_type_id": "uuid",
  "player1": {
    "user_id": "uuid",
    "guest_name": "John Doe"
  },
  "player2": {
    "user_id": "uuid",
    "guest_name": "Jane Smith"
  },
  "start_score": 501,
  "checkout_rule": "double_out",
  "format_type": "first_to",
  "legs_count": 3,
  "sets_count": null,
  "is_private": false
}
```

**Validation Rules:**
- Exactly one of `player1.user_id` or `player1.guest_name` must be provided (XOR)
- Exactly one of `player2.user_id` or `player2.guest_name` must be provided (XOR)
- `start_score` must be > 0
- `checkout_rule` must be one of: `straight`, `double_out`, `master_out`
- `format_type` must be one of: `first_to`, `best_of`, `unlimited`
- `legs_count` required if `format_type` is `first_to` or `best_of`
- `legs_count` must be > 0 if provided
- `sets_count` must be > 0 if provided
- If authenticated user, must be one of the players

**Response (201 Created):**
```json
{
  "data": {
    "id": "uuid",
    "match_type_id": "uuid",
    "player1_user_id": null,
    "player1_guest_name": "John Doe",
    "player2_user_id": null,
    "player2_guest_name": "Jane Smith",
    "start_score": 501,
    "checkout_rule": "double_out",
    "format_type": "first_to",
    "legs_count": 3,
    "sets_count": null,
    "current_leg": 1,
    "current_set": 1,
    "player1_legs_won": 0,
    "player2_legs_won": 0,
    "player1_sets_won": 0,
    "player2_sets_won": 0,
    "winner_player_number": null,
    "match_status": "setup",
    "is_private": false,
    "started_at": null,
    "completed_at": null,
    "duration_seconds": null,
    "created_at": "2026-01-20T10:00:00Z",
    "updated_at": "2026-01-20T10:00:00Z",
    "created_by_user_id": null
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation error
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Validation failed",
      "details": [
        {
          "field": "player1",
          "message": "Exactly one of user_id or guest_name must be provided"
        }
      ]
    }
  }
  ```
- `401 Unauthorized` - Invalid or missing session ID
- `403 Forbidden` - Authenticated user not a player in the match
- `404 Not Found` - Match type not found
- `500 Internal Server Error` - Database error

---

#### GET /matches/:id

Get match details including current state.

**Authentication:** Optional (required for private matches)

**Headers:**
- `X-Session-ID` (string, required) - Session ID
- `Authorization` (string, optional) - Bearer token

**Path Parameters:**
- `id` (uuid, required) - Match ID

**Query Parameters:**
- `include` (string, optional) - Comma-separated list: `stats`, `legs`, `lock`

**Request:** None

**Response (200 OK):**
```json
{
  "data": {
    "id": "uuid",
    "match_type_id": "uuid",
    "player1_user_id": null,
    "player1_guest_name": "John Doe",
    "player2_user_id": null,
    "player2_guest_name": "Jane Smith",
    "start_score": 501,
    "checkout_rule": "double_out",
    "format_type": "first_to",
    "legs_count": 3,
    "sets_count": null,
    "current_leg": 1,
    "current_set": 1,
    "player1_legs_won": 2,
    "player2_legs_won": 1,
    "player1_sets_won": 0,
    "player2_sets_won": 0,
    "winner_player_number": null,
    "match_status": "in_progress",
    "is_private": false,
    "started_at": "2026-01-20T10:05:00Z",
    "completed_at": null,
    "duration_seconds": null,
    "created_at": "2026-01-20T10:00:00Z",
    "updated_at": "2026-01-20T10:15:00Z",
    "created_by_user_id": null,
    "stats": [
      {
        "player_number": 1,
        "total_score": 540,
        "darts_thrown": 27,
        "rounds_played": 9,
        "average_score": 60.00,
        "first_9_average": 62.33,
        "scores_60_plus": 7,
        "scores_80_plus": 5,
        "scores_100_plus": 2,
        "scores_120_plus": 1,
        "scores_140_plus": 0,
        "scores_170_plus": 0,
        "scores_180": 0,
        "checkout_attempts": 3,
        "successful_checkouts": 2,
        "high_finish": 120,
        "finishes_100_plus": 1,
        "best_leg_darts": 18,
        "worst_leg_darts": 24,
        "legs_won_on_own_throw": 1,
        "legs_won_on_opponent_throw": 1
      },
      {
        "player_number": 2,
        "total_score": 480,
        "darts_thrown": 30,
        "rounds_played": 10,
        "average_score": 48.00,
        "first_9_average": 51.00,
        "scores_60_plus": 5,
        "scores_80_plus": 3,
        "scores_100_plus": 1,
        "scores_120_plus": 0,
        "scores_140_plus": 0,
        "scores_170_plus": 0,
        "scores_180": 0,
        "checkout_attempts": 2,
        "successful_checkouts": 1,
        "high_finish": 85,
        "finishes_100_plus": 0,
        "best_leg_darts": 21,
        "worst_leg_darts": 27,
        "legs_won_on_own_throw": 1,
        "legs_won_on_opponent_throw": 0
      }
    ],
    "lock": {
      "locked_by_session_id": "uuid",
      "locked_at": "2026-01-20T10:05:00Z",
      "expires_at": "2026-01-20T10:35:00Z",
      "is_current_session": true
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid session ID
- `403 Forbidden` - Private match, user not authorized
- `404 Not Found` - Match not found
- `500 Internal Server Error` - Database error

---

#### PATCH /matches/:id

Update match configuration or status.

**Authentication:** Required (session-based or match participant)

**Headers:**
- `X-Session-ID` (string, required) - Session ID
- `Authorization` (string, optional) - Bearer token

**Path Parameters:**
- `id` (uuid, required) - Match ID

**Request:**
```json
{
  "match_status": "in_progress",
  "is_private": true
}
```

**Allowed Updates:**
- `match_status` - Can transition: `setup` → `in_progress`, `in_progress` → `paused`, `paused` → `in_progress`, any → `cancelled`
- `is_private` - Can be changed at any time
- `started_at` - Set automatically when transitioning to `in_progress`
- Status transitions to `completed` happen automatically via triggers when win condition is met

**Validation Rules:**
- Only match creator or participants can update
- Cannot modify completed matches (status = `completed`)
- Invalid status transitions will be rejected

**Response (200 OK):**
```json
{
  "data": {
    "id": "uuid",
    "match_status": "in_progress",
    "is_private": true,
    "started_at": "2026-01-20T10:05:00Z",
    "updated_at": "2026-01-20T10:05:30Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid status transition or validation error
- `401 Unauthorized` - Invalid session
- `403 Forbidden` - Not authorized to update match
- `404 Not Found` - Match not found
- `409 Conflict` - Match already completed
- `500 Internal Server Error` - Database error

---

#### DELETE /matches/:id

Delete a match (only in setup status or by match creator).

**Authentication:** Required (session-based or match participant)

**Headers:**
- `X-Session-ID` (string, required) - Session ID
- `Authorization` (string, optional) - Bearer token

**Path Parameters:**
- `id` (uuid, required) - Match ID

**Request:** None

**Response (204 No Content):**
No response body

**Error Responses:**
- `401 Unauthorized` - Invalid session
- `403 Forbidden` - Not authorized to delete match
- `404 Not Found` - Match not found
- `409 Conflict` - Cannot delete in-progress match (must cancel first)
- `500 Internal Server Error` - Database error

---

#### GET /matches

List matches with filtering and pagination.

**Authentication:** Optional (affects visibility of private matches)

**Headers:**
- `X-Session-ID` (string, optional) - Session ID
- `Authorization` (string, optional) - Bearer token

**Query Parameters:**
- `status` (string, optional) - Filter by match status: `setup`, `in_progress`, `paused`, `completed`, `cancelled`
- `player_user_id` (uuid, optional) - Filter by player user ID
- `is_private` (boolean, optional) - Filter by privacy (default: false for unauthenticated requests)
- `match_type_id` (uuid, optional) - Filter by match type
- `limit` (integer, optional) - Page size (default: 20, max: 100)
- `offset` (integer, optional) - Page offset (default: 0)
- `sort` (string, optional) - Sort field: `created_at`, `started_at`, `completed_at` (default: `created_at`)
- `order` (string, optional) - Sort order: `asc`, `desc` (default: `desc`)

**Request:** None

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "match_type_id": "uuid",
      "player1_guest_name": "John Doe",
      "player2_guest_name": "Jane Smith",
      "player1_legs_won": 3,
      "player2_legs_won": 1,
      "winner_player_number": 1,
      "match_status": "completed",
      "started_at": "2026-01-20T10:00:00Z",
      "completed_at": "2026-01-20T10:45:00Z",
      "duration_seconds": 2700
    }
  ],
  "meta": {
    "total": 125,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid query parameters
- `500 Internal Server Error` - Database error

---

### 2.3 Match Locks

#### POST /matches/:match_id/lock

Acquire scoring lock for a match.

**Authentication:** Required (session-based)

**Headers:**
- `X-Session-ID` (string, required) - Session ID
- `Authorization` (string, optional) - Bearer token

**Path Parameters:**
- `match_id` (uuid, required) - Match ID

**Request:**
```json
{
  "device_info": {
    "browser": "Chrome 120",
    "os": "Windows 10",
    "screen_size": "1920x1080",
    "user_agent": "Mozilla/5.0..."
  },
  "auto_extend": true
}
```

**Response (201 Created):**
```json
{
  "data": {
    "match_id": "uuid",
    "locked_by_session_id": "uuid",
    "device_info": {
      "browser": "Chrome 120",
      "os": "Windows 10",
      "screen_size": "1920x1080",
      "user_agent": "Mozilla/5.0..."
    },
    "locked_at": "2026-01-20T10:00:00Z",
    "expires_at": "2026-01-20T10:30:00Z",
    "auto_extend": true,
    "last_activity_at": "2026-01-20T10:00:00Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid session
- `404 Not Found` - Match not found
- `409 Conflict` - Lock already held by another session
  ```json
  {
    "error": {
      "code": "LOCK_CONFLICT",
      "message": "Match is currently locked by another session",
      "details": {
        "locked_by_session_id": "uuid",
        "locked_at": "2026-01-20T09:45:00Z",
        "expires_at": "2026-01-20T10:15:00Z",
        "device_info": {
          "browser": "Safari 17",
          "os": "iOS 17"
        }
      }
    }
  }
  ```
- `500 Internal Server Error` - Database error

---

#### PUT /matches/:match_id/lock

Extend or update existing lock.

**Authentication:** Required (must be lock holder)

**Headers:**
- `X-Session-ID` (string, required) - Session ID (must match lock holder)
- `Authorization` (string, optional) - Bearer token

**Path Parameters:**
- `match_id` (uuid, required) - Match ID

**Request:**
```json
{
  "auto_extend": true
}
```

**Response (200 OK):**
```json
{
  "data": {
    "match_id": "uuid",
    "locked_by_session_id": "uuid",
    "locked_at": "2026-01-20T10:00:00Z",
    "expires_at": "2026-01-20T10:30:00Z",
    "auto_extend": true,
    "last_activity_at": "2026-01-20T10:15:00Z",
    "updated_at": "2026-01-20T10:15:00Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid session
- `403 Forbidden` - Session does not hold the lock
- `404 Not Found` - Match or lock not found
- `410 Gone` - Lock has expired
- `500 Internal Server Error` - Database error

---

#### DELETE /matches/:match_id/lock

Release match lock.

**Authentication:** Required (session-based or match participant)

**Headers:**
- `X-Session-ID` (string, required) - Session ID
- `Authorization` (string, optional) - Bearer token

**Path Parameters:**
- `match_id` (uuid, required) - Match ID

**Request:** None

**Response (204 No Content):**
No response body

**Error Responses:**
- `401 Unauthorized` - Invalid session
- `403 Forbidden` - Not authorized (not lock holder or match participant)
- `404 Not Found` - Match or lock not found
- `500 Internal Server Error` - Database error

---

#### GET /matches/:match_id/lock

Check lock status for a match.

**Authentication:** None required

**Path Parameters:**
- `match_id` (uuid, required) - Match ID

**Request:** None

**Response (200 OK):**
```json
{
  "data": {
    "match_id": "uuid",
    "is_locked": true,
    "locked_by_session_id": "uuid",
    "locked_at": "2026-01-20T10:00:00Z",
    "expires_at": "2026-01-20T10:30:00Z",
    "is_current_session": false,
    "time_remaining_seconds": 450
  }
}
```

**Response (200 OK) - No Lock:**
```json
{
  "data": {
    "match_id": "uuid",
    "is_locked": false
  }
}
```

**Error Responses:**
- `404 Not Found` - Match not found
- `500 Internal Server Error` - Database error

---

### 2.4 Match Legs (Scoring)

#### POST /matches/:match_id/legs/throws

Record a single throw (score entry).

**Authentication:** Required (must hold lock)

**Headers:**
- `X-Session-ID` (string, required) - Session ID (must hold lock)
- `Authorization` (string, optional) - Bearer token

**Path Parameters:**
- `match_id` (uuid, required) - Match ID

**Request:**
```json
{
  "leg_number": 1,
  "set_number": 1,
  "player_number": 1,
  "throw_number": 1,
  "round_number": 1,
  "score": 60,
  "remaining_score": 441,
  "is_checkout_attempt": false
}
```

**Validation Rules:**
- `leg_number` must be > 0
- `set_number` must be > 0 (default: 1)
- `player_number` must be 1 or 2
- `throw_number` must be between 1 and 3
- `round_number` must be > 0
- `score` must be between 0 and 180
- `remaining_score` must be >= 0
- Unique constraint: `(match_id, leg_number, set_number, player_number, throw_number, round_number)`
- Must have valid lock on the match
- Match status must be `in_progress`

**Response (201 Created):**
```json
{
  "data": {
    "id": "uuid",
    "match_id": "uuid",
    "leg_number": 1,
    "set_number": 1,
    "player_number": 1,
    "throw_number": 1,
    "round_number": 1,
    "score": 60,
    "remaining_score": 441,
    "is_checkout_attempt": false,
    "winner_player_number": null,
    "winning_checkout": null,
    "started_at": null,
    "completed_at": null,
    "duration_seconds": null,
    "created_at": "2026-01-20T10:05:00Z"
  },
  "meta": {
    "stats_updated": true,
    "match_updated": false
  }
}
```

**Response (201 Created) - Leg Won:**
```json
{
  "data": {
    "id": "uuid",
    "match_id": "uuid",
    "leg_number": 1,
    "set_number": 1,
    "player_number": 1,
    "throw_number": 2,
    "round_number": 12,
    "score": 40,
    "remaining_score": 0,
    "is_checkout_attempt": true,
    "winner_player_number": 1,
    "winning_checkout": 40,
    "started_at": "2026-01-20T10:05:00Z",
    "completed_at": "2026-01-20T10:18:00Z",
    "duration_seconds": 780,
    "created_at": "2026-01-20T10:18:00Z"
  },
  "meta": {
    "stats_updated": true,
    "match_updated": true,
    "leg_completed": true,
    "match_completed": false
  }
}
```

**Response (201 Created) - Match Won:**
```json
{
  "data": {
    "id": "uuid",
    "match_id": "uuid",
    "leg_number": 3,
    "set_number": 1,
    "player_number": 1,
    "throw_number": 3,
    "round_number": 15,
    "score": 50,
    "remaining_score": 0,
    "is_checkout_attempt": true,
    "winner_player_number": 1,
    "winning_checkout": 50,
    "started_at": "2026-01-20T10:25:00Z",
    "completed_at": "2026-01-20T10:42:00Z",
    "duration_seconds": 1020,
    "created_at": "2026-01-20T10:42:00Z"
  },
  "meta": {
    "stats_updated": true,
    "match_updated": true,
    "leg_completed": true,
    "match_completed": true,
    "winner_player_number": 1
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation error
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid score entry",
      "details": [
        {
          "field": "score",
          "message": "Score must be between 0 and 180"
        }
      ]
    }
  }
  ```
- `401 Unauthorized` - Invalid session
- `403 Forbidden` - Does not hold lock on match
  ```json
  {
    "error": {
      "code": "LOCK_REQUIRED",
      "message": "You must hold the lock to record scores",
      "details": {
        "current_lock_holder": "uuid",
        "expires_at": "2026-01-20T10:30:00Z"
      }
    }
  }
  ```
- `404 Not Found` - Match not found
- `409 Conflict` - Duplicate throw (unique constraint violation) or match not in progress
- `500 Internal Server Error` - Database error

---

#### GET /matches/:match_id/legs

Get all leg data for a match.

**Authentication:** Optional (required for private matches)

**Headers:**
- `X-Session-ID` (string, optional) - Session ID
- `Authorization` (string, optional) - Bearer token

**Path Parameters:**
- `match_id` (uuid, required) - Match ID

**Query Parameters:**
- `leg_number` (integer, optional) - Filter by leg number
- `set_number` (integer, optional) - Filter by set number
- `player_number` (integer, optional) - Filter by player (1 or 2)
- `limit` (integer, optional) - Page size (default: 100, max: 500)
- `offset` (integer, optional) - Page offset (default: 0)

**Request:** None

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "match_id": "uuid",
      "leg_number": 1,
      "set_number": 1,
      "player_number": 1,
      "throw_number": 1,
      "round_number": 1,
      "score": 60,
      "remaining_score": 441,
      "is_checkout_attempt": false,
      "winner_player_number": null,
      "winning_checkout": null,
      "started_at": "2026-01-20T10:05:00Z",
      "completed_at": null,
      "duration_seconds": null,
      "created_at": "2026-01-20T10:05:15Z"
    }
  ],
  "meta": {
    "total": 54,
    "limit": 100,
    "offset": 0,
    "has_more": false
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid session (for private match)
- `403 Forbidden` - Not authorized to view match
- `404 Not Found` - Match not found
- `500 Internal Server Error` - Database error

---

#### PATCH /matches/:match_id/legs/throws/:id

Update a throw (for corrections/edits).

**Authentication:** Required (must hold lock)

**Headers:**
- `X-Session-ID` (string, required) - Session ID (must hold lock)
- `Authorization` (string, optional) - Bearer token

**Path Parameters:**
- `match_id` (uuid, required) - Match ID
- `id` (uuid, required) - Throw ID

**Request:**
```json
{
  "score": 65,
  "remaining_score": 436,
  "is_checkout_attempt": false
}
```

**Validation Rules:**
- Must hold valid lock on the match
- Cannot edit completed match
- Score edits trigger recalculation of subsequent throws
- `score` must be between 0 and 180
- `remaining_score` must be >= 0

**Response (200 OK):**
```json
{
  "data": {
    "id": "uuid",
    "match_id": "uuid",
    "leg_number": 1,
    "set_number": 1,
    "player_number": 1,
    "throw_number": 1,
    "round_number": 1,
    "score": 65,
    "remaining_score": 436,
    "is_checkout_attempt": false,
    "winner_player_number": null,
    "winning_checkout": null,
    "created_at": "2026-01-20T10:05:15Z"
  },
  "meta": {
    "stats_recalculated": true,
    "subsequent_throws_affected": 15
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Invalid session
- `403 Forbidden` - Does not hold lock
- `404 Not Found` - Match or throw not found
- `409 Conflict` - Cannot edit completed match
- `500 Internal Server Error` - Database error

---

#### DELETE /matches/:match_id/legs/throws/:id

Delete a throw (undo last score).

**Authentication:** Required (must hold lock)

**Headers:**
- `X-Session-ID` (string, required) - Session ID (must hold lock)
- `Authorization` (string, optional) - Bearer token

**Path Parameters:**
- `match_id` (uuid, required) - Match ID
- `id` (uuid, required) - Throw ID

**Request:** None

**Response (204 No Content):**
No response body

**Meta Response Header:**
```
X-Stats-Recalculated: true
X-Subsequent-Throws-Affected: 12
```

**Error Responses:**
- `401 Unauthorized` - Invalid session
- `403 Forbidden` - Does not hold lock
- `404 Not Found` - Match or throw not found
- `409 Conflict` - Cannot delete from completed match
- `500 Internal Server Error` - Database error

---

### 2.5 Match Statistics

#### GET /matches/:match_id/stats

Get aggregated match statistics for both players.

**Authentication:** Optional (required for private matches)

**Headers:**
- `X-Session-ID` (string, optional) - Session ID
- `Authorization` (string, optional) - Bearer token

**Path Parameters:**
- `match_id` (uuid, required) - Match ID

**Query Parameters:**
- `player_number` (integer, optional) - Get stats for specific player (1 or 2)

**Request:** None

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "match_id": "uuid",
      "player_number": 1,
      "total_score": 1503,
      "darts_thrown": 81,
      "rounds_played": 27,
      "average_score": 55.67,
      "first_9_average": 62.33,
      "scores_60_plus": 18,
      "scores_80_plus": 12,
      "scores_100_plus": 5,
      "scores_120_plus": 2,
      "scores_140_plus": 1,
      "scores_170_plus": 0,
      "scores_180": 0,
      "checkout_attempts": 5,
      "successful_checkouts": 3,
      "high_finish": 120,
      "finishes_100_plus": 1,
      "best_leg_darts": 18,
      "worst_leg_darts": 27,
      "legs_won_on_own_throw": 2,
      "legs_won_on_opponent_throw": 1,
      "created_at": "2026-01-20T10:05:00Z",
      "updated_at": "2026-01-20T10:42:00Z"
    },
    {
      "id": "uuid",
      "match_id": "uuid",
      "player_number": 2,
      "total_score": 1380,
      "darts_thrown": 90,
      "rounds_played": 30,
      "average_score": 46.00,
      "first_9_average": 51.00,
      "scores_60_plus": 14,
      "scores_80_plus": 8,
      "scores_100_plus": 3,
      "scores_120_plus": 1,
      "scores_140_plus": 0,
      "scores_170_plus": 0,
      "scores_180": 0,
      "checkout_attempts": 4,
      "successful_checkouts": 2,
      "high_finish": 95,
      "finishes_100_plus": 0,
      "best_leg_darts": 21,
      "worst_leg_darts": 30,
      "legs_won_on_own_throw": 1,
      "legs_won_on_opponent_throw": 1,
      "created_at": "2026-01-20T10:05:00Z",
      "updated_at": "2026-01-20T10:42:00Z"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid session (for private match)
- `403 Forbidden` - Not authorized to view match
- `404 Not Found` - Match not found
- `500 Internal Server Error` - Database error

---

### 2.6 Batch Operations

#### POST /matches/:match_id/legs/throws/batch

Record multiple throws in a single request (for performance optimization).

**Authentication:** Required (must hold lock)

**Headers:**
- `X-Session-ID` (string, required) - Session ID (must hold lock)
- `Authorization` (string, optional) - Bearer token

**Path Parameters:**
- `match_id` (uuid, required) - Match ID

**Request:**
```json
{
  "throws": [
    {
      "leg_number": 1,
      "set_number": 1,
      "player_number": 1,
      "throw_number": 1,
      "round_number": 1,
      "score": 60,
      "remaining_score": 441,
      "is_checkout_attempt": false
    },
    {
      "leg_number": 1,
      "set_number": 1,
      "player_number": 1,
      "throw_number": 2,
      "round_number": 1,
      "score": 60,
      "remaining_score": 381,
      "is_checkout_attempt": false
    },
    {
      "leg_number": 1,
      "set_number": 1,
      "player_number": 1,
      "throw_number": 3,
      "round_number": 1,
      "score": 60,
      "remaining_score": 321,
      "is_checkout_attempt": false
    }
  ]
}
```

**Validation Rules:**
- Maximum 50 throws per batch
- All throws must be for the same match
- All validation rules for individual throws apply
- Batch is atomic: all succeed or all fail

**Response (201 Created):**
```json
{
  "data": {
    "created_count": 3,
    "throws": [
      {
        "id": "uuid",
        "match_id": "uuid",
        "leg_number": 1,
        "set_number": 1,
        "player_number": 1,
        "throw_number": 1,
        "round_number": 1,
        "score": 60,
        "remaining_score": 441,
        "is_checkout_attempt": false,
        "created_at": "2026-01-20T10:05:15Z"
      }
    ]
  },
  "meta": {
    "stats_updated": true,
    "match_updated": false
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation error or batch too large
- `401 Unauthorized` - Invalid session
- `403 Forbidden` - Does not hold lock
- `404 Not Found` - Match not found
- `409 Conflict` - Duplicate throw or match not in progress
- `500 Internal Server Error` - Database error

---

## 3. Authentication and Authorization

### 3.1 Authentication Mechanisms

The API supports two authentication modes:

#### Session-Based Authentication (Required for all operations)

- **Session ID Generation:**
  - Application generates cryptographically random UUID v4 for each client session
  - Stored in secure HTTP-only cookie with SameSite=Strict
  - Alternative: LocalStorage for cross-domain scenarios (less secure)

- **Session Header:**
  ```
  X-Session-ID: 550e8400-e29b-41d4-a716-446655440000
  ```

- **PostgreSQL Session Variable:**
  - Application sets session variable before database operations:
    ```sql
    SET app.session_id = '550e8400-e29b-41d4-a716-446655440000';
    ```
  - RLS policies use `current_setting('app.session_id', true)` for authorization

#### Optional User Authentication (Supabase Auth)

- **Bearer Token:**
  ```
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

- **JWT Claims:**
  - `sub` - User ID (UUID)
  - `email` - User email
  - `role` - User role (typically 'authenticated')

- **When Required:**
  - Creating matches where authenticated user is a player
  - Viewing private matches where user is a participant
  - Accessing user-specific match history

### 3.2 Authorization Rules

#### Public Matches
- **View:** Anyone can view public matches (no authentication required)
- **Create:** Session ID required (authenticated or guest)
- **Update/Delete:** Only match creator or participants

#### Private Matches
- **View:** Only match participants (requires authentication or session match)
- **Create:** Session ID required + user must be a player
- **Update/Delete:** Only match creator or participants

#### Score Entry (Match Locks)
- **Acquire Lock:** Valid session ID required
- **Record Scores:** Must hold active lock on the match
- **Release Lock:** Lock holder or match participants

#### RLS Policy Enforcement

All authorization is enforced at the database level via Row-Level Security (RLS) policies:

- **Matches:** Viewable based on privacy + participant status
- **Match Legs:** Inherit match visibility + lock requirement for INSERT/UPDATE
- **Match Stats:** Inherit match visibility
- **Match Locks:** Publicly viewable, but only lock holder can update/delete

### 3.3 Rate Limiting

Recommended rate limits by endpoint category:

| Category | Limit | Window | Notes |
|----------|-------|--------|-------|
| Match Creation | 10 requests | 1 minute | Per session |
| Score Entry | 300 requests | 1 minute | Per match lock (5 scores/second avg) |
| Match Queries | 60 requests | 1 minute | Per session |
| Lock Operations | 30 requests | 1 minute | Per session |
| Statistics | 30 requests | 1 minute | Per session |

Rate limit headers:
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 287
X-RateLimit-Reset: 1642684800
```

### 3.4 Security Headers

All API responses should include:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

---

## 4. Validation and Business Logic

### 4.1 Match Validation

#### Match Creation
- **Player Identification:**
  - Exactly one of `user_id` or `guest_name` required per player (XOR)
  - Guest names: 1-255 characters, non-empty after trim
  - Both players cannot be the same user

- **Scoring Configuration:**
  - `start_score` must be > 0
  - `checkout_rule` must be: `straight`, `double_out`, or `master_out`
  - `format_type` must be: `first_to`, `best_of`, or `unlimited`

- **Format Rules:**
  - `first_to` and `best_of` require `legs_count` > 0
  - `unlimited` format ignores `legs_count`
  - `sets_count` optional, must be > 0 if provided

- **Status:**
  - New matches start in `setup` status
  - `started_at` set automatically when transitioning to `in_progress`

#### Match Updates
- **Status Transitions:**
  - `setup` → `in_progress` (sets `started_at`)
  - `in_progress` → `paused`
  - `paused` → `in_progress`
  - Any status → `cancelled`
  - Automatic: Any → `completed` (via triggers when win condition met)

- **Restrictions:**
  - Cannot modify `completed` matches
  - Cannot modify scoring configuration after `in_progress`
  - Can change `is_private` at any time

### 4.2 Scoring Validation

#### Throw Entry
- **Round Structure:**
  - 3 throws per round maximum
  - `throw_number` must be 1, 2, or 3
  - `round_number` must be > 0 and sequential

- **Score Range:**
  - Must be 0-180 (0 = bust, 180 = max possible)
  - Valid dart scores only (no fractional points)

- **Remaining Score:**
  - Must be >= 0
  - Cannot be 1 (auto-bust in standard rules)
  - Zero means leg won (checkout complete)

- **Uniqueness:**
  - Composite key: `(match_id, leg_number, set_number, player_number, throw_number, round_number)`
  - No duplicate throws allowed

- **Checkout Rules:**
  - `is_checkout_attempt` = true when remaining ≤ 170 (max checkout)
  - `winning_checkout` set when remaining = 0
  - Must comply with match `checkout_rule` (validated at application layer):
    - `straight`: Any score
    - `double_out`: Must hit double
    - `master_out`: Must hit double or triple

#### Bust Logic (Application Layer)
- **Conditions:**
  - Score > remaining
  - Remaining after throw = 1
  - Checkout rule violation (e.g., single hit when double required)

- **Behavior:**
  - Record throw with `score = 0`
  - Keep `remaining_score` unchanged
  - Set `is_checkout_attempt = true` if attempted

### 4.3 Statistics Calculation

Statistics are calculated automatically via database triggers:

#### On Throw Insert
- **Incremental Updates (per throw):**
  - Increment `darts_thrown`
  - Update `total_score`
  - Increment round counters (60+, 80+, 100+, etc.)
  - Track `checkout_attempts` if `is_checkout_attempt = true`

- **Round Completion (throw 3 of 3):**
  - Increment `rounds_played`
  - Calculate `average_score` (generated column)
  - Update first 9 darts average (if applicable)

#### On Leg Completion
- **Checkout Stats:**
  - Increment `successful_checkouts`
  - Update `high_finish` (max checkout)
  - Count `finishes_100_plus`

- **Leg Performance:**
  - Calculate darts used for leg
  - Update `best_leg_darts` (minimum)
  - Update `worst_leg_darts` (maximum)
  - Track holds vs breaks (`legs_won_on_own_throw` vs `legs_won_on_opponent_throw`)

#### Generated Columns
- `average_score`: `(total_score / darts_thrown) * 3` (3-dart average)
- `duration_seconds`: `EXTRACT(EPOCH FROM (completed_at - started_at))`

### 4.4 Match Completion Logic

Automatic via database triggers:

#### Win Detection
- **First To:**
  - Winner when `player_legs_won >= legs_count`

- **Best Of:**
  - Winner when `player_legs_won > legs_count / 2`

- **Unlimited:**
  - No automatic completion
  - Manual cancellation or explicit completion only

#### On Win Detection
- Set `winner_player_number` (1 or 2)
- Set `match_status = 'completed'`
- Set `completed_at = NOW()`
- Calculate `duration_seconds` (generated)
- Release match lock (if held)

### 4.5 Lock Management

#### Acquisition
- **Requirements:**
  - Valid session ID
  - Match not already locked by another session
  - Match status must be `in_progress` or `paused`

- **Lock Properties:**
  - Default expiration: 30 minutes from acquisition
  - `auto_extend = true`: Extends on each scoring activity
  - Device info stored as JSONB for audit trail

#### Extension
- **Auto-Extension:**
  - Triggered on each throw entry if `auto_extend = true`
  - Extends `expires_at` by 30 minutes from last activity
  - Updates `last_activity_at`

- **Manual Extension:**
  - Via PUT `/matches/:id/lock`
  - Resets expiration to 30 minutes from extension time

#### Release
- **Automatic:**
  - Lock expires after 30 minutes of inactivity
  - Match completion releases lock

- **Manual:**
  - Lock holder can release via DELETE
  - Match participants can forcibly release

#### Expired Lock Cleanup
- Background job runs every 5 minutes
- Deletes locks where `expires_at < NOW()`
- Indexed for efficient cleanup

### 4.6 Data Integrity

#### Database Constraints
- **Check Constraints:**
  - Player XOR: `(user_id IS NOT NULL AND guest_name IS NULL) OR (user_id IS NULL AND guest_name IS NOT NULL)`
  - Positive values: `start_score > 0`, `legs_count > 0`, `sets_count > 0`
  - Score ranges: `score BETWEEN 0 AND 180`, `remaining_score >= 0`
  - Valid enums: `checkout_rule`, `format_type`, `match_status`
  - Time logic: `completed_at >= started_at`

- **Foreign Keys:**
  - `matches.match_type_id` → `match_types.id`
  - `matches.player_user_id` → `auth.users.id` (ON DELETE CASCADE)
  - `match_legs.match_id` → `matches.id` (ON DELETE CASCADE)
  - `match_stats.match_id` → `matches.id` (ON DELETE CASCADE)
  - `match_locks.match_id` → `matches.id` (ON DELETE CASCADE)

- **Unique Constraints:**
  - `match_legs`: `(match_id, leg_number, set_number, player_number, throw_number, round_number)`
  - `match_stats`: `(match_id, player_number)`
  - `match_locks`: `match_id` (primary key - only one lock per match)

#### Triggers
- **Timestamp Management:**
  - Auto-update `updated_at` on UPDATE for all tables

- **Statistics Updates:**
  - Incremental stats on throw INSERT
  - Checkout stats on leg completion UPDATE

- **Match Updates:**
  - Leg won counters on leg completion
  - Winner detection and match completion
  - Auto-transition to `completed` status

### 4.7 Error Handling

#### Standard Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "field_name",
      "value": "invalid_value",
      "constraint": "constraint_details"
    }
  }
}
```

#### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `INVALID_SESSION` | 401 | Missing or invalid session ID |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Not authorized for this action |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (duplicate, state mismatch) |
| `LOCK_CONFLICT` | 409 | Match locked by another session |
| `LOCK_REQUIRED` | 403 | Must hold lock to perform action |
| `LOCK_EXPIRED` | 410 | Lock has expired |
| `INVALID_STATE` | 409 | Invalid state transition |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## 5. Implementation Notes

### 5.1 Technology Stack Integration

#### Astro 5 API Routes
- API endpoints implemented as Astro API routes in `/src/pages/api/v1/`
- SSR mode for dynamic request handling
- Middleware for session management and authentication

#### Supabase Integration
- **Client Initialization:**
  ```typescript
  import { createClient } from '@supabase/supabase-js';
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
  ```

- **Session Variable Setting:**
  ```typescript
  await supabase.rpc('set_session_id', { 
    session_id: requestSessionId 
  });
  ```

- **RLS Policy Enforcement:**
  - All queries automatically enforced by RLS
  - No additional authorization logic needed in application layer

#### TypeScript Types
- Generate types from database schema using Supabase CLI:
  ```bash
  supabase gen types typescript --linked > src/types/database.ts
  ```

### 5.2 Performance Optimizations

#### Database Optimizations
- Use prepared statements for repeated queries
- Leverage database indexes for common query patterns
- Batch operations where possible (batch throw entry)
- Use covering indexes for frequently accessed data

#### Caching Strategy
- **Match Metadata:** Cache for 5 minutes (can change frequently)
- **Match Types:** Cache for 1 hour (rarely changes)
- **Statistics:** No caching (real-time updates required)
- **Lock Status:** No caching (must be current)

#### Query Optimization
- Use `INCLUDE` columns in indexes for covering queries
- Partial indexes for filtered queries (live matches, recent matches)
- Limit result sets with pagination (default 20, max 100)

### 5.3 Real-Time Updates (Future Enhancement)

While not in MVP, consider Supabase Realtime subscriptions for:
- Live match score updates for spectators
- Lock status changes
- Match completion notifications

```typescript
// Future implementation example
supabase
  .channel(`match:${matchId}`)
  .on('postgres_changes', 
    { 
      event: 'INSERT', 
      schema: 'topdarter', 
      table: 'match_legs',
      filter: `match_id=eq.${matchId}`
    }, 
    (payload) => {
      // Handle new score
    }
  )
  .subscribe();
```

### 5.4 Testing Considerations

#### Unit Tests
- Validation logic for all input data
- Business logic (win detection, statistics calculation)
- Session management and lock handling

#### Integration Tests
- API endpoint responses and error handling
- Database trigger functionality
- RLS policy enforcement
- Lock acquisition and conflict scenarios

#### Performance Tests
- Concurrent score entry (multiple locks)
- High-frequency score updates (3-5 per second)
- Large result set queries (match history)
- Statistics calculation overhead

---

## 6. Migration Path

### Phase 1: MVP (Current)
- Basic CRUD for matches
- Session-based locking
- Throw-by-throw score entry
- Auto-calculated statistics
- Guest player support

### Phase 2: Enhanced Features
- Real-time score updates (Supabase Realtime)
- Match replay functionality
- Advanced statistics (trends, graphs)
- Export match data (JSON, CSV)

### Phase 3: Multi-Player & Tournaments
- Sets support (currently legs only)
- Tournament bracket management
- Team matches (doubles)
- Multi-round competitions

---

## Appendix A: Sample Workflows

### A.1 Guest Match Flow

1. **Setup Match**
   ```
   POST /api/v1/matches
   Headers: X-Session-ID: {session-uuid}
   Body: {
     player1: { guest_name: "John" },
     player2: { guest_name: "Jane" },
     start_score: 501,
     format_type: "first_to",
     legs_count: 3
   }
   Response: { match_id, status: "setup" }
   ```

2. **Start Match**
   ```
   PATCH /api/v1/matches/{id}
   Headers: X-Session-ID: {session-uuid}
   Body: { match_status: "in_progress" }
   Response: { status: "in_progress", started_at }
   ```

3. **Acquire Lock**
   ```
   POST /api/v1/matches/{id}/lock
   Headers: X-Session-ID: {session-uuid}
   Body: { device_info: {...}, auto_extend: true }
   Response: { locked_at, expires_at }
   ```

4. **Record Scores**
   ```
   POST /api/v1/matches/{id}/legs/throws
   Headers: X-Session-ID: {session-uuid}
   Body: {
     player_number: 1,
     leg_number: 1,
     round_number: 1,
     throw_number: 1,
     score: 60,
     remaining_score: 441
   }
   Response: { throw_id, stats_updated }
   ```

5. **Get Statistics**
   ```
   GET /api/v1/matches/{id}/stats
   Response: { player1_stats, player2_stats }
   ```

6. **Complete Match**
   - Automatic when win condition met
   - Triggers update match status to "completed"
   - Releases lock automatically

### A.2 Authenticated User Match Flow

1. **Create Match** (as authenticated user)
   ```
   POST /api/v1/matches
   Headers: 
     X-Session-ID: {session-uuid}
     Authorization: Bearer {jwt-token}
   Body: {
     player1: { user_id: "{current-user-id}" },
     player2: { guest_name: "Opponent" },
     match_type_id: "{501-type-id}",
     is_private: true
   }
   ```

2. **View Match History**
   ```
   GET /api/v1/matches?player_user_id={user-id}&status=completed
   Headers: Authorization: Bearer {jwt-token}
   Response: { data: [...matches], meta: {...} }
   ```

---

**Document Version:** 1.0.0  
**Last Updated:** 2026-01-20  
**Status:** Ready for Implementation  
**Scope:** Standalone Matches MVP
