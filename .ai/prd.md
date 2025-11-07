# Product Requirements Document (PRD) - Darter Assistant

## 1. Product Overview
Darter Assistant is a web-based analytics and improvement platform for amateur and professional darts players. It enables users to record and review personal performance across multiple tournaments, set improvement goals, and receive AI-powered motivational feedback to foster continuous development.

## 2. User Problem
Many darts players participate in multiple tournaments but lack a centralized tool to track their performance trends over time. Existing applications focus on tournament management or live scoring, not on personal analytics and goal tracking. Players need a simple way to log results, view progress, and stay motivated between events.

## 3. Functional Requirements
1. User Authentication (FR-001)
   - Email and password sign-up and login.
   - Password recovery via "forgot password" (no email confirmation).
2. Tournament Result Entry (FR-002)
   - Single-page form to record:
     - Tournament name and date
     - Match type (e.g., singles, doubles)
     - Final placement
     - Average score (AVG)
     - First-9 AVG
     - Checkout percentage
     - Counts of scores 60+, 100+, 140+, 180
     - High finish
     - Best leg and worst leg scores
   - Field-level validation for numeric ranges and required fields.
3. Tournament History View (FR-003)
   - List of saved tournaments for the logged-in user ordered by date.
4. Goal Management (FR-004)
   - Create a personal goal (e.g., reach a target AVG) with start and end dates.
   - Display progress toward goal based on recorded tournament averages.
5. Motivational Feedback (FR-005)
   - "Get Feedback" button triggers AI-generated message.
   - Feedback includes positive reinforcement and performance insight.
   - Tone adapts to recent performance trends.
6. Security and Data Protection (FR-006)
   - Secure password storage using industry-standard hashing.
   - Authorization checks to prevent unauthorized data access.

## 4. Product Boundaries
Included in MVP:
- Manual entry of tournament results only (no real-time or live integration).
- Basic analytics: goal progress percentage and AVG over time list.
- AI motivational feedback via on-demand toast messages.

Excluded from MVP:
- Live scoring or match-by-match data entry.
- Social sharing or multi-user collaboration.
- Integration with official tournament management systems.
- Advanced visualizations (charts, heatmaps).
- Training plan generation.
- Edit or delete tournament entries.

## 5. User Stories

US-001: Sign Up
- Description: A new user can create an account using email and password.
- Acceptance Criteria:
  - User can access the sign-up form.
  - Email and password fields are required.
  - Password must meet complexity rules (e.g., min 8 characters).
  - On success, user is redirected to the dashboard.

US-002: Log In
- Description: An existing user can log in with email and password.
- Acceptance Criteria:
  - Login form validates non-empty fields.
  - Incorrect credentials display an error message.
  - On success, user is redirected to their tournament history.

US-003: Recover Password
- Description: A user who forgets their password can request a reset link.
- Acceptance Criteria:
  - "Forgot password" link is available on login page.
  - User enters their email to receive a reset link.
  - System displays confirmation that the email was sent.

US-004: Add Tournament Result
- Description: A logged-in user can record a new tournament result.
- Acceptance Criteria:
  - All required fields are present and validated.
  - Numeric fields reject values outside reasonable ranges.
  - On successful save, a confirmation message is shown.

US-005: View Tournament History
- Description: A user can view a list of their saved tournaments.
- Acceptance Criteria:
  - Tournaments display date, name, placement, and AVG.
  - List is paginated or scrollable if long.

US-006: Create Improvement Goal
- Description: A user can set a target average with start and end dates.
- Acceptance Criteria:
  - Goal form validates date range and target AVG.
  - On save, goal appears on the dashboard with progress indicator.

US-007: Track Goal Progress
- Description: The system calculates and displays progress toward the goal.
- Acceptance Criteria:
  - Progress percentage updates after each saved result.
  - If progress meets or exceeds 100%, a completion message is shown.

US-008: Request Motivational Feedback
- Description: A user can request feedback after saving a result.
- Acceptance Criteria:
  - "Get Feedback" button is visible on the result confirmation toast.
  - AI-generated message appears in a toast notification.
  - Tone adjusts based on recent AVG improvements or drops.

US-009: Secure Data Access
- Description: Only authenticated users can access their data.
- Acceptance Criteria:
  - Attempts to access protected routes without authentication redirect to login.

US-010: Tournament Data Entry
- Title: Tournament Data Entry
- Description: As a user, I want to be able to save tournament data (as defined in US-004), so that I can later edit and view it in the next phase of the project.
- Acceptance Criteria:
  - The user can save the current tournament results (US-004) as tournament-match-results.
  - The user can update saved tournament data (not in MVP).
  - The user can delete tournament data (not in MVP).

US-011: Secure Access and Authentication
- Title: Secure Access
- Description: As a user, I want to be able to register and log in to the system in a way that ensures the security of my data.
- Acceptance Criteria:
  - Login and registration take place on dedicated pages.
  - Login requires providing an email address and password.
  - Registration requires providing an email address, password, and password confirmation.
  - The user cannot use the function for adding new tournament data to tournament-match-results without logging into the system (US-010).
  - The user can log in to the system using a button in the upper-right corner.
  - The user can log out of the system using a button in the upper-right corner of the main @Layout.astro.
  - No external login services are used (e.g., Google, GitHub).
  - Password recovery must be possible.

## 6. Success Metrics
- 90% of active users save at least two tournament results per month.
- 75% of users set at least one improvement goal within their first month.
- Average in-app feedback rating ≥ 4.5/5 within three months of launch.
- System uptime ≥ 99.5% during the first quarter post-launch.
