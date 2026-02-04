/**
 * English translations
 */

export const en = {
  // Common
  common: {
    appName: "Top Darter",
    welcome: "Welcome",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    back: "Back",
    next: "Next",
    previous: "Previous",
    submit: "Submit",
    confirm: "Confirm",
    search: "Search",
    filter: "Filter",
    reset: "Reset",
    apply: "Apply",
    viewDetails: "View Details",
  },

  // Navigation
  nav: {
    logout: "Logout",
    login: "Login",
    register: "Register",
    home: "Home",
    profile: "Profile",
    settings: "Settings",
    addTournament: "Add Tournament",
    tournaments: "Tournaments",
    openSidebar: "Open sidebar",
    closeSidebar: "Close sidebar",
  },

  // Auth
  auth: {
    // Login
    loginTitle: "Login",
    loginSubtitle: "Enter your credentials to access your account",
    email: "Email",
    emailPlaceholder: "your.email@example.com",
    password: "Password",
    passwordPlaceholder: "Enter your password",
    rememberMe: "Remember me",
    forgotPassword: "Forgot password?",
    noAccount: "Don't have an account?",
    signUp: "Sign up",
    loggingIn: "Logging in...",

    // Register
    registerTitle: "Create Account",
    registerSubtitle: "Create a new account to get started",
    fullName: "Full Name",
    confirmPassword: "Confirm Password",
    confirmPasswordPlaceholder: "Confirm your password",
    agreeToTerms: "I agree to the Terms and Conditions",
    alreadyHaveAccount: "Already have an account?",
    signIn: "Sign in",
    creatingAccount: "Creating account...",

    // Forgot Password
    forgotPasswordTitle: "Forgot Password",
    forgotPasswordSubtitle: "Enter your email address and we'll send you a reset link",
    sendResetLink: "Send Reset Link",
    sendingResetLink: "Sending...",
    backToLogin: "Back to login",
    resetLinkSent: "Reset link sent! Check your email.",

    // Reset Password
    resetPasswordTitle: "Reset Password",
    resetPasswordSubtitle: "Enter your new password",
    newPassword: "New Password",
    resetPassword: "Reset Password",
    resettingPassword: "Resetting password...",

    // Validation
    emailRequired: "Email is required",
    emailInvalid: "Invalid email address",
    passwordRequired: "Password is required",
    passwordMinLength: "Password must be at least 8 characters",
    passwordUppercase: "Password must contain at least one uppercase letter",
    passwordLowercase: "Password must contain at least one lowercase letter",
    passwordNumber: "Password must contain at least one number",
    passwordsNotMatch: "Passwords do not match",
    nameRequired: "Full name is required",
    termsRequired: "You must agree to the terms and conditions",
  },

  // Tournaments
  tournaments: {
    // List
    title: "Tournaments",
    noTournaments: "No tournaments found",
    loadMore: "Load More",
    tournamentsListTitle: "My Tournaments",
    selectDateRange: "Select Date Range",
    startDate: "Start Date",
    endDate: "End Date",
    showingResults: "Showing {count} tournaments",
    page: "Page",
    of: "of",
    previousPage: "Previous",
    nextPage: "Next",
    tournamentAverage: "Tournament Avg",
    allMatches: "All Matches",
    showMatches: "Show Matches",
    hideMatches: "Hide Matches",
    matchDetails: "Match Details",
    errorLoadingTournaments: "Failed to load tournaments",
    emptyState: "No tournaments in selected date range",
    emptyStateDescription: "Try adjusting the date range or add a new tournament",
    addNewTournament: "Add a new tournament",

    // Add Tournament
    addTitle: "Add Tournament",
    addSubtitle: "Record the results of your latest darts tournament",

    // Form
    basicInfo: "Data",
    metrics: "Metrics",
    review: "Review",
    tournamentName: "Tournament Name",
    tournamentNamePlaceholder: "Enter tournament name",
    tournamentDate: "Tournament Date",
    pickDate: "Pick a date",
    tournamentType: "Tournament Type",
    selectTournamentType: "Select a tournament type",
    finalPlaceOptional: "Final Place (Optional)",
    finalPlacePlaceholder: "Enter final placement (e.g., 1, 2, 3)",
    date: "Date",
    opponent: "Opponent Name",
    opponentPlaceholder: "Enter opponent name",
    result: "Result",
    win: "Win",
    loss: "Loss",
    finalPlace: "Final Place",
    matchType: "Match Type",
    selectMatchType: "Select a match type",
    performanceMetrics: "Performance Metrics",
    averageScore: "Average Score",
    firstNineDartAverage: "First Nine Average",
    checkoutPercentage: "Checkout Percentage",
    highFinish: "High Finish",
    scoreCounts: "Score Counts",
    sixtyPlusScores: "60+ Scores",
    checkout: "Checkout Percentage",
    oneHundredPlus: "100+ Scores",
    oneHundredFortyPlus: "140+ Scores",
    oneHundredEightyScores: "180 Scores",
    oneHundredEightyPlus: "180 Scores",
    legPerformance: "Leg Performance",
    bestLeg: "Best Leg (darts)",
    worstLeg: "Worst Leg (darts)",
    minimumDarts: "Minimum 9 darts",
    newMatch: "New Match",
    matchesPlayed: "Matches Played",
    match: "match",
    matches: "matches",
    addMatch: "Add Match",
    removeMatch: "Remove Match",
    creating: "Creating tournament...",
    created: "Tournament created successfully!",
    error: "Failed to create tournament. Please try again.",

    // Review page
    tournamentInformation: "Tournament Information",
    matchesTitle: "Matches",
    matchNumber: "Match {number}",
    noMatchesYet: "No matches added yet.",
    unknown: "Unknown",
    vs: "vs",
    avgShort: "Avg",
    avgScore: "Avg Score",
    coPercent: "CO%",
    firstNineShort: "1st 9",
    bestLegShort: "Best Leg",
    darts: "darts",
    actions: "Actions",
    removeMatchLabel: "Remove match {number}",
    overallStatistics: "Overall Statistics",
    reviewInfo: "Review your tournament and all matches above. You can add more matches or submit to save.",

    // Toast messages
    performanceAnalysis: "Performance Analysis",
    matchSaved: "Match saved!",
    matchSavedDescription: "Match {number} has been added. Add another or proceed to review.",
    matchRemoved: "Match removed",
    matchRemovedDescription: "Match {number} has been removed.",
    noMatchesAdded: "No matches added",
    noMatchesAddedDescription: "Please fill in the match details and click 'New Match' to add it.",
    noMatchesBeforeReview: "Please add at least one match before proceeding to review.",
    noMatchesToSubmit: "No matches to submit",
    noMatchesToSubmitDescription: "Cannot submit tournament without matches.",
    errorLoadingMatchTypes: "Failed to load match types",
    errorLoadingTournamentTypes: "Failed to load tournament types",

    // Validation
    nameRequired: "Tournament name is required",
    typeRequired: "Tournament type is required",
    dateRequired: "Date is required",
    opponentRequired: "Opponent name is required",
    resultRequired: "Result is required",
    matchTypeRequired: "Match type is required",
    averageScoreRequired: "Average score is required",
    averageScoreMin: "Average score must be at least 1",
    averageScoreMax: "Average score must not exceed 180",
  },

  // Errors
  errors: {
    generic: "Something went wrong. Please try again.",
    network: "Network error. Please check your connection.",
    unauthorized: "You are not authorized to perform this action.",
    notFound: "The requested resource was not found.",
    serverError: "Server error. Please try again later.",
  },

  // Validation
  validation: {
    required: "This field is required",
    invalidEmail: "Invalid email address",
    minLength: "Must be at least {min} characters",
    maxLength: "Must not exceed {max} characters",
    min: "Must be at least {min}",
    max: "Must not exceed {max}",
    pattern: "Invalid format",
  },

  // Guest Homepage
  guest: {
    title: "Find Your Tournament Matches",
    subtitle: "Search for your darts matches from Top Darter tournaments",
    tournamentKeyword: "Tournament Keyword",
    tournamentKeywordPlaceholder: "e.g., my tournament (min. 3 characters)",
    playerNickname: "Your Nickname",
    playerNicknamePlaceholder: "e.g., John Doe (min. 3 characters)",
    searchButton: "Search Matches",
    searching: "Searching...",
    savePlaceholder: "Save Results",
    resultsTitle: "Found Matches",
    noResults: "No matches found",
    noResultsDescription: "Try adjusting your search criteria",
    limitedResults: "Showing up to 30 matches from the last 3 weeks",
    matchesFound: "{count} matches found",
    matchesFoundCombined: "{db} from database + {web} from web search = {total} total matches",
    tournament: "Tournament",
    matchType: "Type",
    yourMatch: "Your match",
    loginToSave: "Login to save and track your matches",
    registerNow: "Create an account",

    // Validation
    keywordMinLength: "Tournament keyword must be at least 3 characters",
    nicknameMinLength: "Nickname must be at least 3 characters",

    // Match details
    playerLabel: "You",
    opponentLabel: "Opponent",
    matchDetails: "Match Details",
    matchResult: "Result",
    matchAverage: "Average",
    matchNoResults: "No results available",
    refreshResults: "Fetch Results",
    refreshingResults: "Fetching...",
    refreshTournamentResults: "Fetch Missing Results",
    fetchMissingResults: "Fetch Missing Results",
    fetchResults: "Fetch",
    fetchingResults: "Fetching",

    // Match types
    matchTypeRr: "Group Stage",
    matchTypeTop32: "Top 32",
    matchTypeTop16: "Top 16",
    matchTypeTop8: "Top 8",
    matchTypeQuarterFinal: "Quarter Final",
    matchTypeSemiFinal: "Semi Final",
    matchTypeFinal: "Final",

    // Two-step search
    searchDatabaseInfo: "First, we'll search our database for your matches (instant results)",
    searchMoreTournaments: "Want to find more tournaments?",
    searchMoreDescription: "Search for specific tournaments by keyword to discover more matches",
    searchTournaments: "Search Tournaments",
    noMatchesInDatabase: "No matches found in database",
    trySearchingByKeyword: "Let's search for tournaments by keyword to find your matches",
    noMatchesFound: "No matches found",
    noMatchesFoundDescription:
      "We couldn't find any matches for your search. Try a different nickname or tournament keyword.",
    startOver: "Start a new search",
    startOverDescription: "Search for a different player",
    newSearch: "New Search",
    startNewSearch: "Start New Search",

    // Under Construction
    underConstructionTitle: "Website Under Construction",
    underConstructionMessage: "We're working hard to bring you an amazing experience. Check back soon!",
    underConstructionThanks: "Thank you for your patience",

    // Player Overview
    performanceOverview: "Performance Overview",
    lastMatches: "Last {count} Matches",
    wins: "Wins",
    losses: "Losses",
    winRate: "Win Rate",
    winLossDistribution: "Win/Loss Distribution",
    strongSides: "Strong Sides",
    areasToImprove: "Areas to Improve",
    playMoreMatches: "Play more matches to see strengths",
    greatPerformance: "Great performance across all areas!",
    score180s: "180s",
    score140s: "140+",
    score100s: "100+",
    checkoutPercent: "CO %",
  },

  // Footer
  footer: {
    madeBy: "Made by topiszajba",
  },
} as const;

// Extract the structure type without literal values
type DeepStringify<T> = T extends string ? string : T extends object ? { [K in keyof T]: DeepStringify<T[K]> } : T;

export type TranslationKeys = DeepStringify<typeof en>;
