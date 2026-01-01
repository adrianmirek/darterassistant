# Tournaments List UI - Component Architecture

## Component Hierarchy

```
tournaments/index.astro (Astro Page - SSR + Protected Route)
└── TournamentsPage.tsx (React - Main Container)
    ├── PageHeader (Display Title & Description)
    ├── DateRangePicker.tsx (Date Filter)
    │   ├── Popover (from shadcn/ui)
    │   ├── Calendar (from shadcn/ui)
    │   └── Button (from shadcn/ui)
    ├── [Loading State]
    │   └── Skeleton.tsx (×3 cards)
    ├── [Error State]
    │   └── Alert (from shadcn/ui)
    ├── [Empty State]
    │   └── Custom empty message
    ├── TournamentCard.tsx (×N - Grid of tournaments)
    │   ├── Card (from shadcn/ui)
    │   ├── Badge (Tournament type, placement)
    │   ├── StatCard (×8 - Statistics display)
    │   └── Accordion (Collapsible matches)
    │       └── MatchCard.tsx (×M - per tournament)
    │           ├── Badge (Win/Loss result)
    │           └── StatItem (×9 - Match statistics)
    └── PaginationControls.tsx (Navigation)
        └── Button (from shadcn/ui - multiple)
```

## Data Flow

```
┌─────────────────────────────────────────────────┐
│            User Interaction                     │
│  (Date selection, page navigation)              │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│         TournamentsPage State                   │
│  - startDate, endDate                           │
│  - currentPage, pageSize                        │
│  - loading, error                               │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│         API Call (useEffect)                    │
│  GET /api/tournaments/list?start_date=...       │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│        Supabase Function                        │
│  get_tournaments_paginated(...)                 │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│         Response Processing                     │
│  - tournaments: TournamentListItem[]            │
│  - pagination: PaginationMetadata               │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│          Render Components                      │
│  - Map tournaments to TournamentCard            │
│  - Each card maps matches to MatchCard          │
│  - Display pagination controls                  │
└─────────────────────────────────────────────────┘
```

## State Management

### TournamentsPage Component State

```typescript
const [endDate, setEndDate] = useState<Date>(new Date());
const [startDate, setStartDate] = useState<Date>(subMonths(new Date(), 1));
const [currentPage, setCurrentPage] = useState(1);
const [pageSize] = useState(20);
const [data, setData] = useState<PaginatedTournamentsData | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

### State Triggers

1. **Initial Mount**
   - Sets default date range (1 month)
   - Triggers API call
   - Shows loading skeletons

2. **Date Range Change**
   - Updates startDate/endDate
   - Resets currentPage to 1
   - Triggers new API call

3. **Page Change**
   - Updates currentPage
   - Scrolls to top
   - Triggers new API call

4. **API Response**
   - Success: Updates data, clears loading/error
   - Error: Sets error message, clears loading

## Component Responsibilities

### TournamentsPage
- **State Management**: Manages all filter and pagination state
- **Data Fetching**: Calls API and handles responses
- **Conditional Rendering**: Shows loading/error/empty/success states
- **Layout**: Organizes header, filters, content, pagination

### DateRangePicker
- **Date Selection**: Two calendar pickers (start & end)
- **Validation**: Ensures start ≤ end, both ≤ today
- **Auto-apply**: Triggers parent callback on valid selection
- **UI**: Responsive layout with labels and popovers

### TournamentCard
- **Display**: Shows tournament header, stats, and AI feedback
- **Accordion**: Manages collapsible matches section
- **Statistics**: Formats and highlights key metrics
- **Layout**: Card with header and content sections

### MatchCard
- **Display**: Shows match opponent, result, and statistics
- **Badge**: Color-coded win/loss indicator
- **Statistics**: Grid of match performance metrics
- **Highlighting**: Emphasizes non-zero score counts

### PaginationControls
- **Navigation**: Previous/Next buttons
- **Page Numbers**: Smart display with ellipsis
- **Disabled States**: Handles boundary conditions
- **Callbacks**: Notifies parent of page changes

## Styling Architecture

### Tailwind Utility Classes
- Responsive breakpoints: `sm:`, `md:`, `lg:`
- Dark mode: `dark:` variant (automatically applied)
- State variants: `hover:`, `focus:`, `disabled:`
- Grid layouts: `grid`, `grid-cols-*`, `gap-*`

### Custom Animations
- Accordion expand/collapse: `animate-accordion-down/up`
- Hover effects: `transition-*` utilities
- Loading skeletons: `animate-pulse`

### Color Theming
- Uses CSS variables from `global.css`
- Automatically switches with theme toggle
- Consistent with existing design system

## Accessibility Features

1. **Semantic HTML**
   - Proper heading hierarchy (h1, h2, h3)
   - Section and article elements
   - Button elements (not divs)

2. **ARIA Attributes**
   - `aria-label` on icon-only buttons
   - `aria-expanded` on accordion triggers
   - `aria-controls` on interactive elements

3. **Keyboard Navigation**
   - Tab order follows visual order
   - Enter/Space activates buttons
   - Arrow keys in date pickers

4. **Screen Readers**
   - All images have alt text
   - Loading states announced
   - Error messages are live regions

5. **Color Contrast**
   - Text meets WCAG AA standards
   - Interactive elements have sufficient contrast
   - Focus indicators are visible

## Performance Considerations

### Rendering Optimization
- React component uses client:load directive
- Only interactive parts use React
- Static content remains in Astro

### Data Fetching
- Pagination limits data per request (20 items)
- Date range prevents unbounded queries
- Loading states provide immediate feedback

### Bundle Size
- Tree-shakeable imports from lucide-react
- Modular Shadcn/ui components
- date-fns imported functions only

### User Experience
- Skeleton loading (better than spinners)
- Smooth animations (CSS-based)
- Auto-scroll on page change
- Responsive design (no horizontal scroll)

## Internationalization (i18n)

All text content is translatable:
- Component uses `useTranslation()` hook
- Translation keys in `en.ts` and `pl.ts`
- Date formatting respects locale (via date-fns)
- Numbers formatted with locale-specific separators

## Integration Points

### API Endpoint
- **URL**: `/api/tournaments/list`
- **Method**: GET
- **Auth**: Session cookie (automatic)
- **Response**: Typed ApiResponse<PaginatedTournamentsData>

### Supabase Function
- **Name**: `get_tournaments_paginated`
- **Security**: DEFINER (row-level filtering by user_id)
- **Returns**: Tournaments with nested matches as JSONB

### Navigation
- **Sidebar Link**: "Tournaments" with Trophy icon
- **Route**: `/tournaments`
- **Protection**: Requires authentication

## Error Handling

1. **Network Errors**
   - Displays error message in Alert component
   - Suggests checking connection

2. **API Errors**
   - Shows server error message
   - Includes details in dev mode

3. **Validation Errors**
   - Date picker prevents invalid selections
   - API validates all parameters

4. **Empty States**
   - Helpful message when no data
   - Suggests adjusting filters

## Testing Strategy

### Unit Tests (Vitest + React Testing Library)
- DateRangePicker date validation
- PaginationControls page number generation
- StatItem/StatCard rendering
- Badge variant selection

### Integration Tests
- TournamentsPage with mocked API
- Error handling flows
- Loading state transitions
- Empty state rendering

### E2E Tests (Playwright)
- Complete user journey
- Date range selection
- Pagination navigation
- Accordion interaction
- Responsive layouts

## Future Architecture Considerations

1. **State Management Library**
   - If complexity grows, consider Zustand or Jotai
   - Centralized store for filters and cache

2. **Query Library**
   - React Query for advanced caching
   - Optimistic updates
   - Background refetching

3. **Virtual Scrolling**
   - For very large datasets
   - Libraries like react-window or react-virtual

4. **Web Workers**
   - Offload heavy calculations
   - JSON parsing for large responses

5. **Progressive Enhancement**
   - SSR version without JavaScript
   - Enhanced with React on client

