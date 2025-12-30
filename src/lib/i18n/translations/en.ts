/**
 * English translations
 */

export const en = {
  // Common
  common: {
    appName: "Darter Assistant",
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

  // Footer
  footer: {
    madeBy: "Made by topiszajba",
  },
} as const;

// Extract the structure type without literal values
type DeepStringify<T> = T extends string ? string : T extends object ? { [K in keyof T]: DeepStringify<T[K]> } : T;

export type TranslationKeys = DeepStringify<typeof en>;
