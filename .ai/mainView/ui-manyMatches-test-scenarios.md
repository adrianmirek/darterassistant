# Test Scenarios: Many Matches Support

## Overview

This document provides detailed test scenarios for the many-matches tournament feature. Each scenario includes steps, expected results, and validation criteria.

---

## Manual Test Scenarios

### Scenario 1: Create Tournament with Single Match (Happy Path)

**Objective**: Verify basic tournament creation with one match works correctly.

**Steps**:
1. Navigate to `/tournaments/new`
2. **Step1 - Basic Info**:
   - Enter "Weekly League" as tournament name
   - Select today's date
   - Select "Leagues + SKO" as tournament type
   - Click "Next"
3. **Step2 - Metrics**:
   - Select "501" as match type
   - Enter "John Smith" as opponent (optional)
   - Enter final placement: 1
   - Enter average score: 75.5
   - Enter first nine avg: 80.0
   - Enter checkout %: 35.5
   - Enter 180s: 3
   - Enter high finish: 120
   - Enter best leg: 12
   - Enter worst leg: 18
   - Enter other score counts (60+, 100+, 140+)
   - Click "Next"
4. **Step3 - Review**:
   - Verify tournament info displays correctly
   - Verify 1 match is shown in the table
   - Verify all metrics match entered values
   - Click "Submit"

**Expected Results**:
- ✅ Form submits successfully
- ✅ Success toast appears: "Tournament saved successfully! Tournament 'Weekly League' with 1 match has been recorded."
- ✅ AI feedback toast appears with performance analysis
- ✅ Form resets to Step1 after submission
- ✅ User redirected to dashboard after 1.5-17.5 seconds

**Validation**:
- Check database: 1 tournament record created
- Check database: 1 tournament_match_results record created with correct tournament_id
- Check API response includes feedback field

---

### Scenario 2: Create Tournament with Multiple Matches (Happy Path)

**Objective**: Verify adding multiple matches to a tournament works correctly.

**Steps**:
1. Navigate to `/tournaments/new`
2. **Step1 - Basic Info**:
   - Enter "Sunday Tournament" as tournament name
   - Select date: 2025-12-05
   - Select "SKO" as tournament type
   - Click "Next"
3. **Step2 - Match 1**:
   - Select "501" as match type
   - Enter "Player A" as opponent
   - Fill in metrics (avg: 70, first9: 75, co%: 40, placement: 2)
   - Click "New Match" button
4. **Verify Match Saved**:
   - ✅ Toast appears: "Match saved! Match 1 has been added."
   - ✅ Form resets except match_type stays "501"
   - ✅ Still on Step2
5. **Step2 - Match 2**:
   - Match type should be pre-selected to "501"
   - Enter "Player B" as opponent
   - Fill in different metrics (avg: 80, first9: 85, co%: 45, placement: 1)
   - Click "New Match" button
6. **Verify Second Match Saved**:
   - ✅ Toast appears: "Match saved! Match 2 has been added."
7. **Step2 - Match 3**:
   - Fill in third match data
   - Click "Next" (instead of "New Match")
8. **Step3 - Review**:
   - ✅ Tournament info displays correctly
   - ✅ "3 matches" displayed
   - ✅ Table shows all 3 matches with correct data
   - ✅ Overall Statistics card appears (only shown when > 1 match)
   - ✅ Verify avg score calculation: (70+80+Match3Avg)/3
   - Click "Submit"

**Expected Results**:
- ✅ Tournament created with 3 matches
- ✅ Success message shows "3 matches"
- ✅ AI feedback analyzes all 3 matches together
- ✅ Overall statistics in feedback

**Validation**:
- Database: 1 tournament record
- Database: 3 tournament_match_results records with same tournament_id
- API payload includes "matches" array with 3 items

---

### Scenario 3: Add Match from Review Page

**Objective**: Verify "Add Match" button on Step3 works correctly.

**Steps**:
1. Complete Steps 1-3 from Scenario 2 (add 2 matches, reach Step3)
2. **Step3 - Review**:
   - Review shows 2 matches
   - Click "Add Match" button (left side, near Submit)
3. **Verify Navigation**:
   - ✅ Navigated back to Step2
   - ✅ Form is reset to default values
   - ✅ Match type is pre-selected to last match's type
4. **Step2 - Add Match**:
   - Enter new match data
   - Click "Next"
5. **Step3 - Review**:
   - ✅ Now shows 3 matches
   - Click "Submit"

**Expected Results**:
- ✅ Tournament created with 3 matches
- ✅ All matches saved correctly

---

### Scenario 4: Validation - No Matches Added

**Objective**: Verify form prevents submission without at least 1 match.

**Steps**:
1. Navigate to `/tournaments/new`
2. **Step1**: Fill in basic info, click "Next"
3. **Step2**: DO NOT fill in any data or add any matches
4. Click "Next" button

**Expected Results**:
- ✅ Error toast appears: "No matches added - Please add at least one match before proceeding to review."
- ✅ User stays on Step2
- ✅ Next button remains clickable (can retry)

---

### Scenario 5: Validation - Invalid Match Data

**Objective**: Verify form validates match data before saving.

**Steps**:
1. Navigate to `/tournaments/new`
2. **Step1**: Fill in basic info, click "Next"
3. **Step2**:
   - Leave match_type empty
   - Enter average_score: -10 (invalid)
   - Enter checkout_percentage: 150 (invalid, max 100)
   - Click "New Match"

**Expected Results**:
- ✅ Validation errors display below fields
- ✅ "Match type is required" error shows
- ✅ "Average score cannot be negative" error shows
- ✅ "Checkout percentage cannot exceed 100" error shows
- ✅ Match is NOT added to array
- ✅ Form does not reset
- ✅ User stays on Step2

---

### Scenario 6: Auto-Save Current Match When Clicking Next

**Objective**: Verify current match auto-saves when clicking Next from Step2.

**Steps**:
1. Navigate to `/tournaments/new`
2. **Step1**: Fill in basic info, click "Next"
3. **Step2**: Fill in valid match data
4. Click "Next" (without clicking "New Match")

**Expected Results**:
- ✅ Current match is automatically validated and saved
- ✅ User proceeds to Step3
- ✅ Step3 shows 1 match in table

---

### Scenario 7: Navigation - Back Button from Step3

**Objective**: Verify back button navigates without losing saved matches.

**Steps**:
1. Add 2 matches, reach Step3
2. Click "Back" button
3. Verify on Step2
4. Click "Next"
5. Verify on Step3

**Expected Results**:
- ✅ Navigation works correctly
- ✅ Still shows 2 saved matches on Step3
- ✅ Saved matches are not lost

---

### Scenario 8: Tournament Type Selection

**Objective**: Verify tournament type dropdown works.

**Steps**:
1. Navigate to `/tournaments/new`
2. **Step1**:
   - Click tournament type dropdown
   - Verify options appear: "Leagues + SKO", "SKO"
   - Select "SKO"
   - Click "Next"
3. Complete form, submit
4. **Verify Review**:
   - Tournament Type displays as "SKO"

**Expected Results**:
- ✅ Tournament type is saved correctly
- ✅ API receives tournament_type_id: 2

---

### Scenario 9: Opponent Name Optional

**Objective**: Verify opponent name is optional.

**Steps**:
1. Navigate to `/tournaments/new`
2. Complete Step1
3. **Step2**:
   - Fill in all match data
   - Leave "Opponent Name" field EMPTY
   - Click "New Match"
4. Verify match saved successfully
5. Proceed to Step3

**Expected Results**:
- ✅ Match saves without opponent name
- ✅ Review shows "-" in opponent column
- ✅ API receives full_name: null

---

### Scenario 10: Responsive Design - Mobile View

**Objective**: Verify mobile responsive layout on Step3.

**Steps**:
1. Resize browser to mobile width (< 640px)
2. Add 3 matches, reach Step3
3. **Verify Mobile Layout**:
   - ✅ Table is HIDDEN on mobile
   - ✅ Card view is VISIBLE on mobile
   - ✅ Each match displays as a card
   - ✅ Cards show all relevant data
4. Resize browser to desktop width (> 640px)
5. **Verify Desktop Layout**:
   - ✅ Table is VISIBLE
   - ✅ Cards are HIDDEN

---

### Scenario 11: Match Type Pre-Selection

**Objective**: Verify match_type pre-selection after saving match.

**Steps**:
1. Complete Step1
2. **Step2 - Match 1**:
   - Select "701" as match type
   - Fill in data
   - Click "New Match"
3. **Verify**:
   - ✅ Form resets
   - ✅ Match type dropdown shows "701" (pre-selected)
   - ✅ All other fields are cleared

---

### Scenario 12: Overall Statistics Display

**Objective**: Verify overall statistics card only appears with 2+ matches.

**Steps**:
1. Add 1 match, go to Step3
   - ✅ Overall Statistics card is HIDDEN
2. Go back, add another match
   - ✅ Overall Statistics card is VISIBLE
3. **Verify Statistics**:
   - ✅ Avg Score = (match1.avg + match2.avg) / 2
   - ✅ Total 180s = match1.180s + match2.180s
   - ✅ Best Leg = Math.min(match1.bestLeg, match2.bestLeg)
   - ✅ High Finish = Math.max(match1.highFinish, match2.highFinish)

---

### Scenario 13: Loading States

**Objective**: Verify loading indicators work correctly.

**Steps**:
1. Navigate to `/tournaments/new`
2. **Verify Initial Load**:
   - ✅ Tournament types dropdown shows "Loading tournament types..."
   - ✅ Dropdown is disabled during load
   - ✅ After load, dropdown enables and shows options
3. Navigate to Step2
4. **Verify Match Types Load**:
   - ✅ Match type dropdown shows "Loading match types..."
   - ✅ After load, shows options

---

### Scenario 14: Error Handling - API Failure

**Objective**: Verify error handling when API fails.

**Steps**:
1. Complete form with 3 matches
2. **Simulate API failure** (disconnect network or use browser DevTools)
3. Click "Submit"

**Expected Results**:
- ✅ Error toast appears: "Failed to save tournament"
- ✅ User stays on Step3
- ✅ Form data is NOT lost
- ✅ User can retry submission

---

### Scenario 15: Final Placement Per Match

**Objective**: Verify final_placement is tracked per match.

**Steps**:
1. Add Match 1 with final_placement: 1
2. Add Match 2 with final_placement: 3
3. Add Match 3 with final_placement: 2
4. **Step3 - Review**:
   - ✅ Table shows correct placement for each match
   - ✅ Placements are independent (not averaged)

---

## Edge Case Scenarios

### Edge Case 1: Maximum Fields

**Test**: Enter maximum allowed values
- Average score: 180
- Checkout %: 100
- High finish: 170
- Verify: Form accepts and saves correctly

### Edge Case 2: Minimum Fields

**Test**: Enter minimum allowed values
- Average score: 0
- Checkout %: 0
- High finish: 0
- Best leg: 9
- Verify: Form accepts and saves correctly

### Edge Case 3: Very Long Tournament Name

**Test**: Enter 255 character tournament name
- Verify: Accepts up to 255 chars
- Test 256 chars: Validation error

### Edge Case 4: Very Long Opponent Name

**Test**: Enter 255 character opponent name
- Verify: Accepts up to 255 chars
- Test 256 chars: Validation error

### Edge Case 5: Ten Matches

**Test**: Add 10 matches to a tournament
- Verify: All 10 matches save correctly
- Verify: Table/cards display all 10 matches
- Verify: Overall statistics calculate correctly

---

## API Integration Test Scenarios

### API Test 1: POST /api/tournaments - Valid Payload

**Request**:
```json
{
  "name": "Test Tournament",
  "date": "2025-12-05",
  "tournament_type_id": 1,
  "matches": [
    {
      "match_type_id": 1,
      "opponent_id": null,
      "full_name": "Player A",
      "final_placement": 1,
      "average_score": 75.5,
      "first_nine_avg": 80.0,
      "checkout_percentage": 35.5,
      "score_60_count": 10,
      "score_100_count": 5,
      "score_140_count": 2,
      "score_180_count": 3,
      "high_finish": 120,
      "best_leg": 12,
      "worst_leg": 18
    }
  ]
}
```

**Expected Response**: 201 Created
```json
{
  "id": "uuid",
  "created_at": "timestamp",
  "feedback": "AI feedback message"
}
```

---

### API Test 2: POST /api/tournaments - Empty Matches Array

**Request**:
```json
{
  "name": "Test",
  "date": "2025-12-05",
  "tournament_type_id": 1,
  "matches": []
}
```

**Expected Response**: 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": ["At least one match is required"]
}
```

---

### API Test 3: POST /api/tournaments - Invalid Match Type

**Request**: matches[0].match_type_id = 9999 (doesn't exist)

**Expected Response**: 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": ["Invalid foreign key reference (match_type_id, tournament_type_id, or opponent_id)"]
}
```

---

### API Test 4: POST /api/tournaments - Invalid Tournament Type

**Request**: tournament_type_id = 999 (doesn't exist)

**Expected Response**: 400 Bad Request

---

### API Test 5: POST /api/tournaments - Multiple Matches

**Request**: Send 3 matches in payload

**Expected Response**: 201 Created

**Validation**:
- Query database: 3 tournament_match_results records exist
- All have same tournament_id
- AI feedback mentions all 3 matches

---

### API Test 6: GET /api/tournament-types

**Request**: GET /api/tournament-types

**Expected Response**: 200 OK
```json
[
  { "id": 1, "name": "Leagues + SKO" },
  { "id": 2, "name": "SKO" }
]
```

---

## Database Validation Scenarios

### DB Test 1: Tournament Record Created

**After**: Submitting tournament with 3 matches

**Validate**:
```sql
SELECT * FROM tournaments WHERE name = 'Test Tournament';
```
- ✅ 1 record exists
- ✅ user_id matches authenticated user
- ✅ tournament_type_id = 1
- ✅ date = '2025-12-05'

---

### DB Test 2: Match Results Created

**Validate**:
```sql
SELECT * FROM tournament_match_results WHERE tournament_id = '{tournament_id}';
```
- ✅ 3 records exist
- ✅ All have correct tournament_id
- ✅ match_type_id values are valid
- ✅ full_name values match opponent names entered

---

### DB Test 3: Foreign Key Constraints

**Test**: Try to insert match with invalid match_type_id directly in DB
- ✅ Database rejects with foreign key constraint error

---

## AI Feedback Test Scenarios

### AI Test 1: Single Match Feedback

**Input**: 1 match with avg 75, 3x180s, 35% checkout

**Verify**:
- ✅ Feedback mentions performance metrics
- ✅ Positive tone
- ✅ 2-3 sentences

---

### AI Test 2: Multiple Matches Feedback

**Input**: 3 matches with varying performance

**Verify**:
- ✅ Feedback references "matches" (plural)
- ✅ Mentions overall statistics
- ✅ Identifies trends across matches
- ✅ Constructive improvement suggestions

---

### AI Test 3: High Performance

**Input**: Matches with avg 90+, multiple 180s

**Verify**:
- ✅ Feedback is congratulatory
- ✅ Highlights exceptional metrics

---

### AI Test 4: API Key Missing

**Scenario**: OPENROUTER_API_KEY not configured

**Verify**:
- ✅ Tournament still saves successfully
- ✅ Feedback is default message
- ✅ No error thrown

---

## Test Summary Checklist

### Critical Paths ✅
- [ ] Create tournament with 1 match
- [ ] Create tournament with 3 matches
- [ ] Add match from review page
- [ ] Validation prevents empty matches
- [ ] Auto-save on Next works

### User Experience ✅
- [ ] New Match button works
- [ ] Match type pre-selection works
- [ ] Responsive design works (mobile/desktop)
- [ ] Overall statistics calculate correctly
- [ ] Loading states display

### Data Integrity ✅
- [ ] Multiple matches save to database
- [ ] Tournament type saves correctly
- [ ] Opponent names save correctly
- [ ] Final placement per match saves

### Error Handling ✅
- [ ] Validation errors display
- [ ] API errors show user-friendly messages
- [ ] Network failures handled gracefully

### AI Integration ✅
- [ ] Feedback analyzes all matches
- [ ] Overall statistics included
- [ ] Default feedback on API failure

---

## Testing Priority

**P0 (Critical)**: Scenarios 1, 2, 4, 6  
**P1 (High)**: Scenarios 3, 5, 7, 8, 14  
**P2 (Medium)**: Scenarios 9, 10, 11, 12, 13, 15  
**P3 (Low)**: Edge cases, AI tests

---

**Test Environment Requirements**:
- Local dev server running
- Database with migrations applied
- OPENROUTER_API_KEY configured (optional for AI tests)
- Browser DevTools for network simulation

