# Test Plan: Darter Assistant (MVP)

## 1. Introduction and Testing Objectives

### 1.1 Project Overview
Darter Assistant MVP is a web application designed to help darts players track tournament performance through a secure, authenticated system. The MVP focuses on core user management and tournament data entry functionality.

### 1.2 Testing Objectives
The primary objectives of this MVP test plan are to:
- **Ensure robust authentication and session management** through comprehensive testing of Supabase Auth integration
- **Validate multi-step tournament form workflow** with proper validation at each step
- **Confirm data security** through Row Level Security (RLS) policy enforcement
- **Verify form validation logic** using Zod schemas across all authentication and tournament forms
- **Establish navigation behavior** for authenticated vs. guest users
- **Guarantee responsive form interactions** and user feedback mechanisms

## 2. Scope of Testing

### 2.1 In Scope

#### Authentication & Session Management
- User registration (`RegisterForm.tsx`)
- User login (`LoginForm.tsx`)
- Password reset request (`ForgotPasswordForm.tsx`)
- Password reset completion (`ResetPasswordForm.tsx`)
- Session persistence and validation
- Logout functionality
- Middleware route protection
- Navigation state (authenticated vs. guest) - `AuthNav.tsx`, `GuestNav.tsx`

#### Tournament CRUD Operations
- Multi-step tournament creation form:
  - **Step 1: Basic Info** (`Step1_BasicInfo.tsx`) - Tournament name, date, match type
  - **Step 2: Metrics** (`Step2_Metrics.tsx`) - Performance statistics
  - **Step 3: Review** (`Step3_Review.tsx`) - Data confirmation before submission
- Stepper navigation (`StepperNavigation.tsx`) - Progress indicator and step tracking
- Form controls (`FormControls.tsx`) - Back, Next, Submit buttons
- Form validation with Zod schemas
- Data persistence between steps
- API integration for tournament creation
- Toast notifications for user feedback

### 2.2 Out of Scope (Post-MVP)
- Goal management features
- Tournament listing and viewing (read operations)
- Tournament editing and deletion
- AI-powered feedback generation
- Performance analytics
- Goal progress tracking
- Advanced filtering and sorting
- Data export functionality

## 3. Types of Tests to be Performed

### 3.1 Unit Tests
**Target Components:**
- Form validation schemas (Zod) for all authentication and tournament forms
- Individual step components validation logic
- Service layer functions (`auth.service.ts`, `tournament.service.ts` - create only)
- Navigation component conditional rendering
- Utility functions and helpers

**Tools:** Vitest, React Testing Library

**Coverage Goal:** 85% minimum for form validation logic and service layer

### 3.2 Integration Tests
**Target Areas:**
- Complete authentication workflows (register → login → logout)
- Password reset flow (request → email → reset completion)
- Multi-step form progression with API integration
- Session validation with middleware
- Form submission with backend validation
- Navigation state transitions based on authentication status

**Tools:** Vitest, Supertest, Supabase test client

### 3.3 End-to-End (E2E) Tests
**Target User Flows:**
1. New user registration → first login → tournament creation
2. Complete multi-step tournament form with validation at each step
3. Returning user login → tournament creation
4. Password reset complete workflow
5. Session persistence across page reloads
6. Logout and redirect behavior

**Tools:** Playwright

### 3.4 Component Tests
**Target Components:**
- `LoginForm.tsx` - Form rendering, validation, submission
- `RegisterForm.tsx` - Form rendering, validation, email/password requirements
- `ForgotPasswordForm.tsx` - Email validation and submission
- `ResetPasswordForm.tsx` - Password validation, confirmation matching
- `AddTournamentForm.tsx` - Multi-step orchestration, state management
- `Step1_BasicInfo.tsx` - Basic info validation, match type loading
- `Step2_Metrics.tsx` - Metric validation, numeric constraints
- `Step3_Review.tsx` - Data display, final validation
- `StepperNavigation.tsx` - Visual step indicator
- `FormControls.tsx` - Button state management (enabled/disabled)
- `AuthNav.tsx` - Authenticated user navigation
- `GuestNav.tsx` - Guest user navigation

**Tools:** React Testing Library, Vitest

### 3.5 Security Tests
**Target Areas:**
- Authentication bypass attempts
- Session hijacking prevention
- RLS policy enforcement (user data isolation)
- SQL injection prevention
- XSS attack prevention in form inputs
- CSRF token validation
- Email enumeration prevention in password reset

**Tools:** OWASP ZAP, manual penetration testing

### 3.6 API Tests
**Target Endpoints:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - Session termination
- `POST /api/auth/forgot-password` - Password reset request
- `GET /api/match-types` - Match type lookup (for Step 1)
- `POST /api/tournaments` - Tournament creation

**Test Scenarios:**
- Valid requests with expected responses (200, 201)
- Invalid payloads with appropriate error codes (400)
- Authentication failures (401)
- Validation errors with descriptive messages
- Session expiration handling

**Tools:** Postman, REST Client, automated API test suite

## 4. Test Scenarios for Key Functionalities

### 4.1 Authentication Module

#### Test Scenario 4.1.1: User Registration (`RegisterForm.tsx`)

| Test Case ID | Description | Steps | Expected Result |
|--------------|-------------|-------|-----------------|
| AUTH-REG-001 | Successful registration with valid data | 1. Navigate to /auth/register<br>2. Enter valid email (user@example.com)<br>3. Enter valid password (min 6 chars)<br>4. Submit form | User created, session established, redirected to / (dashboard) |
| AUTH-REG-002 | Registration with existing email | 1. Enter email already registered<br>2. Enter password<br>3. Submit | Toast error: "User already registered" displayed |
| AUTH-REG-003 | Registration with invalid email format | 1. Enter "notanemail"<br>2. Tab to password field | Inline validation error: "Invalid email" |
| AUTH-REG-004 | Registration with weak password | 1. Enter valid email<br>2. Enter "12345" (< 6 chars)<br>3. Submit | Validation error: Password must be at least 6 characters |
| AUTH-REG-005 | Registration with empty fields | 1. Leave email empty<br>2. Leave password empty<br>3. Submit form | Required field errors displayed for both fields |
| AUTH-REG-006 | Password visibility toggle | 1. Enter password<br>2. Click show/hide icon | Password visibility toggles between masked/visible |
| AUTH-REG-007 | Form submission loading state | 1. Fill valid data<br>2. Click Submit<br>3. Observe button | Submit button shows loading state and is disabled |
| AUTH-REG-008 | Auto-redirect when authenticated | 1. Log in as user<br>2. Navigate to /auth/register | Automatically redirected to / (dashboard) |

#### Test Scenario 4.1.2: User Login (`LoginForm.tsx`)

| Test Case ID | Description | Steps | Expected Result |
|--------------|-------------|-------|-----------------|
| AUTH-LOG-001 | Successful login with correct credentials | 1. Navigate to /auth/login<br>2. Enter registered email<br>3. Enter correct password<br>4. Submit | User logged in, session created, redirected to / |
| AUTH-LOG-002 | Login with incorrect password | 1. Enter registered email<br>2. Enter wrong password<br>3. Submit | Toast error: "Invalid login credentials" |
| AUTH-LOG-003 | Login with non-existent email | 1. Enter unregistered email<br>2. Enter any password<br>3. Submit | Toast error: "Invalid login credentials" (same message for security) |
| AUTH-LOG-004 | Login with empty credentials | 1. Leave fields empty<br>2. Submit | Required field validation errors displayed |
| AUTH-LOG-005 | Login form email validation | 1. Enter invalid email format<br>2. Tab to next field | Inline validation error displayed |
| AUTH-LOG-006 | Remember session functionality | 1. Log in successfully<br>2. Close browser<br>3. Reopen and navigate to app | User remains authenticated (session persists) |
| AUTH-LOG-007 | Forgot password link navigation | 1. On login page<br>2. Click "Forgot password?" link | Navigated to /auth/forgot-password |
| AUTH-LOG-008 | Register link navigation | 1. On login page<br>2. Click "Create account" link | Navigated to /auth/register |

#### Test Scenario 4.1.3: Forgot Password (`ForgotPasswordForm.tsx`)

| Test Case ID | Description | Steps | Expected Result |
|--------------|-------------|-------|-----------------|
| AUTH-PWD-001 | Request password reset with valid email | 1. Navigate to /auth/forgot-password<br>2. Enter registered email<br>3. Submit | Success message: "Check your email for reset instructions" (no enumeration) |
| AUTH-PWD-002 | Request reset with non-existent email | 1. Enter unregistered email<br>2. Submit | Same success message (security feature - no enumeration) |
| AUTH-PWD-003 | Request reset with invalid email format | 1. Enter "notanemail"<br>2. Submit | Validation error: "Invalid email format" |
| AUTH-PWD-004 | Request reset with empty email | 1. Leave email field empty<br>2. Submit | Required field validation error |
| AUTH-PWD-005 | Back to login link | 1. On forgot password page<br>2. Click "Back to login" link | Navigated to /auth/login |
| AUTH-PWD-006 | Form submission loading state | 1. Enter valid email<br>2. Submit<br>3. Observe button | Submit button disabled and shows loading state |

#### Test Scenario 4.1.4: Reset Password (`ResetPasswordForm.tsx`)

| Test Case ID | Description | Steps | Expected Result |
|--------------|-------------|-------|-----------------|
| AUTH-RST-001 | Complete password reset with valid token | 1. Click reset link from email<br>2. Enter new password (min 6 chars)<br>3. Confirm password (match)<br>4. Submit | Password updated, success message, redirected to login |
| AUTH-RST-002 | Reset with mismatched passwords | 1. Access reset page<br>2. Enter password "newpass123"<br>3. Confirm "different123"<br>4. Submit | Validation error: "Passwords must match" |
| AUTH-RST-003 | Reset with weak password | 1. Access reset page<br>2. Enter password "123"<br>3. Confirm "123"<br>4. Submit | Validation error: "Password must be at least 6 characters" |
| AUTH-RST-004 | Reset with empty fields | 1. Leave both fields empty<br>2. Submit | Required field errors for both fields |
| AUTH-RST-005 | Reset with expired token | 1. Use old reset link (>24 hours)<br>2. Enter valid new password<br>3. Submit | Error: "Reset link expired, request new one" |
| AUTH-RST-006 | Reset with invalid token | 1. Access /auth/reset-password with invalid token<br>2. Enter passwords<br>3. Submit | Error: "Invalid reset link" |
| AUTH-RST-007 | Password visibility toggle | 1. Enter password<br>2. Click show/hide icons | Both password fields toggle visibility independently |
| AUTH-RST-008 | Login after successful reset | 1. Complete reset successfully<br>2. Navigate to login<br>3. Enter email + new password | Login successful with new password |

#### Test Scenario 4.1.5: Session Management & Middleware

| Test Case ID | Description | Steps | Expected Result |
|--------------|-------------|-------|-----------------|
| AUTH-SES-001 | Access protected route with valid session | 1. Log in successfully<br>2. Navigate to / (root) | Page loads successfully, AuthNav displayed |
| AUTH-SES-002 | Access protected route without session | 1. Ensure logged out<br>2. Navigate to / | Redirected to /auth/login |
| AUTH-SES-003 | Session persistence across page reloads | 1. Log in<br>2. Reload page multiple times | User remains authenticated, no redirect |
| AUTH-SES-004 | Logout terminates session | 1. Log in<br>2. Navigate to /api/auth/logout<br>3. Try accessing / | Redirected to /auth/login |
| AUTH-SES-005 | Session expiration handling | 1. Log in<br>2. Wait for token expiration<br>3. Try accessing protected route | Redirected to login or token refreshed automatically |
| AUTH-SES-006 | Concurrent session handling | 1. Log in on Browser A<br>2. Log in on Browser B (same user)<br>3. Check both sessions | Both sessions valid (or latest invalidates previous, based on config) |
| AUTH-SES-007 | Protected API endpoint requires auth | 1. Log out<br>2. Call POST /api/tournaments directly | 401 Unauthorized response |

#### Test Scenario 4.1.6: Navigation Components

| Test Case ID | Description | Steps | Expected Result |
|--------------|-------------|-------|-----------------|
| AUTH-NAV-001 | AuthNav displays when authenticated | 1. Log in<br>2. View navigation | AuthNav component displayed with logout button |
| AUTH-NAV-002 | GuestNav displays when not authenticated | 1. Ensure logged out<br>2. View navigation on public page | GuestNav component displayed with login/register links |
| AUTH-NAV-003 | Logout button functionality | 1. Log in<br>2. Click logout in AuthNav | User logged out, redirected to /auth/login |
| AUTH-NAV-004 | AuthNav shows user email | 1. Log in as user@example.com<br>2. View AuthNav | User email displayed in navigation |
| AUTH-NAV-005 | Navigation links work correctly | 1. Log in<br>2. Click navigation links | All protected routes accessible |

### 4.2 Tournament Management Module

#### Test Scenario 4.2.1: Multi-Step Form - Step 1 (Basic Info)

| Test Case ID | Description | Steps | Expected Result |
|--------------|-------------|-------|-----------------|
| TOURN-ST1-001 | Load Step 1 with match types | 1. Navigate to tournament form<br>2. View Step 1 | Match types loaded in dropdown from API |
| TOURN-ST1-002 | Match type loading error handling | 1. Navigate to form (simulate API failure)<br>2. View Step 1 | Error toast displayed, form still accessible |
| TOURN-ST1-003 | Match type loading state | 1. Navigate to form<br>2. Observe match type dropdown | Loading indicator shown while fetching |
| TOURN-ST1-004 | Tournament name validation - too short | 1. Enter "Ab" (2 chars)<br>2. Click Next | Error: "Tournament name must be at least 3 characters" |
| TOURN-ST1-005 | Tournament name validation - valid | 1. Enter "Summer Open 2025" (valid)<br>2. Fill other fields<br>3. Click Next | Validation passes, moved to Step 2 |
| TOURN-ST1-006 | Date validation - future date | 1. Enter valid name<br>2. Select tomorrow's date<br>3. Click Next | Error: "Tournament date cannot be in the future" |
| TOURN-ST1-007 | Date validation - today's date | 1. Enter valid name<br>2. Select today's date<br>3. Click Next | Validation passes (today is valid) |
| TOURN-ST1-008 | Date validation - past date | 1. Enter valid name<br>2. Select yesterday<br>3. Click Next | Validation passes, moved to Step 2 |
| TOURN-ST1-009 | Match type required validation | 1. Enter valid name and date<br>2. Leave match type unselected<br>3. Click Next | Error: "Match type is required" |
| TOURN-ST1-010 | Date picker calendar interaction | 1. Click date field<br>2. Open calendar popup<br>3. Select date from calendar | Date populated correctly in field |
| TOURN-ST1-011 | All Step 1 fields valid | 1. Enter name "Local Tournament"<br>2. Select yesterday<br>3. Select "singles" match type<br>4. Click Next | All validations pass, Step 2 displayed |

#### Test Scenario 4.2.2: Multi-Step Form - Step 2 (Metrics)

| Test Case ID | Description | Steps | Expected Result |
|--------------|-------------|-------|-----------------|
| TOURN-ST2-001 | All metric fields render correctly | 1. Complete Step 1<br>2. Click Next to Step 2 | All 11 metric input fields displayed with labels |
| TOURN-ST2-002 | Average score - negative validation | 1. On Step 2<br>2. Enter average_score = -10<br>3. Click Next | Error: "Average score cannot be negative" |
| TOURN-ST2-003 | Average score - exceeds maximum | 1. Enter average_score = 181<br>2. Click Next | Error: "Average score cannot exceed 180" |
| TOURN-ST2-004 | Average score - valid range | 1. Enter average_score = 85.5<br>2. Click Next (other fields valid) | Validation passes |
| TOURN-ST2-005 | First nine average - negative | 1. Enter first_nine_avg = -5<br>2. Click Next | Error: "First nine average cannot be negative" |
| TOURN-ST2-006 | First nine average - exceeds max | 1. Enter first_nine_avg = 200<br>2. Click Next | Error: "First nine average cannot exceed 180" |
| TOURN-ST2-007 | Checkout percentage - negative | 1. Enter checkout_percentage = -10<br>2. Click Next | Error: "Checkout percentage cannot be negative" |
| TOURN-ST2-008 | Checkout percentage - exceeds 100 | 1. Enter checkout_percentage = 150<br>2. Click Next | Error: "Checkout percentage cannot exceed 100" |
| TOURN-ST2-009 | Checkout percentage - valid | 1. Enter checkout_percentage = 45.5<br>2. Click Next | Validation passes |
| TOURN-ST2-010 | Score counts - negative validation | 1. Enter score_60_count = -1<br>2. Click Next | Error: "Count cannot be negative" |
| TOURN-ST2-011 | Score counts - valid zero | 1. Enter all score counts = 0<br>2. Click Next | Validation passes (zero is valid) |
| TOURN-ST2-012 | Score counts - valid positive integers | 1. Enter score_60_count = 5<br>2. Enter score_100_count = 3<br>3. Enter score_140_count = 1<br>4. Enter score_180_count = 0<br>5. Click Next | Validation passes |
| TOURN-ST2-013 | High finish - invalid value (171) | 1. Enter high_finish = 171<br>2. Click Next | Error: "High finish must be 0 or between 2 and 170" |
| TOURN-ST2-014 | High finish - valid value (170) | 1. Enter high_finish = 170<br>2. Click Next | Validation passes |
| TOURN-ST2-015 | High finish - valid value (0) | 1. Enter high_finish = 0<br>2. Click Next | Validation passes (0 means no finish) |
| TOURN-ST2-016 | High finish - invalid value (1) | 1. Enter high_finish = 1<br>2. Click Next | Error: "High finish must be 0 or between 2 and 170" |
| TOURN-ST2-017 | Best leg - minimum validation | 1. Enter best_leg = 8<br>2. Click Next | Error: "Best leg must be at least 9 darts" |
| TOURN-ST2-018 | Best leg - valid minimum (9) | 1. Enter best_leg = 9<br>2. Click Next | Validation passes |
| TOURN-ST2-019 | Worst leg - minimum validation | 1. Enter worst_leg = 5<br>2. Click Next | Error: "Worst leg must be at least 9 darts" |
| TOURN-ST2-020 | All Step 2 fields valid | 1. Fill all metrics with valid values<br>2. Click Next | All validations pass, Step 3 displayed |
| TOURN-ST2-021 | Decimal precision for averages | 1. Enter average_score = 85.123456<br>2. Submit form | Value accepted, stored with appropriate precision (85.12) |
| TOURN-ST2-022 | Final placement field | 1. Enter final_placement = 1<br>2. Verify field present | Field accepts positive integers |

#### Test Scenario 4.2.3: Multi-Step Form - Step 3 (Review)

| Test Case ID | Description | Steps | Expected Result |
|--------------|-------------|-------|-----------------|
| TOURN-ST3-001 | Display all Step 1 data correctly | 1. Complete Steps 1-2<br>2. Navigate to Step 3 | Tournament name, date, match type displayed correctly |
| TOURN-ST3-002 | Display all Step 2 metrics correctly | 1. Complete Steps 1-2<br>2. Navigate to Step 3 | All 11 metric values displayed correctly formatted |
| TOURN-ST3-003 | Match type name resolved | 1. Select match type ID in Step 1<br>2. View Step 3 | Match type shown as name ("singles") not ID (1) |
| TOURN-ST3-004 | Date formatted correctly | 1. Select date 2025-01-15 in Step 1<br>2. View Step 3 | Date displayed in readable format (Jan 15, 2025) |
| TOURN-ST3-005 | Decimal values formatted | 1. Enter average_score = 85.5 in Step 2<br>2. View Step 3 | Value displayed as "85.50" or "85.5" consistently |
| TOURN-ST3-006 | Edit data from review step | 1. On Step 3<br>2. Click Back button<br>3. Modify Step 2 data<br>4. Return to Step 3 | Updated values reflected in review |

#### Test Scenario 4.2.4: Form Navigation & Controls

| Test Case ID | Description | Steps | Expected Result |
|--------------|-------------|-------|-----------------|
| TOURN-NAV-001 | Stepper shows current step | 1. On Step 1 | Stepper highlights "Basic Info" |
| TOURN-NAV-002 | Stepper updates on navigation | 1. Navigate Step 1 → 2 → 3 | Stepper updates to show current step each time |
| TOURN-NAV-003 | Next button on Step 1 | 1. On Step 1<br>2. Click Next with valid data | Moved to Step 2 |
| TOURN-NAV-004 | Next button disabled on Step 1 with invalid data | 1. On Step 1<br>2. Have validation errors<br>3. Click Next | Validation errors shown, stays on Step 1 |
| TOURN-NAV-005 | Back button on Step 2 | 1. On Step 2<br>2. Click Back | Returned to Step 1, data preserved |
| TOURN-NAV-006 | Back button on Step 3 | 1. On Step 3<br>2. Click Back | Returned to Step 2 |
| TOURN-NAV-007 | No Back button on Step 1 | 1. On Step 1 | Back button not displayed or disabled |
| TOURN-NAV-008 | Submit button only on Step 3 | 1. View Steps 1-3 | Submit button only appears on Step 3 |
| TOURN-NAV-009 | Submit button triggers final validation | 1. On Step 3<br>2. Click Submit | Final validation runs before submission |
| TOURN-NAV-010 | Data persistence between steps | 1. Fill Step 1<br>2. Go to Step 2<br>3. Go back to Step 1 | All Step 1 data preserved |
| TOURN-NAV-011 | Cannot skip steps | 1. On Step 1<br>2. Try to access Step 3 directly via URL or code | Cannot bypass Step 2 validation |

#### Test Scenario 4.2.5: Form Submission

| Test Case ID | Description | Steps | Expected Result |
|--------------|-------------|-------|-----------------|
| TOURN-SUB-001 | Successful submission | 1. Complete all 3 steps with valid data<br>2. Click Submit on Step 3 | Tournament created (201), success toast, redirected to / |
| TOURN-SUB-002 | Submission loading state | 1. Complete form<br>2. Click Submit<br>3. Observe UI | Submit button disabled, loading indicator shown |
| TOURN-SUB-003 | Submission with API error (500) | 1. Complete form<br>2. Submit (simulate server error) | Error toast: "An unexpected error occurred", form remains on Step 3 |
| TOURN-SUB-004 | Submission with validation error (400) | 1. Complete form<br>2. Submit (server rejects data) | Error toast: "Invalid data. Please review your entries" |
| TOURN-SUB-005 | Success toast message | 1. Submit successfully | Toast: "Tournament saved successfully! Tournament "[name]" has been recorded." |
| TOURN-SUB-006 | Data transformation for API | 1. Complete form<br>2. Submit<br>3. Check request payload | Data structured as CreateTournamentCommand (nested result object) |
| TOURN-SUB-007 | Date formatting for API | 1. Select date in date picker<br>2. Submit<br>3. Check payload | Date sent as YYYY-MM-DD string format |
| TOURN-SUB-008 | Match type ID conversion | 1. Select match type from dropdown<br>2. Submit<br>3. Check payload | match_type_id sent as integer, not string |
| TOURN-SUB-009 | Cannot submit from Step 1 or 2 | 1. On Step 1 or 2<br>2. Trigger form submission programmatically | Submission blocked, stays on current step |
| TOURN-SUB-010 | Redirect after successful submission | 1. Submit successfully<br>2. Wait for toast<br>3. Observe navigation | Auto-redirect to / (dashboard) after 1.5 seconds |
| TOURN-SUB-011 | Form reset after successful submission | 1. Submit tournament successfully<br>2. Navigate back to form | Form reset to default values (not previous data) |

#### Test Scenario 4.2.6: RLS and Data Isolation

| Test Case ID | Description | Steps | Expected Result |
|--------------|-------------|-------|-----------------|
| TOURN-RLS-001 | Tournament created with correct user_id | 1. Log in as user@example.com<br>2. Create tournament<br>3. Check database | Tournament.user_id = logged-in user's ID |
| TOURN-RLS-002 | User cannot view other users' tournaments | 1. User A creates tournament<br>2. Log in as User B<br>3. Query tournaments API | User B's tournaments only (not User A's) |
| TOURN-RLS-003 | API enforces user isolation | 1. Log in as User A<br>2. Call POST /api/tournaments with user_id = User B | Error or tournament created with User A's ID (override) |
| TOURN-RLS-004 | Unauthenticated user cannot create tournament | 1. Log out<br>2. Call POST /api/tournaments directly | 401 Unauthorized |

## 5. Test Environment

### 5.1 Development Environment
- **Purpose:** Unit, integration, and component testing during development
- **Infrastructure:**
  - Local machine with Node.js 20+
  - Local Supabase instance (via Supabase CLI)
- **Database:** Supabase local development instance with migrations applied
- **Configuration:** `.env.local` with development credentials

### 5.2 Staging Environment
- **Purpose:** E2E, security testing, UAT
- **Infrastructure:**
  - DigitalOcean droplet or Vercel preview deployment
  - Supabase staging project (separate from production)
- **Database:** Staging Supabase database with RLS enabled
- **Configuration:** `.env.staging` with staging credentials
- **Data:** Synthetic test data for multiple test users

### 5.3 Browser Testing Matrix
- **Desktop:** Chrome (latest), Firefox (latest), Edge (latest), Safari (latest)
- **Mobile:** iOS Safari, Chrome Android
- **Viewports:** 375px (mobile), 768px (tablet), 1920px (desktop)

## 6. Testing Tools

| Tool | Purpose | Configuration |
|------|---------|---------------|
| **Vitest** | Unit & integration tests | `vitest.config.ts` |
| **React Testing Library** | Component tests | With user-event for interactions |
| **Playwright** | E2E tests | `playwright.config.ts`, multi-browser |
| **Supertest** | API endpoint tests | For Astro API routes |
| **ESLint** | Code linting | Already configured |
| **TypeScript** | Type checking | Strict mode enabled |
| **OWASP ZAP** | Security scanning | Manual runs on staging |
| **axe DevTools** | Accessibility testing | Browser extension |

## 7. Test Schedule (2-Week MVP Sprint)

### Week 1: Core Testing Setup
**Days 1-2:** Test infrastructure setup
- Configure Vitest, React Testing Library, Playwright
- Set up test database and seed data
- Create test user accounts

**Days 3-5:** Unit & Component Tests
- Authentication form components (Login, Register, Forgot/Reset Password)
- Tournament form components (Step 1, 2, 3, Stepper, Controls)
- Form validation schemas (Zod)
- Service layer functions

**Deliverable:** 80% unit test coverage for components and services

### Week 2: Integration & E2E Testing
**Days 1-2:** Integration Tests
- Complete authentication flows
- API endpoint testing
- Database RLS policy validation

**Days 3-4:** E2E Tests
- Critical user journeys (register → create tournament)
- Multi-step form workflow
- Session management scenarios

**Day 5:** Security & Final Testing
- RLS penetration testing
- XSS/SQL injection tests
- Cross-browser testing
- Test report generation

**Deliverable:** Complete MVP test suite, ready for production

## 8. Test Acceptance Criteria

### 8.1 Coverage Criteria
- **Unit Test Coverage:** Minimum 80% for form components and validation
- **Integration Test Coverage:** All MVP API endpoints covered
- **E2E Test Coverage:** All 6 critical user flows automated
- **Branch Coverage:** Minimum 75% for business logic

### 8.2 Quality Criteria
- **Zero Critical Bugs:** No P0/Severity 1 bugs in production release
- **Test Pass Rate:** 100% of tests pass before merging to main
- **Flaky Tests:** Maximum 2% flakiness rate
- **Form Validation:** 100% of validation rules tested and passing

### 8.3 Security Criteria
- **RLS Policy Enforcement:** 100% - all user data isolated
- **Authentication Tests:** All bypass attempts fail
- **Session Security:** No hijacking/fixation vulnerabilities
- **Email Enumeration:** Prevented in password reset flow

### 8.4 Functional Criteria
- **Authentication:** 100% of auth test scenarios pass (40+ test cases)
- **Tournament Creation:** 100% of multi-step form scenarios pass (60+ test cases)
- **Form Validation:** All Zod schemas validated
- **Navigation:** Auth vs. Guest navigation working correctly

## 9. Roles and Responsibilities

### 9.1 Test Lead (1 person)
- Overall test strategy and execution
- Test environment management
- Test metrics and reporting
- Risk assessment

### 9.2 QA Engineers (1-2 people)
- Write unit, integration, E2E tests
- Implement CI/CD test pipelines
- Manual testing of forms and workflows
- Bug reproduction and reporting

### 9.3 Developers
- Write unit tests for new features
- Fix bugs identified by QA
- Code reviews with test focus
- Support test environment setup

### 9.4 Product Owner
- Define acceptance criteria
- Review test plans
- Participate in UAT
- Make go/no-go decisions

## 10. Bug Reporting Procedures

### 10.1 Severity Levels
- **Severity 1 (Critical):** Authentication broken, data breach, RLS failure
  - Response Time: Immediate (within 1 hour)
  - Resolution Target: 24 hours

- **Severity 2 (High):** Form submission fails, session loss, validation bypass
  - Response Time: 4 hours
  - Resolution Target: 48 hours

- **Severity 3 (Medium):** UI issues, minor validation errors, cosmetic bugs
  - Response Time: 1 business day
  - Resolution Target: 1 week

- **Severity 4 (Low):** Typos, minor styling issues
  - Response Time: 3 business days
  - Resolution Target: 2 weeks

### 10.2 Bug Report Template

```markdown
## Bug ID: [AUTO-GENERATED]
**Reporter:** [Name]
**Date:** [YYYY-MM-DD]
**Severity:** [1/2/3/4]
**Component:** [Authentication/Tournament Form/Navigation/API]

### Environment
- **Browser:** [Chrome 120.0.0]
- **URL:** [Full URL]
- **User:** [Test user account]

### Summary
[Brief description]

### Steps to Reproduce
1. [Step]
2. [Step]
3. [Step]

### Expected Result
[What should happen]

### Actual Result
[What actually happens]

### Screenshots
[Attach screenshots]

### Console Errors
```
[Console output]
```

### Additional Context
- **Frequency:** [Always/Sometimes/Rare]
- **Workaround:** [Yes/No]
```

### 10.3 Bug Tracking
**Tool:** GitHub Issues

**Labels:**
- `bug`, `severity-1/2/3/4`, `priority-p0/p1/p2/p3`
- Component labels: `auth`, `tournament-form`, `navigation`, `api`
- `needs-reproduction`, `in-testing`

### 10.4 Bug Workflow
1. Discovery & Verification
2. Documentation (use template)
3. Submission to GitHub Issues
4. Triage by Test Lead
5. Assignment to Developer
6. Fix & PR
7. Deployment to Staging
8. QA Verification
9. Closure

---

## Appendix A: Test Data

### Test User Accounts (Staging)
```
# User 1 - Standard user
Email: test.user1@darterassistant.app
Password: TestPass123!

# User 2 - For RLS testing
Email: test.user2@darterassistant.app
Password: TestPass123!

# User 3 - Empty state testing
Email: test.empty@darterassistant.app
Password: TestPass123!
```

### Sample Tournament Data
```json
{
  "name": "Local League Week 1",
  "date": "2025-01-10",
  "result": {
    "match_type_id": 1,
    "average_score": 75.5,
    "first_nine_avg": 80.0,
    "checkout_percentage": 42.5,
    "score_60_count": 8,
    "score_100_count": 3,
    "score_140_count": 1,
    "score_180_count": 0,
    "high_finish": 120,
    "best_leg": 15,
    "worst_leg": 27
  }
}
```

## Appendix B: Key Risk Areas

| Risk | Impact | Mitigation |
|------|--------|------------|
| RLS policy misconfiguration allowing data access across users | **Critical** | Comprehensive RLS testing with multiple users, peer review of policies |
| Multi-step form losing data between steps | **High** | State management testing, back navigation tests |
| Session hijacking/fixation vulnerabilities | **Critical** | Security testing, Supabase Auth best practices |
| Form validation bypass allowing invalid data | **High** | Client and server-side validation testing |
| Match types API failure blocking form | **Medium** | Error handling tests, graceful degradation |
| Password reset email enumeration | **Medium** | Consistent messaging regardless of email existence |

## Appendix C: Validation Rules Reference

### Authentication Forms
- **Email:** Valid email format, required
- **Password:** Minimum 6 characters, required
- **Password Confirmation:** Must match password

### Tournament Form - Step 1
- **Name:** Minimum 3 characters, required
- **Date:** Cannot be future date, required
- **Match Type:** Must select from dropdown, required

### Tournament Form - Step 2
- **Final Placement:** Positive integer
- **Average Score:** 0-180, decimal allowed
- **First Nine Avg:** 0-180, decimal allowed
- **Checkout %:** 0-100, decimal allowed
- **Score Counts:** Non-negative integers (60, 100, 140, 180)
- **High Finish:** 0 or 2-170
- **Best Leg:** Minimum 9 darts
- **Worst Leg:** Minimum 9 darts

---

**Document Version:** 1.0 MVP  
**Last Updated:** November 10, 2025  
**Approved By:** [Test Lead, Product Owner]  
**Next Review:** End of Week 1 testing

