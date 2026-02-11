# Quick Testing Guide - SPA Navigation

## The Bug That Was Fixed

**Before:** User clicks PlayMatch → Start Match → ScoreBoard → Exit → ❌ Returns to Tournaments view
**After:** User clicks PlayMatch → Start Match → ScoreBoard → Exit → ✅ Returns to PlayMatch setup

## Quick Test (2 minutes)

### Test 1: Basic Navigation Fix
1. Open the app: `http://localhost:4321/`
2. Click "Play Match" tab
3. Fill player names, click "Start Match"
4. Click "Exit" from scoreboard
5. **Expected:** You're back at "Play Match" tab (not "Tournaments") ✅

### Test 2: Browser Back Button
1. Navigate: Home → Play Match → Start Match (scoreboard)
2. Press browser back button
3. **Expected:** Returns to "Play Match" setup ✅
4. Press back again
5. **Expected:** Returns to "Tournaments" ✅

### Test 3: No Page Reloads
1. Open browser DevTools → Network tab
2. Navigate between tabs
3. **Expected:** No page reloads, only XHR requests ✅

## Detailed Testing

### Navigation Tests

#### Test: Tab Navigation
- [ ] Click "Tournaments" → Shows tournament search
- [ ] Click "Play Match" → Shows match setup
- [ ] Switch between tabs multiple times
- **Expected:** Instant switching, no flickering

#### Test: Match Flow
- [ ] Go to "Play Match"
- [ ] Enter "Player 1" and "Player 2"
- [ ] Select 501
- [ ] Click "Start Match"
- **Expected:** 
  - Brief loading spinner
  - Smooth transition to scoreboard
  - Navigation bars hidden
  - No page reload

#### Test: Exit Flow
- [ ] From scoreboard, click "Exit"
- **Expected:**
  - Returns to "Play Match" setup
  - Setup form is reset
  - Navigation bars visible again

### Browser History Tests

#### Test: Back/Forward Navigation
1. Start at Home
2. Click "Play Match" → Setup shown
3. Click "Start Match" → Scoreboard shown
4. Press browser BACK → Should return to Setup
5. Press browser BACK → Should return to Home
6. Press browser FORWARD → Should go to Setup
7. Press browser FORWARD → Should go to Scoreboard

**Expected:** All navigation works without page reloads ✅

#### Test: URL Consistency
- [ ] At Home: URL = `/`
- [ ] At Play Match: URL = `/?view=setup` (after first navigation)
- [ ] At Scoreboard: URL = `/` (clean URL with history state)

### Direct URL Access Tests

#### Test: Bookmark URLs
- [ ] Visit `http://localhost:4321/` → Shows Tournaments
- [ ] Visit `http://localhost:4321/?view=setup` → Shows Play Match
- [ ] Visit `http://localhost:4321/score` → Redirects to scoring view

#### Test: Page Refresh
1. Navigate to "Play Match"
2. Press F5 (refresh)
3. **Expected:** Still shows "Play Match" (if view param in URL)

### Mobile Tests

#### Test: Mobile Bottom Navigation
- [ ] Resize browser to mobile width (< 768px)
- [ ] Bottom navigation appears with Tournaments and Play Match icons
- [ ] Click icons to switch views
- [ ] Start a match
- **Expected:** Bottom navigation disappears during match

#### Test: Mobile Transitions
- [ ] All transitions are smooth on mobile
- [ ] No layout shifts
- [ ] Bottom nav shows/hides properly

### Edge Cases

#### Test: No Match Data
1. Clear localStorage: `localStorage.clear()`
2. Visit `/?view=scoring` directly
3. **Expected:** Redirects to setup view (no crash)

#### Test: Interrupted Match Setup
1. Fill match setup form
2. Click "Tournaments" tab
3. Click "Play Match" tab again
4. **Expected:** Form is reset (or preserved, depending on implementation)

#### Test: Browser Navigation During Match
1. Start a match
2. Press browser BACK button
3. **Expected:** Returns to setup, match state cleared

### Performance Tests

#### Test: Navigation Speed
1. Open DevTools → Performance tab
2. Record while switching tabs
3. **Expected:** Each navigation < 50ms

#### Test: Memory Leaks
1. Switch between views 20 times rapidly
2. Check DevTools → Memory tab
3. **Expected:** Memory stays stable (no significant growth)

## What to Look For

### ✅ Good Signs:
- No page reloads when navigating
- Instant tab switching
- Exit returns to "Play Match" tab
- Browser back/forward works logically
- URLs are clean and bookmarkable
- No console errors

### ❌ Bad Signs:
- Page flickers on navigation
- Exit returns to wrong tab
- Browser back/forward doesn't work
- Console errors
- Layout shifts
- Slow transitions

## Common Issues & Solutions

### Issue: Exit goes to wrong view
**Check:** `handleExitScoring` should call `navigateToView("setup")`
**Location:** `GuestPage.tsx` line 83-85

### Issue: Browser back doesn't work
**Check:** `popstate` event listener is registered
**Location:** `GuestPage.tsx` line 54-66

### Issue: Direct URL access fails
**Check:** Initial routing logic in `useEffect`
**Location:** `GuestPage.tsx` line 32-51

### Issue: Page reloads on navigation
**Check:** Callbacks are properly passed to child components
**Locations:** 
- `GuestSetupPage` line 46 (onMatchStart)
- `GuestScoreBoard` line 176 (onExit)

## Console Commands (For Debugging)

```javascript
// Check current view
console.log(window.location.href);

// Check history state
console.log(window.history.state);

// Check localStorage
console.log(localStorage.getItem('standaloneMatch'));

// Clear all data and reload
localStorage.clear();
window.location.href = '/';
```

## Performance Benchmarks

### Expected Results:
- Tab switch: < 50ms
- Match start: < 200ms (includes localStorage save)
- Exit: < 50ms
- Page load: < 1000ms

### Measure in DevTools:
1. Open Console
2. Run: `performance.mark('start'); /* do action */; performance.mark('end'); performance.measure('action', 'start', 'end');`
3. Check Performance tab for measurements

## Success Criteria

The migration is successful if:
- ✅ Exit from scoreboard returns to "Play Match" tab
- ✅ No page reloads during navigation
- ✅ Browser back/forward works correctly
- ✅ All URLs are accessible directly
- ✅ No console errors
- ✅ Smooth transitions on desktop and mobile
- ✅ Navigation is noticeably faster than before

## Quick Smoke Test (30 seconds)

```
1. Click "Play Match"
2. Click "Start Match"
3. Click "Exit"
4. Result: Back at "Play Match" ✅

That's the whole bug fix!
```

---

**Pro Tip:** The most important test is the first one. If that works, the core functionality is good. The rest is polish and edge cases.

**Time to Test:** 
- Quick test: 2 minutes
- Full test suite: 15 minutes
- Comprehensive testing: 30 minutes

**Current Status:** Ready for testing! 🎉
