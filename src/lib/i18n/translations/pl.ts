/**
 * Polish translations
 */

import type { TranslationKeys } from "./en";

export const pl: TranslationKeys = {
  // Common
  common: {
    appName: "Asystent Dartera",
    welcome: "Witaj",
    loading: "Ładowanie...",
    error: "Błąd",
    success: "Sukces",
    cancel: "Anuluj",
    save: "Zapisz",
    delete: "Usuń",
    edit: "Edytuj",
    close: "Zamknij",
    back: "Wstecz",
    next: "Dalej",
    previous: "Poprzedni",
    submit: "Zapisz",
    confirm: "Potwierdź",
    search: "Szukaj",
    filter: "Filtruj",
    reset: "Resetuj",
    apply: "Zastosuj",
  },

  // Navigation
  nav: {
    logout: "Wyloguj",
    login: "Zaloguj",
    register: "Zarejestruj",
    home: "Start",
    profile: "Profil",
    settings: "Ustawienia",
    addTournament: "Dodaj Turniej",
    tournaments: "Turnieje",
    openSidebar: "Otwórz menu boczne",
    closeSidebar: "Zamknij menu boczne",
  },

  // Auth
  auth: {
    // Login
    loginTitle: "Logowanie",
    loginSubtitle: "Wprowadź dane logowania, aby uzyskać dostęp do konta",
    email: "Email",
    emailPlaceholder: "twoj.email@przykładowy.com",
    password: "Hasło",
    passwordPlaceholder: "Wprowadź hasło",
    rememberMe: "Zapamiętaj mnie",
    forgotPassword: "Zapomniałeś hasła?",
    noAccount: "Nie masz konta?",
    signUp: "Zarejestruj się",
    loggingIn: "Logowanie...",

    // Register
    registerTitle: "Utwórz Konto",
    registerSubtitle: "Utwórz nowe konto, aby rozpocząć",
    fullName: "Imię i Nazwisko",
    confirmPassword: "Potwierdź Hasło",
    confirmPasswordPlaceholder: "Potwierdź hasło",
    agreeToTerms: "Zgadzam się z Regulaminem",
    alreadyHaveAccount: "Masz już konto?",
    signIn: "Zaloguj się",
    creatingAccount: "Tworzenie konta...",

    // Forgot Password
    forgotPasswordTitle: "Zapomniałeś Hasła",
    forgotPasswordSubtitle: "Wprowadź swój adres email, a wyślemy Ci link resetujący",
    sendResetLink: "Wyślij Link Resetujący",
    sendingResetLink: "Wysyłanie...",
    backToLogin: "Powrót do logowania",
    resetLinkSent: "Link resetujący został wysłany! Sprawdź swoją skrzynkę.",

    // Reset Password
    resetPasswordTitle: "Resetuj Hasło",
    resetPasswordSubtitle: "Wprowadź nowe hasło",
    newPassword: "Nowe Hasło",
    resetPassword: "Resetuj Hasło",
    resettingPassword: "Resetowanie hasła...",

    // Validation
    emailRequired: "Email jest wymagany",
    emailInvalid: "Nieprawidłowy adres email",
    passwordRequired: "Hasło jest wymagane",
    passwordMinLength: "Hasło musi mieć co najmniej 8 znaków",
    passwordUppercase: "Hasło musi zawierać co najmniej jedną wielką literę",
    passwordLowercase: "Hasło musi zawierać co najmniej jedną małą literę",
    passwordNumber: "Hasło musi zawierać co najmniej jedną cyfrę",
    passwordsNotMatch: "Hasła nie są zgodne",
    nameRequired: "Imię i nazwisko są wymagane",
    termsRequired: "Musisz zaakceptować regulamin",
  },

  // Tournaments
  tournaments: {
    // List
    title: "Turnieje",
    noTournaments: "Nie znaleziono turniejów",
    loadMore: "Załaduj więcej",
    tournamentsListTitle: "Moje Turnieje",
    selectDateRange: "Wybierz Zakres Dat",
    startDate: "Data Początkowa",
    endDate: "Data Końcowa",
    showingResults: "Wyświetlanie {count} turniejów",
    page: "Strona",
    of: "z",
    previousPage: "Poprzednia",
    nextPage: "Następna",
    tournamentAverage: "Średnia Turnieju",
    allMatches: "Wszystkie Mecze",
    showMatches: "Pokaż Mecze",
    hideMatches: "Ukryj Mecze",
    matchDetails: "Szczegóły Meczu",
    errorLoadingTournaments: "Nie udało się załadować turniejów",
    emptyState: "Brak turniejów w wybranym zakresie dat",
    emptyStateDescription: "Spróbuj zmienić zakres dat lub dodaj nowy turniej",
    addNewTournament: "Dodaj nowy turniej",

    // Add Tournament
    addTitle: "Dodaj Turniej",
    addSubtitle: "Zapisz wyniki swojego ostatniego turnieju darterskiego",

    // Form
    basicInfo: "Ogólne",
    metrics: "Dane",
    review: "Zapis",
    tournamentName: "Nazwa Turnieju",
    tournamentNamePlaceholder: "Wprowadź nazwę turnieju",
    tournamentDate: "Data Turnieju",
    pickDate: "Wybierz datę",
    tournamentType: "Typ Turnieju",
    selectTournamentType: "Wybierz typ turnieju",
    finalPlaceOptional: "Miejsce Końcowe (Opcjonalne)",
    finalPlacePlaceholder: "Wprowadź miejsce (np. 1, 2, 3)",
    date: "Data",
    opponent: "Imię Przeciwnika",
    opponentPlaceholder: "Wprowadź imię przeciwnika",
    result: "Wynik",
    win: "Wygrana",
    loss: "Przegrana",
    finalPlace: "Miejsce Końcowe",
    matchType: "Typ Meczu",
    selectMatchType: "Wybierz typ meczu",
    performanceMetrics: "Metryki Wydajności",
    averageScore: "Średnia Punktów",
    firstNineDartAverage: "Średnia z Pierwszych Dziewięciu",
    checkoutPercentage: "Procent Checkout",
    highFinish: "Najwyższe Zakończenie",
    scoreCounts: "Liczba Wyników",
    sixtyPlusScores: "60+",
    checkout: "Procent Checkout",
    oneHundredPlus: "100+",
    oneHundredFortyPlus: "140+",
    oneHundredEightyScores: "180",
    oneHundredEightyPlus: "180",
    legPerformance: "Wydajność Leg",
    bestLeg: "Najlepszy Leg (ilość lotek)",
    worstLeg: "Najgorszy Leg (ilość lotek)",
    minimumDarts: "Minimum 9 lotek",
    newMatch: "Nowy Mecz",
    matchesPlayed: "Rozegrane Mecze",
    match: "mecz",
    matches: "mecze",
    addMatch: "Dodaj Mecz",
    removeMatch: "Usuń Mecz",
    creating: "Tworzenie turnieju...",
    created: "Turniej utworzony pomyślnie!",
    error: "Nie udało się utworzyć turnieju. Spróbuj ponownie.",

    // Review page
    tournamentInformation: "Informacje o Turnieju",
    matchesTitle: "Mecze",
    matchNumber: "Mecz {number}",
    noMatchesYet: "Nie dodano jeszcze meczów.",
    unknown: "Nieznany",
    vs: "vs",
    avgShort: "Śr.",
    avgScore: "Średnia",
    coPercent: "CO%",
    firstNineShort: "Śr. 9 lotek",
    bestLegShort: "Najlepszy Leg",
    darts: "lotek",
    actions: "Akcje",
    removeMatchLabel: "Usuń mecz {number}",
    overallStatistics: "Statystyki Ogólne",
    reviewInfo: "Przejrzyj swój turniej i wszystkie mecze powyżej. Możesz dodać więcej meczów lub wysłać, aby zapisać.",

    // Toast messages
    performanceAnalysis: "Analiza Wydajności",
    matchSaved: "Mecz zapisany!",
    matchSavedDescription: "Mecz {number} został dodany. Dodaj kolejny lub przejdź do przeglądu.",
    matchRemoved: "Mecz usunięty",
    matchRemovedDescription: "Mecz {number} został usunięty.",
    noMatchesAdded: "Nie dodano meczów",
    noMatchesAddedDescription: "Wypełnij szczegóły meczu i kliknij 'Nowy Mecz', aby go dodać.",
    noMatchesBeforeReview: "Dodaj co najmniej jeden mecz przed przejściem do przeglądu.",
    noMatchesToSubmit: "Brak meczów do wysłania",
    noMatchesToSubmitDescription: "Nie można wysłać turnieju bez meczów.",
    errorLoadingMatchTypes: "Nie udało się załadować typów meczów",
    errorLoadingTournamentTypes: "Nie udało się załadować typów turniejów",

    // Validation
    nameRequired: "Nazwa turnieju jest wymagana",
    typeRequired: "Typ turnieju jest wymagany",
    dateRequired: "Data jest wymagana",
    opponentRequired: "Imię przeciwnika jest wymagane",
    resultRequired: "Wynik jest wymagany",
    matchTypeRequired: "Typ meczu jest wymagany",
    averageScoreRequired: "Średnia punktów jest wymagana",
    averageScoreMin: "Średnia punktów musi wynosić co najmniej 1",
    averageScoreMax: "Średnia punktów nie może przekroczyć 180",
  },

  // Errors
  errors: {
    generic: "Coś poszło nie tak. Spróbuj ponownie.",
    network: "Błąd sieci. Sprawdź swoje połączenie.",
    unauthorized: "Nie masz uprawnień do wykonania tej akcji.",
    notFound: "Nie znaleziono żądanego zasobu.",
    serverError: "Błąd serwera. Spróbuj ponownie później.",
  },

  // Validation
  validation: {
    required: "To pole jest wymagane",
    invalidEmail: "Nieprawidłowy adres email",
    minLength: "Musi mieć co najmniej {min} znaków",
    maxLength: "Nie może przekroczyć {max} znaków",
    min: "Musi wynosić co najmniej {min}",
    max: "Nie może przekroczyć {max}",
    pattern: "Nieprawidłowy format",
  },

  // Footer
  footer: {
    madeBy: "Dostarczone przez topiszajba",
  },
} as const;
