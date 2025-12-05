# Authentication Architecture Specification - Darter Assistant

## Document Information
- **Version**: 1.0.0
- **Date**: November 7, 2025
- **Author**: Technical Architecture Team
- **Status**: Specification Phase

## Table of Contents
1. [Overview](#overview)
2. [User Interface Architecture](#user-interface-architecture)
3. [Backend Logic](#backend-logic)
4. [Authentication System](#authentication-system)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [Security Considerations](#security-considerations)
7. [Testing Strategy](#testing-strategy)

---

## Overview

### Purpose
This document specifies the architecture for implementing user registration, login, logout, and password recovery functionality in the Darter Assistant application, based on requirements US-010 and US-011 from the PRD.

### Scope (MVP)
- User registration with email and password
- User login with email and password
- User logout functionality
- Password recovery (forgot password flow)
- Protection of main application page
- Session management and persistence
- Integration with existing application structure
- **Simplified Single-Page Interface**: After authentication, users see only the `AddTournamentForm` with minimal header (user email + logout button)
- **No Navigation**: Dashboard, tournament history, and goals are deferred to next phase

### Technical Constraints
- Must use Supabase Auth for authentication backend
- Must maintain compatibility with Astro 5 SSR (server-side rendering)
- Must not break existing tournament data functionality
- Must respect existing RLS (Row Level Security) policies in the database
- No external OAuth providers in MVP (e.g., Google, GitHub)

### Out of Scope (MVP)
- Email verification during registration (mentioned in PRD)
- Two-factor authentication
- Social login providers
- Profile management beyond basic authentication
- Tournament history list (next phase)
- Goal progress display (next phase)
- Dashboard navigation (next phase)
- OAuth callback page (using Supabase default)
- Separate tournament pages (consolidated into main page)

### MVP User Experience

**The Simplified Authentication Flow:**

1. **Unauthenticated User**:
   - Visits application → Redirected to login page
   - Can register new account or log in
   - Can request password reset if needed

2. **After Successful Authentication**:
   - User is redirected to main page (`/`)
   - Page displays:
     - Simple header with app name/logo
     - User email displayed in top-right
     - Logout button in top-right
     - **Main content: `AddTournamentForm` (the only interface in MVP)**
   - No navigation menu or additional pages
   - Single-purpose interface: record tournament data

3. **Post-Tournament Submission**:
   - After saving tournament data (via `AddTournamentForm`)
   - Success toast appears with AI feedback
   - User remains on same page
   - Can immediately add another tournament

4. **Logout**:
   - Click logout button
   - Redirected to login page
   - Session cleared

**Rationale**: This simplified MVP focuses solely on secure tournament data entry. Tournament history, goals, and navigation dashboard will be implemented in the next development phase, building upon this authentication foundation.

### MVP Architecture Summary

**New Files to Create** (19 files):
- **Auth Pages** (5): `login.astro`, `register.astro`, `forgot-password.astro`, `reset-password.astro`, `logout.astro`
- **Auth Forms** (4): `LoginForm.tsx`, `RegisterForm.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`
- **Navigation** (2): `AuthNav.tsx`, `GuestNav.tsx`
- **API Routes** (6): `register.ts`, `login.ts`, `logout.ts`, `forgot-password.ts`, `reset-password.ts`, `session.ts`
- **Services** (1): `auth.service.ts`
- **Utilities** (1): `cookies.ts`

**Files to Modify** (4):
- `src/middleware/index.ts` - Complete rewrite for real authentication
- `src/layouts/Layout.astro` - Add conditional header with user email + logout
- `src/pages/index.astro` - Display AddTournamentForm when authenticated
- `src/types.ts` - Add authentication types (UserDTO, SessionDTO, etc.)

**Files to Remove** (1):
- `src/pages/tournaments/new.astro` - Consolidated into index.astro

**Configuration**:
- Update Supabase Auth email templates
- Set environment variables
- Configure password reset redirect URL

---

## 1. User Interface Architecture

### 1.1 Page Structure

#### 1.1.1 New Authentication Pages

The following 5 new Astro pages will be created under `src/pages/auth/`:

**`src/pages/auth/login.astro`**
- **Purpose**: User login interface
- **Route**: `/auth/login`
- **Rendering Mode**: Server-side rendered (`export const prerender = false`)
- **Authentication State**: Public (redirects to dashboard if already authenticated)
- **Components**:
  - `LoginForm` (React component for interactivity)
  - Form validation with Zod
  - Error message display
  - Link to registration page
  - Link to forgot password page
- **Layout**: Uses `Layout.astro` without authenticated navigation
- **Responsibilities**:
  - Render login form
  - Handle authentication state checks (redirect if already logged in)
  - Pass any error messages from URL parameters to the form

**`src/pages/auth/register.astro`**
- **Purpose**: New user registration interface
- **Route**: `/auth/register`
- **Rendering Mode**: Server-side rendered (`export const prerender = false`)
- **Authentication State**: Public (redirects to dashboard if already authenticated)
- **Components**:
  - `RegisterForm` (React component for interactivity)
  - Form validation with Zod
  - Password strength indicator
  - Password confirmation field
  - Error message display
  - Link to login page
- **Layout**: Uses `Layout.astro` without authenticated navigation
- **Responsibilities**:
  - Render registration form
  - Handle authentication state checks (redirect if already logged in)
  - Pass any error messages from URL parameters to the form

**`src/pages/auth/forgot-password.astro`**
- **Purpose**: Password recovery initiation
- **Route**: `/auth/forgot-password`
- **Rendering Mode**: Server-side rendered (`export const prerender = false`)
- **Authentication State**: Public
- **Components**:
  - `ForgotPasswordForm` (React component)
  - Email input field
  - Success/error message display
  - Link back to login
- **Layout**: Uses `Layout.astro` without authenticated navigation
- **Responsibilities**:
  - Render password recovery request form
  - Display confirmation message after submission

**`src/pages/auth/reset-password.astro`**
- **Purpose**: Password reset interface (accessed via email link)
- **Route**: `/auth/reset-password`
- **Rendering Mode**: Server-side rendered (`export const prerender = false`)
- **Authentication State**: Public (requires valid reset token from URL)
- **Components**:
  - `ResetPasswordForm` (React component)
  - New password field
  - Password confirmation field
  - Error message display
- **Layout**: Uses `Layout.astro` without authenticated navigation
- **Responsibilities**:
  - Validate reset token from URL
  - Render password reset form
  - Handle token expiration errors

**`src/pages/auth/logout.astro`**
- **Purpose**: User logout handler
- **Route**: `/auth/logout`
- **Rendering Mode**: Server-side rendered (`export const prerender = false`)
- **Authentication State**: Protected (requires active session)
- **Responsibilities**:
  - Perform server-side logout
  - Clear authentication cookies
  - Clear Supabase session
  - Redirect to login page

#### 1.1.2 Modified Existing Pages

**`src/pages/index.astro`** (Main Application Page)
- **Current State**: Shows basic welcome or tournament form
- **Required Changes**:
  - Add authentication check in page script
  - **When Authenticated**: Display `AddTournamentForm` component directly
  - **When Not Authenticated**: Redirect to `/auth/login`
- **Layout Integration**: Uses `Layout.astro` with authenticated navigation (user email + logout button)
- **MVP Scope**: This is the only page users see after authentication - simplified single-purpose interface

**`src/layouts/Layout.astro`**
- **Current State**: Basic layout with minimal header
- **Required Changes**:
  - Add conditional rendering based on authentication state
  - **Authenticated State**:
    - Display simple header with app name/logo
    - Show user email in header (top-right area)
    - Display logout button in top-right corner
    - Main content area displays the page slot (which will be `AddTournamentForm`)
    - **No navigation links in MVP** (navigation comes in next phase)
  - **Non-Authenticated State**:
    - Minimal header (app name/logo only)
    - No user information or controls
- **Props to Add**:
  ```typescript
  interface Props {
    title?: string;
    userEmail?: string; // User email to display when authenticated
  }
  ```

### 1.2 React Component Architecture

#### 1.2.1 Authentication Forms (Client Components)

All authentication forms are React components with `client:load` directive for full interactivity.

**`src/components/forms/LoginForm.tsx`**
- **Purpose**: Handle user login with email and password
- **State Management**:
  - Form state using `react-hook-form`
  - Loading state during submission
  - Error state for authentication failures
- **Validation**: Zod schema
  ```typescript
  const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  });
  ```
- **User Interactions**:
  - Email input field
  - Password input field (with show/hide toggle)
  - "Remember me" checkbox (optional for MVP)
  - Submit button (disabled during loading)
  - "Forgot password?" link
  - "Don't have an account? Register" link
- **Validation Cases**:
  - Empty email field
  - Invalid email format
  - Empty password field
  - Password too short (< 8 characters)
- **Error Messages**:
  - Field-level errors (displayed below input)
  - Authentication errors (displayed at form level):
    - "Invalid email or password"
    - "Too many login attempts. Please try again later."
    - "Network error. Please check your connection."
- **Success Behavior**:
  - Call `/api/auth/login` endpoint
  - On success, redirect to dashboard (`/`)
  - On error, display error message

**`src/components/forms/RegisterForm.tsx`**
- **Purpose**: Handle new user registration
- **State Management**:
  - Form state using `react-hook-form`
  - Loading state during submission
  - Error state for registration failures
  - Password strength indicator state
- **Validation**: Zod schema
  ```typescript
  const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
  ```
- **User Interactions**:
  - Email input field
  - Password input field (with show/hide toggle)
  - Confirm password field (with show/hide toggle)
  - Password strength indicator (visual bar)
  - Submit button (disabled during loading)
  - "Already have an account? Login" link
- **Validation Cases**:
  - Empty email field
  - Invalid email format
  - Email already registered
  - Password too short (< 8 characters)
  - Password missing uppercase letter
  - Password missing lowercase letter
  - Password missing number
  - Passwords don't match
- **Error Messages**:
  - Field-level errors (displayed below input)
  - Registration errors (displayed at form level):
    - "Email address is already registered"
    - "Registration failed. Please try again."
    - "Network error. Please check your connection."
- **Success Behavior**:
  - Call `/api/auth/register` endpoint
  - On success, automatically log in user and redirect to dashboard
  - Display welcome toast message

**`src/components/forms/ForgotPasswordForm.tsx`**
- **Purpose**: Request password reset email
- **State Management**:
  - Form state using `react-hook-form`
  - Loading state during submission
  - Success state to show confirmation message
- **Validation**: Zod schema
  ```typescript
  const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email address'),
  });
  ```
- **User Interactions**:
  - Email input field
  - Submit button
  - "Back to login" link
- **Validation Cases**:
  - Empty email field
  - Invalid email format
- **Error Messages**:
  - Field-level errors (displayed below input)
  - Generic error message (don't reveal if email exists for security)
- **Success Behavior**:
  - Call `/api/auth/forgot-password` endpoint
  - Always show success message (even if email doesn't exist)
  - Message: "If an account exists with this email, you will receive password reset instructions."

**`src/components/forms/ResetPasswordForm.tsx`**
- **Purpose**: Set new password after clicking email link
- **State Management**:
  - Form state using `react-hook-form`
  - Loading state during submission
  - Token validation state
- **Validation**: Same password schema as registration
- **User Interactions**:
  - New password field (with show/hide toggle)
  - Confirm password field (with show/hide toggle)
  - Password strength indicator
  - Submit button
- **Validation Cases**:
  - Invalid or expired token (checked on page load)
  - Same as registration password validation
- **Error Messages**:
  - "Reset link has expired. Please request a new one."
  - "Invalid reset link. Please request a new one."
  - Field-level password validation errors
- **Success Behavior**:
  - Call `/api/auth/reset-password` endpoint
  - On success, redirect to login with success message
  - Display toast: "Password reset successfully. Please log in."

#### 1.2.2 Navigation Components

**`src/components/navigation/AuthNav.tsx`**
- **Purpose**: Authenticated user header (simplified for MVP)
- **Props**:
  ```typescript
  interface AuthNavProps {
    userEmail: string;
  }
  ```
- **Elements**:
  - App logo/name (static, no link)
  - User info section in top-right:
    - Display user email
    - Logout button
  - **No navigation links in MVP** (will be added in next phase)
- **Responsibilities**:
  - Display minimal authenticated header
  - Handle logout action (redirects to `/auth/logout`)

**`src/components/navigation/GuestNav.tsx`**
- **Purpose**: Non-authenticated user navigation header
- **Elements**:
  - App logo/name only
  - No navigation links or user controls
- **Responsibilities**:
  - Minimal branding display for auth pages

**Note**: In MVP, the main page directly displays `AddTournamentForm.tsx`. Navigation to different sections will be implemented in the next phase.

#### 1.2.3 Integration with Existing Components

**`src/components/forms/AddTournamentForm.tsx`**
- **Current State**: Already implemented, submits to `/api/tournaments`
- **Required Changes**: None (authentication already handled by middleware)
- **Authentication Dependency**: Requires `locals.user` to be set by middleware
- **Post-Submission Behavior**: Currently redirects to `/` after successful save
  - In MVP, this refreshes the current page (since `/` is the add tournament page)
  - This resets the form for entering another tournament
  - Appropriate behavior for MVP single-page interface

### 1.3 User Flow Scenarios

#### Scenario 1: New User Registration Flow
1. User navigates to `/auth/register`
2. Page checks authentication state (middleware)
   - If already authenticated → redirect to `/`
   - If not authenticated → show registration form
3. User fills in email, password, and password confirmation
4. Client-side validation on blur and submit
5. On submit, POST to `/api/auth/register`
6. API creates user in Supabase Auth
7. API automatically logs in the new user
8. API returns session tokens
9. Cookies are set via API response
10. Client redirects to main page (`/`) showing `AddTournamentForm`
11. Toast message: "Welcome to Darter Assistant!"

#### Scenario 2: Existing User Login Flow
1. User navigates to `/auth/login`
2. Page checks authentication state
   - If already authenticated → redirect to `/`
   - If not authenticated → show login form
3. User fills in email and password
4. Client-side validation on blur and submit
5. On submit, POST to `/api/auth/login`
6. API validates credentials with Supabase Auth
7. API returns session tokens
8. Cookies are set via API response
9. Client redirects to main page (`/`) showing `AddTournamentForm`

#### Scenario 3: Forgot Password Flow
1. User clicks "Forgot password?" on login page
2. Navigate to `/auth/forgot-password`
3. User enters email address
4. On submit, POST to `/api/auth/forgot-password`
5. API sends password reset email via Supabase
6. Page shows confirmation message (regardless of email existence)
7. User checks email
8. User clicks reset link in email
9. Link navigates to `/auth/reset-password?token=...`
10. Page validates token
11. If valid → show reset form
12. If invalid/expired → show error with link to request new reset
13. User enters new password and confirmation
14. On submit, POST to `/api/auth/reset-password`
15. API updates password in Supabase Auth
16. Redirect to login with success message

#### Scenario 4: Logout Flow
1. User clicks logout button in navigation
2. Navigate to `/auth/logout`
3. Page script calls Supabase sign out
4. Server clears authentication cookies
5. Redirect to `/auth/login`

#### Scenario 5: Protected Route Access (Unauthenticated)
1. User tries to access `/` (main page) without authentication
2. Middleware checks for valid session
3. No valid session found
4. Middleware redirects to `/auth/login?redirect=/`
5. After successful login, user is redirected to main page with `AddTournamentForm`

#### Scenario 6: Protected Route Access (Authenticated)
1. User with valid session navigates to `/` (main page)
2. Middleware checks for valid session
3. Valid session found
4. Middleware sets `locals.user` from session
5. Page renders with user context
6. `AddTournamentForm` is displayed with authenticated user access
7. Page shows user email in header with logout button

---

## 2. Backend Logic

### 2.1 API Endpoints

All authentication endpoints are Astro API routes under `src/pages/api/auth/`.

#### 2.1.1 POST `/api/auth/register`

**Purpose**: Create a new user account

**Request Body**:
```typescript
{
  email: string;      // Valid email address
  password: string;   // Min 8 chars, complexity requirements
}
```

**Validation Schema (Zod)**:
```typescript
const registerRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});
```

**Response Success (201)**:
```typescript
{
  user: {
    id: string;
    email: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}
```

**Response Errors**:
- **400 Bad Request**: Validation failed
  ```typescript
  {
    error: 'Validation failed';
    details: Array<{ field: string; message: string }>;
  }
  ```
- **409 Conflict**: Email already registered
  ```typescript
  {
    error: 'Email already registered';
  }
  ```
- **500 Internal Server Error**: Server error
  ```typescript
  {
    error: 'Registration failed';
  }
  ```

**Processing Logic**:
1. Validate request body against schema
2. Check if email is already registered (Supabase will handle this)
3. Call `supabase.auth.signUp({ email, password })`
4. If successful, automatically sign in the user
5. Set HTTP-only cookies for session tokens:
   - `sb-access-token`: Access token
   - `sb-refresh-token`: Refresh token
6. Return user and session data

**Error Handling**:
- Catch Supabase errors and map to appropriate HTTP status codes
- Log errors server-side for debugging
- Return generic error messages to client (don't expose sensitive info)

#### 2.1.2 POST `/api/auth/login`

**Purpose**: Authenticate existing user

**Request Body**:
```typescript
{
  email: string;
  password: string;
}
```

**Validation Schema (Zod)**:
```typescript
const loginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
```

**Response Success (200)**:
```typescript
{
  user: {
    id: string;
    email: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
}
```

**Response Errors**:
- **400 Bad Request**: Validation failed
- **401 Unauthorized**: Invalid credentials
  ```typescript
  {
    error: 'Invalid email or password';
  }
  ```
- **429 Too Many Requests**: Rate limit exceeded
  ```typescript
  {
    error: 'Too many login attempts. Please try again later.';
  }
  ```
- **500 Internal Server Error**: Server error

**Processing Logic**:
1. Validate request body against schema
2. Call `supabase.auth.signInWithPassword({ email, password })`
3. If successful, set HTTP-only cookies for session tokens
4. Return user and session data

**Error Handling**:
- Map Supabase authentication errors to 401
- Implement rate limiting (Supabase handles this by default)
- Log failed attempts for security monitoring

#### 2.1.3 POST `/api/auth/logout`

**Purpose**: End user session

**Request Body**: None (uses cookies)

**Authentication**: Required (must have valid session)

**Response Success (200)**:
```typescript
{
  success: true;
}
```

**Response Errors**:
- **401 Unauthorized**: No active session
- **500 Internal Server Error**: Logout failed

**Processing Logic**:
1. Extract session from cookies
2. Call `supabase.auth.signOut()`
3. Clear authentication cookies:
   - Set `sb-access-token` and `sb-refresh-token` to empty
   - Set expiration to past date
4. Return success response

**Error Handling**:
- Even if Supabase logout fails, clear cookies
- Always return success to client (idempotent operation)

#### 2.1.4 POST `/api/auth/forgot-password`

**Purpose**: Send password reset email

**Request Body**:
```typescript
{
  email: string;
}
```

**Validation Schema (Zod)**:
```typescript
const forgotPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});
```

**Response Success (200)**:
```typescript
{
  message: 'If an account exists with this email, you will receive password reset instructions.';
}
```

**Response Errors**:
- **400 Bad Request**: Validation failed
- **500 Internal Server Error**: Server error

**Processing Logic**:
1. Validate request body against schema
2. Call `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://yourapp.com/auth/reset-password' })`
3. Always return success message (security best practice)

**Error Handling**:
- Don't reveal whether email exists in system
- Log errors but return generic success message
- Supabase handles email delivery

**Configuration Required**:
- Set up email templates in Supabase dashboard
- Configure password reset redirect URL

#### 2.1.5 POST `/api/auth/reset-password`

**Purpose**: Set new password with reset token

**Request Body**:
```typescript
{
  access_token: string;  // From email link
  password: string;      // New password
}
```

**Validation Schema (Zod)**:
```typescript
const resetPasswordRequestSchema = z.object({
  access_token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});
```

**Response Success (200)**:
```typescript
{
  message: 'Password reset successfully';
}
```

**Response Errors**:
- **400 Bad Request**: Validation failed or invalid token
  ```typescript
  {
    error: 'Invalid or expired reset token';
  }
  ```
- **500 Internal Server Error**: Server error

**Processing Logic**:
1. Validate request body against schema
2. Verify reset token with `supabase.auth.verifyOtp({ token_hash: access_token, type: 'recovery' })`
3. If valid, call `supabase.auth.updateUser({ password })`
4. Return success response

**Error Handling**:
- Map invalid token errors to 400
- Handle expired tokens specifically
- Log all reset attempts

#### 2.1.6 GET `/api/auth/session`

**Purpose**: Check current session status and refresh if needed

**Request**: Uses cookies (no body)

**Response Success (200)**:
```typescript
{
  user: {
    id: string;
    email: string;
  } | null;
  authenticated: boolean;
}
```

**Response Errors**:
- **500 Internal Server Error**: Server error

**Processing Logic**:
1. Extract tokens from cookies
2. Call `supabase.auth.getSession()`
3. If session expired but refresh token valid:
   - Refresh session automatically
   - Update cookies
4. Return user data or null

**Error Handling**:
- Return `{ user: null, authenticated: false }` for invalid sessions
- Don't throw errors for unauthenticated requests

### 2.2 Service Layer

#### 2.2.1 Authentication Service

**File**: `src/lib/services/auth.service.ts`

**Purpose**: Centralize authentication business logic

**Exports**:

```typescript
/**
 * Register a new user
 */
export async function registerUser(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<{ data: RegisterResponseDTO | null; error: any }>;

/**
 * Authenticate user with email and password
 */
export async function loginUser(
  supabase: SupabaseClient,
  email: string,
  password: string
): Promise<{ data: LoginResponseDTO | null; error: any }>;

/**
 * Sign out current user
 */
export async function logoutUser(
  supabase: SupabaseClient
): Promise<{ error: any }>;

/**
 * Request password reset email
 */
export async function requestPasswordReset(
  supabase: SupabaseClient,
  email: string,
  redirectUrl: string
): Promise<{ error: any }>;

/**
 * Reset password with token
 */
export async function resetPassword(
  supabase: SupabaseClient,
  accessToken: string,
  newPassword: string
): Promise<{ error: any }>;

/**
 * Get current session and user
 */
export async function getCurrentSession(
  supabase: SupabaseClient
): Promise<{ data: SessionDTO | null; error: any }>;

/**
 * Refresh expired session using refresh token
 */
export async function refreshSession(
  supabase: SupabaseClient,
  refreshToken: string
): Promise<{ data: SessionDTO | null; error: any }>;
```

**Responsibilities**:
- Encapsulate all Supabase Auth calls
- Transform Supabase responses to application DTOs
- Provide consistent error handling
- Abstract authentication logic from API routes

**Error Handling Strategy**:
- Catch Supabase errors
- Map to application-specific error codes
- Return structured error objects
- Log errors for monitoring

#### 2.2.2 Cookie Management Utilities

**File**: `src/lib/utils/cookies.ts`

**Purpose**: Centralize cookie operations for session management

**Exports**:

```typescript
/**
 * Set authentication cookies
 */
export function setAuthCookies(
  cookies: AstroCookies,
  session: SupabaseSession
): void;

/**
 * Clear authentication cookies
 */
export function clearAuthCookies(cookies: AstroCookies): void;

/**
 * Get session tokens from cookies
 */
export function getAuthTokensFromCookies(
  cookies: AstroCookies
): { accessToken: string | null; refreshToken: string | null };

/**
 * Check if user has valid authentication cookies
 */
export function hasAuthCookies(cookies: AstroCookies): boolean;
```

**Cookie Configuration**:
- **Name**: `sb-access-token`, `sb-refresh-token`
- **HttpOnly**: `true` (prevent XSS attacks)
- **Secure**: `true` in production (HTTPS only)
- **SameSite**: `lax` (CSRF protection)
- **Path**: `/`
- **Max-Age**: Access token → 1 hour, Refresh token → 7 days

### 2.3 Data Models and Types

**File**: `src/types.ts` (extend existing file)

**New Type Definitions**:

```typescript
/**
 * User authentication data
 */
export type UserDTO = {
  id: string;
  email: string;
  created_at: string;
};

/**
 * Authentication session data
 */
export type SessionDTO = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: UserDTO;
};

/**
 * Response DTO for registration
 */
export type RegisterResponseDTO = {
  user: UserDTO;
  session: SessionDTO;
};

/**
 * Response DTO for login
 */
export type LoginResponseDTO = {
  user: UserDTO;
  session: SessionDTO;
};

/**
 * Context locals extended with authentication
 */
export type AuthLocals = {
  supabase: SupabaseClient;
  user: UserDTO | null;
  session: SessionDTO | null;
};
```

**Astro Context Types Extension**:

Update `src/env.d.ts`:

```typescript
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    supabase: import('./db/supabase.client').SupabaseClient;
    user: import('./types').UserDTO | null;
    session: import('./types').SessionDTO | null;
  }
}
```

### 2.4 Input Validation

All API endpoints use Zod for input validation. Validation schemas are defined inline in API route files for clarity and maintainability.

**Validation Principles**:
1. Validate all user input on server-side (never trust client)
2. Use Zod's `.safeParse()` to handle validation errors gracefully
3. Return structured error messages with field-level details
4. Apply consistent validation rules across registration and password reset

**Common Validation Rules**:
- **Email**: Must be valid email format
- **Password**: 
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - (Special characters optional for MVP)

### 2.5 Error Handling

#### Error Response Format

All API errors return consistent structure:

```typescript
{
  error: string;           // Human-readable error message
  details?: Array<{        // Optional field-level errors
    field: string;
    message: string;
  }>;
  code?: string;           // Optional error code for client handling
}
```

#### Error Mapping

Map Supabase errors to HTTP status codes:

| Supabase Error | HTTP Status | Client Message |
|---|---|---|
| Invalid credentials | 401 | "Invalid email or password" |
| Email already exists | 409 | "Email already registered" |
| Rate limit exceeded | 429 | "Too many attempts. Try again later." |
| Invalid token | 400 | "Invalid or expired token" |
| Network error | 500 | "Service temporarily unavailable" |
| Unknown error | 500 | "An unexpected error occurred" |

#### Server-Side Logging

All authentication operations are logged:

```typescript
// Example logging structure
{
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  event: 'auth.register' | 'auth.login' | 'auth.logout' | 'auth.forgot-password' | 'auth.reset-password';
  userId?: string;
  email?: string;  // Hash or mask for privacy
  error?: Error;
  metadata?: Record<string, any>;
}
```

### 2.6 Server-Side Rendering Updates

**Current Configuration**: `astro.config.mjs` already has `output: "server"` and `@astrojs/node` adapter.

**No Changes Required**: The existing SSR configuration is sufficient for authentication flow.

**Page-Level Rendering**:
- All authentication pages use `export const prerender = false`
- Protected pages already use `export const prerender = false`
- This ensures server-side authentication checks on every request

---

## 3. Authentication System

### 3.1 Supabase Auth Integration

#### 3.1.1 Supabase Client Configuration

**File**: `src/db/supabase.client.ts`

**Current Implementation**:
- Single Supabase client instance
- Uses anonymous key (public)

**Required Changes**:

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

/**
 * Server-side Supabase client for API routes
 * This client uses the anon key and respects RLS policies
 */
export const supabaseClient = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,  // Manual refresh in middleware
      persistSession: false,    // Sessions managed via cookies
      detectSessionInUrl: false // We handle auth callbacks manually
    }
  }
);

/**
 * Create an authenticated Supabase client with user context
 * Used in middleware to set up per-request authenticated client
 */
export function createAuthenticatedClient(
  accessToken: string,
  refreshToken: string
): typeof supabaseClient {
  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  // Set session manually
  client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });

  return client;
}

export type SupabaseClient = typeof supabaseClient;

// Remove mock user constants (no longer needed)
// export const DEFAULT_USER_ID = '...';
// export const DEFAULT_USER_EMAIL = '...';
```

#### 3.1.2 Environment Variables

**Required Variables**:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Supabase anonymous (public) key
- `SITE_URL`: Application base URL (for email redirect URLs)

**Example `.env` file**:
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGc...
SITE_URL=http://localhost:3000  # or production URL
OPENROUTER_API_KEY=sk-or-v1-xxx  # existing
```

### 3.2 Middleware Authentication

**File**: `src/middleware/index.ts`

**Current Implementation**: Mocks user for development

**Required Complete Rewrite**:

```typescript
import { defineMiddleware } from 'astro:middleware';
import { supabaseClient, createAuthenticatedClient } from '../db/supabase.client';
import { getAuthTokensFromCookies, setAuthCookies } from '../lib/utils/cookies';
import type { UserDTO } from '../types';

/**
 * Protected routes that require authentication
 */
const PROTECTED_ROUTES = [
  '/',                    // Main page with AddTournamentForm (protected)
  '/api/tournaments',    // Tournament API
  '/api/goals',          // Goals API (future)
];

/**
 * Public routes that should redirect to dashboard if authenticated
 */
const AUTH_ROUTES = [
  '/auth/login',
  '/auth/register',
];

/**
 * Check if route requires authentication
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Check if route is an auth page
 */
function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(route => pathname.startsWith(route));
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, cookies, redirect, url } = context;
  const pathname = new URL(request.url).pathname;

  // Get tokens from cookies
  const { accessToken, refreshToken } = getAuthTokensFromCookies(cookies);

  // Set default Supabase client in context
  context.locals.supabase = supabaseClient;
  context.locals.user = null;
  context.locals.session = null;

  // If we have tokens, try to get session
  if (accessToken && refreshToken) {
    try {
      // Create authenticated client
      const authClient = createAuthenticatedClient(accessToken, refreshToken);
      
      // Get current session
      const { data: { session }, error } = await authClient.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
        // Clear invalid cookies
        clearAuthCookies(cookies);
      } else if (session) {
        // Valid session exists
        context.locals.supabase = authClient;
        context.locals.user = {
          id: session.user.id,
          email: session.user.email!,
          created_at: session.user.created_at,
        } as UserDTO;
        context.locals.session = {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at || 0,
          user: context.locals.user,
        };

        // Check if token was refreshed
        if (session.access_token !== accessToken) {
          // Update cookies with new tokens
          setAuthCookies(cookies, session);
        }

        // If accessing auth routes while authenticated, redirect to dashboard
        if (isAuthRoute(pathname)) {
          return redirect('/');
        }
      } else {
        // No valid session
        clearAuthCookies(cookies);
      }
    } catch (error) {
      console.error('Unexpected error in auth middleware:', error);
      clearAuthCookies(cookies);
    }
  }

  // Check if route requires authentication
  if (isProtectedRoute(pathname)) {
    if (!context.locals.user) {
      // Not authenticated, redirect to login
      const loginUrl = new URL('/auth/login', url.origin);
      loginUrl.searchParams.set('redirect', pathname);
      return redirect(loginUrl.toString());
    }
  }

  // Allow request to proceed
  return next();
});
```

**Key Responsibilities**:
1. Extract authentication tokens from cookies
2. Validate session with Supabase
3. Refresh expired tokens automatically
4. Set authenticated user in `context.locals`
5. Protect routes requiring authentication
6. Redirect authenticated users away from auth pages
7. Handle session refresh and cookie updates

### 3.3 Session Management

#### 3.3.1 Session Flow

1. **Login/Registration**:
   - Supabase returns access token (1 hour) and refresh token (7 days)
   - Tokens stored in HTTP-only cookies
   - User data cached in `context.locals.user`

2. **Authenticated Request**:
   - Middleware extracts tokens from cookies
   - Validates access token with Supabase
   - If expired, automatically refreshes using refresh token
   - Updates cookies with new tokens
   - Sets user context for request

3. **Token Refresh**:
   - Handled automatically in middleware
   - Transparent to user
   - New tokens set in cookies
   - No client-side JavaScript needed

4. **Logout**:
   - Explicit logout via `/auth/logout`
   - Cookies cleared
   - Supabase session invalidated
   - User redirected to login

5. **Session Expiry**:
   - Access token expires after 1 hour
   - Refresh token expires after 7 days
   - After refresh token expiry, user must log in again

#### 3.3.2 Cookie Security

**Cookie Attributes**:
```typescript
{
  httpOnly: true,      // Prevent XSS access
  secure: true,        // HTTPS only in production
  sameSite: 'lax',     // CSRF protection
  path: '/',           // Available site-wide
  maxAge: 604800,      // 7 days for refresh token
}
```

**Security Benefits**:
- **HttpOnly**: JavaScript cannot access tokens (prevents XSS)
- **Secure**: Cookies only sent over HTTPS in production
- **SameSite**: Protects against CSRF attacks
- **Short-lived access tokens**: Limits exposure if compromised

### 3.4 Row Level Security (RLS)

**Current State**: Database already has RLS policies defined in migration

**RLS Policies** (from `supabase/migrations/20251027140000_initial_schema.sql`):
- Tournaments: User can only access own records
- Tournament results: User can only access results from own tournaments
- Goals: User can only access own goals

**Authentication Integration**:
- RLS uses `auth.uid()` to identify current user
- Supabase automatically sets `auth.uid()` from access token
- No changes needed to RLS policies
- Authenticated Supabase client automatically enforces RLS

**Testing RLS**:
- Verify users cannot access other users' data
- Test all CRUD operations with authenticated client
- Ensure anonymous access is properly restricted

### 3.5 Password Recovery Email Configuration

**Supabase Email Templates**:

Configure in Supabase Dashboard → Authentication → Email Templates

**Password Reset Email**:
- **Subject**: "Reset your Darter Assistant password"
- **Body**: 
  ```html
  <h2>Reset your password</h2>
  <p>Click the link below to reset your password:</p>
  <p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
  <p>If you didn't request this, please ignore this email.</p>
  <p>This link expires in 1 hour.</p>
  ```
- **Redirect URL**: `https://yourapp.com/auth/reset-password`

**Email Settings**:
- **From address**: Set up custom domain or use Supabase default
- **From name**: "Darter Assistant"
- **Token expiry**: 1 hour (default)

---

## 4. Data Flow Diagrams

### 4.1 Registration Flow

```
┌─────────┐         ┌──────────────┐         ┌─────────────┐         ┌──────────┐
│ Browser │         │ RegisterForm │         │ API Route   │         │ Supabase │
└────┬────┘         └──────┬───────┘         └──────┬──────┘         └────┬─────┘
     │                     │                         │                      │
     │  1. Fill form       │                         │                      │
     ├────────────────────>│                         │                      │
     │                     │                         │                      │
     │  2. Submit          │                         │                      │
     ├────────────────────>│                         │                      │
     │                     │  3. POST /api/auth/     │                      │
     │                     │     register            │                      │
     │                     ├────────────────────────>│                      │
     │                     │                         │  4. signUp()         │
     │                     │                         ├─────────────────────>│
     │                     │                         │                      │
     │                     │                         │  5. User created     │
     │                     │                         │<─────────────────────┤
     │                     │                         │                      │
     │                     │  6. Set cookies +       │                      │
     │                     │     return session      │                      │
     │                     │<────────────────────────┤                      │
     │                     │                         │                      │
     │  7. Redirect to     │                         │                      │
     │     dashboard       │                         │                      │
     │<────────────────────┤                         │                      │
```

### 4.2 Login Flow

```
┌─────────┐         ┌───────────┐         ┌─────────────┐         ┌──────────┐
│ Browser │         │ LoginForm │         │ API Route   │         │ Supabase │
└────┬────┘         └─────┬─────┘         └──────┬──────┘         └────┬─────┘
     │                    │                        │                     │
     │  1. Enter creds    │                        │                     │
     ├───────────────────>│                        │                     │
     │                    │  2. POST /api/auth/    │                     │
     │                    │     login              │                     │
     │                    ├───────────────────────>│                     │
     │                    │                        │  3. signInWith      │
     │                    │                        │     Password()      │
     │                    │                        ├────────────────────>│
     │                    │                        │                     │
     │                    │                        │  4. Session data    │
     │                    │                        │<────────────────────┤
     │                    │  5. Set cookies +      │                     │
     │                    │     return session     │                     │
     │                    │<───────────────────────┤                     │
     │  6. Redirect       │                        │                     │
     │<───────────────────┤                        │                     │
```

### 4.3 Protected Route Access Flow

```
┌─────────┐    ┌────────────┐    ┌───────────────┐    ┌──────────┐
│ Browser │    │ Middleware │    │ Protected Page│    │ Supabase │
└────┬────┘    └─────┬──────┘    └───────┬───────┘    └────┬─────┘
     │               │                    │                  │
     │  1. Request   │                    │                  │
     │  /tournaments │                    │                  │
     ├──────────────>│                    │                  │
     │               │  2. Extract        │                  │
     │               │     cookies        │                  │
     │               ├─┐                  │                  │
     │               │ │                  │                  │
     │               │<┘                  │                  │
     │               │  3. getSession()   │                  │
     │               ├────────────────────┼─────────────────>│
     │               │                    │                  │
     │               │  4. User data      │                  │
     │               │<────────────────────┼──────────────────┤
     │               │  5. Set locals.user│                  │
     │               ├─┐                  │                  │
     │               │ │                  │                  │
     │               │<┘                  │                  │
     │               │  6. next()         │                  │
     │               ├───────────────────>│                  │
     │               │                    │  7. Render with  │
     │               │                    │     user context │
     │               │                    ├─┐                │
     │               │                    │ │                │
     │               │                    │<┘                │
     │               │  8. HTML response  │                  │
     │               │<───────────────────┤                  │
     │  9. Page      │                    │                  │
     │<──────────────┤                    │                  │
```

### 4.4 Password Reset Flow

```
┌─────────┐  ┌─────────────────┐  ┌─────────────┐  ┌──────────┐  ┌───────┐
│ Browser │  │ ForgotPassword  │  │ API Route   │  │ Supabase │  │ Email │
│         │  │ Form            │  │             │  │          │  │       │
└────┬────┘  └────────┬────────┘  └──────┬──────┘  └────┬─────┘  └───┬───┘
     │                │                   │              │            │
     │  1. Enter email│                   │              │            │
     ├───────────────>│                   │              │            │
     │                │  2. POST /api/    │              │            │
     │                │     auth/forgot   │              │            │
     │                ├──────────────────>│              │            │
     │                │                   │  3. reset    │            │
     │                │                   │     Password │            │
     │                │                   │     ForEmail()            │
     │                │                   ├─────────────>│            │
     │                │                   │              │  4. Send   │
     │                │                   │              │     email  │
     │                │                   │              ├───────────>│
     │                │                   │              │            │
     │                │  5. Success msg   │              │            │
     │                │<──────────────────┤              │            │
     │  6. Show       │                   │              │  7. Email  │
     │     confirm    │                   │              │     sent   │
     │<───────────────┤                   │              │<───────────┤
     │                │                   │              │            │
     │  8. Click link in email            │              │            │
     ├────────────────────────────────────┼──────────────┼───────────>│
     │                                    │              │            │
     │  9. Navigate to /auth/reset-password?token=xxx    │            │
     ├────────────────────────────────────┼──────────────┤            │
     │                                    │              │            │
     │  10. Enter new password            │              │            │
     ├──────────────────────────────────────────────────>│            │
     │                                    │              │            │
     │  11. POST /api/auth/reset-password │              │            │
     ├────────────────────────────────────┼─────────────>│            │
     │                                    │              │            │
     │  12. Password updated              │              │            │
     │<────────────────────────────────────┼──────────────┤            │
     │                                    │              │            │
     │  13. Redirect to login             │              │            │
     │<───────────────────────────────────┤              │            │
```

---

## 5. Security Considerations

### 5.1 Authentication Security

#### Password Requirements
- **Minimum length**: 8 characters
- **Complexity**: At least one uppercase, lowercase, and number
- **Storage**: Hashed by Supabase (bcrypt or better)
- **Never logged**: Passwords never appear in logs

#### Session Security
- **Token storage**: HTTP-only cookies (no localStorage)
- **Token lifetime**: Access token 1 hour, refresh token 7 days
- **Automatic refresh**: Middleware handles token refresh transparently
- **Secure transmission**: HTTPS only in production

#### CSRF Protection
- **SameSite cookies**: Set to `lax` or `strict`
- **State validation**: Verify requests originate from app
- **No need for CSRF tokens**: Cookie-based auth with SameSite is sufficient

#### XSS Protection
- **HTTP-only cookies**: JavaScript cannot access tokens
- **Content Security Policy**: Implement CSP headers
- **Input sanitization**: All user input validated and escaped
- **Framework protection**: React/Astro auto-escapes content

#### Brute Force Protection
- **Rate limiting**: Supabase provides built-in rate limiting
- **Account lockout**: Supabase handles temporary lockouts
- **Login attempt logging**: Track failed attempts for monitoring

### 5.2 Authorization Security

#### Row Level Security (RLS)
- **Enabled on all tables**: Enforced at database level
- **User isolation**: Users can only access own data
- **Policy testing**: Verify RLS with different user contexts
- **No bypass**: Even service role must respect RLS policies

#### API Authorization
- **Check user context**: Verify `locals.user` in all protected routes
- **Validate ownership**: Double-check user owns requested resources
- **Fail securely**: Deny access by default

### 5.3 Data Protection

#### Sensitive Data Handling
- **Email privacy**: Hash or mask emails in logs
- **No password exposure**: Never return passwords in responses
- **Secure error messages**: Don't reveal system internals
- **GDPR compliance**: Allow users to delete their data

#### Transport Security
- **HTTPS required**: Enforce in production
- **Strict-Transport-Security**: Set HSTS header
- **Certificate validation**: Use valid SSL certificates

### 5.4 Security Best Practices

1. **Environment variables**: Never commit secrets to version control
2. **Dependency updates**: Regularly update Supabase client and dependencies
3. **Error handling**: Log errors server-side, return generic messages to client
4. **Input validation**: Validate all input on server-side
5. **Output encoding**: Escape all user-generated content
6. **Security headers**: Set CSP, X-Frame-Options, X-Content-Type-Options
7. **Monitoring**: Log authentication events for security analysis
8. **Incident response**: Plan for handling compromised accounts

---

## 6. Testing Strategy

### 6.1 Unit Tests

**Authentication Service Tests** (`src/lib/services/auth.service.test.ts`):
- `registerUser()`: Success, duplicate email, invalid password
- `loginUser()`: Success, invalid credentials, locked account
- `logoutUser()`: Success, already logged out
- `requestPasswordReset()`: Success, non-existent email
- `resetPassword()`: Success, expired token, invalid token
- `getCurrentSession()`: Valid session, expired session, no session
- `refreshSession()`: Success, invalid refresh token

**Cookie Utilities Tests** (`src/lib/utils/cookies.test.ts`):
- `setAuthCookies()`: Correct attributes, expiration
- `clearAuthCookies()`: Cookies removed
- `getAuthTokensFromCookies()`: Extract tokens, handle missing cookies
- `hasAuthCookies()`: Detect presence of auth cookies

### 6.2 Integration Tests

**API Route Tests**:
- **POST /api/auth/register**:
  - Valid registration
  - Duplicate email
  - Invalid email format
  - Weak password
  - Missing fields
- **POST /api/auth/login**:
  - Valid credentials
  - Invalid credentials
  - Missing fields
  - Rate limiting
- **POST /api/auth/logout**:
  - Successful logout
  - Already logged out
- **POST /api/auth/forgot-password**:
  - Valid email
  - Invalid email
  - Non-existent email (still success)
- **POST /api/auth/reset-password**:
  - Valid token
  - Expired token
  - Invalid token
  - Weak new password
- **GET /api/auth/session**:
  - Valid session
  - Expired session
  - No session

**Middleware Tests**:
- Protected route without authentication → redirect to login
- Protected route with valid session → allow access
- Auth page with valid session → redirect to dashboard
- Public route → always allow access
- Session refresh on expired access token
- Invalid cookie handling

### 6.3 End-to-End Tests

**User Registration Flow**:
1. Navigate to registration page
2. Fill in form with valid data
3. Submit form
4. Verify redirect to dashboard
5. Verify user appears in Supabase Auth

**User Login Flow**:
1. Navigate to login page
2. Enter valid credentials
3. Submit form
4. Verify redirect to dashboard
5. Verify cookies are set

**Protected Route Access**:
1. Clear cookies
2. Navigate to `/` (main page)
3. Verify redirect to `/auth/login`
4. Log in
5. Verify redirect back to `/` showing `AddTournamentForm`

**Password Reset Flow**:
1. Navigate to forgot password page
2. Enter email
3. Submit form
4. Check for password reset email (use Supabase logs or test email)
5. Extract reset link
6. Navigate to reset password page
7. Enter new password
8. Submit form
9. Log in with new password

**Logout Flow**:
1. Log in
2. Navigate to dashboard
3. Click logout button
4. Verify redirect to login page
5. Verify cookies are cleared
6. Try to access protected route
7. Verify redirect to login

### 6.4 Security Tests

**Authentication**:
- Password brute force protection
- SQL injection in login form
- XSS in registration form
- Session hijacking prevention

**Authorization**:
- User A cannot access User B's tournaments
- User A cannot create tournament for User B
- RLS policy enforcement

**Session Management**:
- Token expiration handling
- Token refresh mechanism
- Logout invalidates tokens
- Concurrent session handling

### 6.5 Testing Tools

- **Unit & Integration**: Vitest
- **E2E**: Playwright or Cypress
- **API Testing**: Supertest or fetch in tests
- **Database**: Use Supabase local dev or test project
- **Mocking**: Mock Supabase client for unit tests

---

## 7. Implementation Checklist

### Phase 1: Foundation
- [ ] Update `src/db/supabase.client.ts` with auth configuration
- [ ] Create `src/lib/utils/cookies.ts` for cookie management
- [ ] Update `src/env.d.ts` with authentication types
- [ ] Add authentication types to `src/types.ts`
- [ ] Create `src/lib/services/auth.service.ts`

### Phase 2: API Routes
- [ ] Create `src/pages/api/auth/register.ts`
- [ ] Create `src/pages/api/auth/login.ts`
- [ ] Create `src/pages/api/auth/logout.ts`
- [ ] Create `src/pages/api/auth/forgot-password.ts`
- [ ] Create `src/pages/api/auth/reset-password.ts`
- [ ] Create `src/pages/api/auth/session.ts`

### Phase 3: Middleware
- [ ] Rewrite `src/middleware/index.ts` with authentication logic
- [ ] Remove mock user code
- [ ] Implement protected route checks
- [ ] Implement session refresh
- [ ] Test middleware with various scenarios

### Phase 4: UI Components
- [ ] Create `src/components/forms/LoginForm.tsx`
- [ ] Create `src/components/forms/RegisterForm.tsx`
- [ ] Create `src/components/forms/ForgotPasswordForm.tsx`
- [ ] Create `src/components/forms/ResetPasswordForm.tsx`
- [ ] Create `src/components/navigation/AuthNav.tsx`
- [ ] Create `src/components/navigation/GuestNav.tsx`

### Phase 5: Pages
- [ ] Create `src/pages/auth/login.astro`
- [ ] Create `src/pages/auth/register.astro`
- [ ] Create `src/pages/auth/forgot-password.astro`
- [ ] Create `src/pages/auth/reset-password.astro`
- [ ] Create `src/pages/auth/logout.astro`
- [ ] Update `src/layouts/Layout.astro` with conditional header (user email + logout)
- [ ] Update `src/pages/index.astro` to display `AddTournamentForm` when authenticated
- [ ] Remove `src/pages/tournaments/new.astro` (consolidated into index.astro)

### Phase 6: Configuration
- [ ] Configure Supabase email templates
- [ ] Set password reset redirect URL in Supabase
- [ ] Add environment variables
- [ ] Test email delivery

### Phase 7: Testing
- [ ] Write unit tests for auth service
- [ ] Write integration tests for API routes
- [ ] Write middleware tests
- [ ] Write E2E tests for user flows
- [ ] Perform security testing

### Phase 8: Documentation
- [ ] Update README with authentication setup
- [ ] Document environment variables
- [ ] Create user guide for authentication features
- [ ] Document API endpoints

---

## 8. Dependencies

### New Dependencies Required
None! All required packages are already in the project:
- `@supabase/supabase-js` - Already installed
- `zod` - Already installed (used in existing API routes)
- `react-hook-form` - Already installed
- `@hookform/resolvers` - Already installed

### Existing Dependencies Used
- `@astrojs/react` - For authentication forms
- `@astrojs/node` - For SSR support
- `sonner` - For toast notifications (already used in AddTournamentForm)
- `@radix-ui/react-*` - For UI components (via shadcn/ui)

---

## 9. Migration Path

### Step 1: Backward Compatibility
Current application uses mock user with hardcoded ID. To ensure smooth transition:
1. Implement authentication without removing mock user code initially
2. Add feature flag to switch between mock and real auth
3. Test authentication thoroughly in development
4. Deploy authentication
5. Remove mock user code in subsequent release

### Step 2: Existing Data
Current database already has `user_id` fields and RLS policies. No migration needed for existing data since it was created with the mock user ID. 

**Recommended approach for MVP**:
- **Clear test data**: Since MVP is in development phase with no production users, it's safe to clear all existing test tournament data
- This provides a clean slate for testing authentication
- Real users will create their own data after authentication is implemented

**Alternative approaches** (if preserving test data is needed):
1. **Keep existing data**: Assign all existing tournaments/goals to a specific test user account
2. **Migrate data**: Create a migration script to reassign test data to real users

### Step 3: Environment Setup
1. Ensure Supabase project has Auth enabled (default)
2. Configure email templates in Supabase dashboard
3. Set up environment variables in deployment
4. Test email delivery

### Step 4: Deployment
1. Deploy authentication code to staging
2. Test all authentication flows
3. Verify protected routes work correctly
4. Test existing tournament functionality still works
5. Deploy to production
6. Monitor for errors

---

## 10. Future Enhancements (Post-MVP)

### Next Phase: Dashboard & History (Immediate Priority)
- **Tournament History Page**: List all user tournaments with pagination
- **Dashboard Navigation**: Add navigation menu to access different sections
- **Goal Management UI**: Create and track improvement goals
- **Goal Progress Display**: Show progress toward active goals
- **Tournament Details Page**: View detailed stats for individual tournaments
- **Edit/Delete Tournaments**: Modify or remove existing tournament data

### Email Verification
- Require email verification before allowing login
- Add email verification API route
- Update registration flow

### Social Login
- Add OAuth providers (Google, GitHub)
- Update login/register pages
- Handle OAuth callback

### Two-Factor Authentication
- Implement TOTP (Time-based One-Time Password)
- Add 2FA setup flow
- Enforce 2FA for sensitive operations

### Account Management
- User profile page
- Change email
- Change password (while logged in)
- Delete account

### Session Management UI
- View active sessions
- Revoke sessions
- Login history

### Advanced Security
- Device fingerprinting
- Suspicious activity detection
- IP-based rate limiting
- Account recovery security questions

---

## Appendix A: API Contract Reference

### Authentication API Endpoints

| Endpoint | Method | Auth Required | Purpose |
|---|---|---|---|
| `/api/auth/register` | POST | No | Create new user account |
| `/api/auth/login` | POST | No | Authenticate user |
| `/api/auth/logout` | POST | Yes | End user session |
| `/api/auth/forgot-password` | POST | No | Request password reset |
| `/api/auth/reset-password` | POST | No | Set new password |
| `/api/auth/session` | GET | No | Check session status |

### Request/Response Schemas

See detailed schemas in Section 2.1 API Endpoints.

---

## Appendix B: Database Schema

No changes required to database schema. Existing tables already have:
- `user_id` columns referencing `auth.users(id)`
- RLS policies using `auth.uid()`
- Proper indexes and constraints

Authentication uses Supabase's built-in `auth.users` table.

---

## Appendix C: Environment Variables

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# Application Configuration
SITE_URL=http://localhost:3000  # or production URL

# AI Service (existing)
OPENROUTER_API_KEY=sk-or-v1-your-key
```

---

## Document History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2025-11-07 | Technical Architecture Team | Initial specification |
| 1.1.0 | 2025-11-07 | Technical Architecture Team | MVP simplification: removed tournament history, goals, navigation, and callback page; consolidated all functionality into single-page interface with AddTournamentForm |

---

## Sign-Off

This specification has been reviewed and approved for implementation.

**Next Steps**:
1. Review with development team
2. Estimate implementation time
3. Create implementation tasks
4. Begin Phase 1 development

---

*End of Authentication Architecture Specification*

