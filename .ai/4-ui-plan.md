# UI Architecture for Darter Assistant

## 1. UI Structure Overview
Darter Assistant’s UI comprises public authentication pages and protected routes for core functionality. Upon login, users land on the Dashboard (Tournament History). A persistent topbar navigation (Menubar) provides links to Tournaments and Goals. Forms leverage multi-step steppers or single-page layouts with inline validation. Data lists use skeleton loaders and “Load More” pagination. Detail pages use Tabs to separate content sections. AI feedback is delivered via toasts with modals for full text.

## 2. View List

### 2.1 Login
- View path: `/login`
- Main purpose: Authenticate existing users
- Key information: Email & password inputs, validation messages, links to Signup and Forgot Password
- Key components: Form fields, submit button, inline errors, links
- UX/accessibility: Semantic form, `aria-invalid` on errors, focus on first invalid field
- Security: Password input type, rate-limit error messaging

### 2.2 Signup
- View path: `/signup`
- Main purpose: Register new users
- Key information: Email & password fields with complexity requirements
- Key components: Form, validation hints, submit, link to Login
- UX/accessibility: Password strength indicator, `aria-describedby` for rules
- Security: Client-side validation, secure submission over HTTPS

### 2.3 Forgot Password
- View path: `/forgot-password`
- Main purpose: Request password reset link
- Key information: Email input, confirmation message on submit
- Key components: Form, inline success message
- UX/accessibility: Clear success feedback, focus management
- Security: Prevent email enumeration (generic confirmation)

### 2.4 Dashboard (Tournament History)
- View path: `/`
- Main purpose: List user’s past tournaments
- Key information: Date, name, placement, average score per entry
- Key components: Table (desktop) or Card list (mobile), skeleton loader, Load More button, empty state component, “Add Tournament” action button
- UX/accessibility: Responsive layout with `md:` breakpoints, accessible table headers, button ARIA labels
- Security: Protected route; 403 shows Not Found placeholder

### 2.5 Add Tournament
- View path: `/tournaments/new`
- Main purpose: Create a new tournament record
- Key information: Stepper with three steps: Basic Info, Metrics, Legs & Review
- Key components: Shadcn Stepper, React Hook Form fields, Zod validation, Back/Next controls, final Submit button
- UX/accessibility: Keyboard navigation between steps, `aria-current` on active step, inline error feedback
- Security: Input sanitization, validation before POST

### 2.6 Tournament Detail
- View path: `/tournaments/:id`
- Main purpose: Display a tournament’s full details
- Key information: Tournament metadata, performance metrics, feedback history
- Key components: Header summary, Shadcn Tabs (Overview, Statistics, AI Feedback), content panels, feedback tone selector, “Get Feedback” button
- UX/accessibility: Tab keyboard support, ARIA roles, responsive layout
- Security: Protected route; 404/403 placeholder

### 2.7 Goals List
- View path: `/goals`
- Main purpose: List existing improvement goals
- Key information: Goal target, date range, progress bar percentage
- Key components: Card list, progress bars, skeleton loader, Load More button, empty state, “Create Goal” button
- UX/accessibility: Progress bars with text labels, responsive grid
- Security: Protected route

### 2.8 Create Goal
- View path: `/goals/new`
- Main purpose: Define a new improvement goal
- Key information: Target AVG, start date, end date fields
- Key components: Form with DatePicker, inline validation, Submit button
- UX/accessibility: Accessible DatePicker, `aria-describedby`, error focus
- Security: Validation of date ranges, conflict checks

### 2.9 Goal Detail
- View path: `/goals/:id`
- Main purpose: Show progress and contributors to a goal
- Key information: Goal details, progress percentage, list of tournament contributions
- Key components: Summary header, progress bar, tournament links list, skeletons
- UX/accessibility: Semantic lists, responsive layout
- Security: Protected route; 404/403 placeholder

### 2.10 Not Found Placeholder
- View path: Render on 403/404 across protected pages
- Main purpose: Inform user resource is unavailable or unauthorized
- Key information: Icon, message, link back to Dashboard
- Key components: Placeholder component
- UX/accessibility: Clear messaging, focus on primary action

### 2.11 AI Feedback Modal
- View path: N/A (modal overlay)
- Main purpose: Display full AI feedback text
- Key information: Full message, close control
- Key components: Modal dialog, scrollable content
- UX/accessibility: Focus trap, `aria-modal`, close on ESC
- Security: Sanitize AI content

### 2.12 Toast Container
- View path: Global
- Main purpose: Present transient notifications
- Key information: Feedback messages, errors, confirmations
- Key components: Toast stack (max 3), auto-dismiss timer, accessible live region
- UX/accessibility: `aria-live=
