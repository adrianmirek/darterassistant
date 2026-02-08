import { useState, useCallback, useMemo, startTransition } from "react";
import { AlertCircle, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "@/lib/hooks/I18nProvider";
import { TournamentResults } from "./TournamentResults";
import { ContactNoKeywordForm } from "./ContactNoKeywordForm";
import type {
  RetrieveTournamentsMatchesResponseDTO,
  GetPlayerMatchesResponseDTO,
  NakkaPlayerMatchResult,
  NakkaTournamentWithMatchesDTO,
  NakkaTournamentMatchDTO,
} from "@/types";

type SearchStep = "nickname" | "keyword" | "results";

export function GuestHomepage() {
  const t = useTranslation();

  // Search state
  const [searchStep, setSearchStep] = useState<SearchStep>("nickname");
  const [nickname, setNickname] = useState(""); // Input field for nicknames (comma-separated)
  const [keyword, setKeyword] = useState("");

  // Loading states
  const [isSearchingDatabase, setIsSearchingDatabase] = useState(false);

  // Results - now both use the same normalized format
  const [dbResults, setDbResults] = useState<GetPlayerMatchesResponseDTO | null>(null);
  const [webResults, setWebResults] = useState<GetPlayerMatchesResponseDTO | null>(null);

  // Errors
  const [error, setError] = useState<string | null>(null);
  const [nicknameError, setNicknameError] = useState<string | null>(null);

  // Step 1: Search by nickname in database
  const handleNicknameSearch = useCallback(async () => {
    if (nickname.trim().length < 3) {
      setNicknameError(t("guest.nicknameMinLength"));
      return;
    }

    setIsSearchingDatabase(true);
    setError(null);
    setDbResults(null);
    setWebResults(null);

    try {
      // Parse nicknames: split by comma and trim each
      const nicknamesArray = nickname
        .split(",")
        .map((n) => n.trim())
        .filter((n) => n.length >= 3);

      if (nicknamesArray.length === 0) {
        setNicknameError(t("guest.nicknameMinLength"));
        setIsSearchingDatabase(false);
        return;
      }

      const response = await fetch("/api/nakka/get-player-matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nicknames: nicknamesArray.length === 1 ? nicknamesArray[0] : nicknamesArray,
          limit: 30,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("errors.generic"));
      }

      if (data.success) {
        // Use startTransition to batch updates and prevent DOM conflicts
        startTransition(() => {
          setIsSearchingDatabase(false);
          setDbResults(data.data);
          setSearchStep("results");
        });
        return;
      } else {
        throw new Error(data.error || t("errors.generic"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.network"));
      setIsSearchingDatabase(false);
    }
  }, [nickname, t]);

  // Transform player matches to tournament-grouped format for display
  const transformToTournamentFormat = useCallback(
    (playerMatches: NakkaPlayerMatchResult[]): RetrieveTournamentsMatchesResponseDTO => {
      // Define match type priority order (lower number = higher priority)
      const matchTypePriority: Record<string, number> = {
        t_final: 1,
        "t_semi-final": 2,
        t_quarter_final: 3,
        t_top_8: 3, // Same as quarter final
        t_top_16: 4,
        t_top_32: 5,
        rr: 6, // Group stage
      };

      // Group matches by tournament
      const tournamentMap = new Map<string, NakkaTournamentWithMatchesDTO>();

      playerMatches.forEach((match: NakkaPlayerMatchResult) => {
        if (!tournamentMap.has(match.nakka_tournament_identifier)) {
          tournamentMap.set(match.nakka_tournament_identifier, {
            nakka_identifier: match.nakka_tournament_identifier,
            tournament_date: match.tournament_date,
            tournament_name: match.tournament_name,
            href: match.tournament_href,
            tournament_matches: [],
          });
        }

        const tournament = tournamentMap.get(match.nakka_tournament_identifier);
        if (tournament) {
          tournament.tournament_matches.push({
            tournament_match_id: match.tournament_match_id,
            nakka_match_identifier: match.nakka_match_identifier,
            match_type: match.match_type,
            player_name: match.player_name,
            player_code: match.player_code,
            opponent_name: match.opponent_name,
            opponent_code: match.opponent_code,
            href: match.match_href,
            isChecked: true, // All matches are for the searched player
            // Include player statistics
            average_score: match.average_score,
            player_score: match.player_score,
            opponent_score: match.opponent_score,
            first_nine_avg: match.first_nine_avg,
            checkout_percentage: match.checkout_percentage,
            score_60_count: match.score_60_count,
            score_100_count: match.score_100_count,
            score_140_count: match.score_140_count,
            score_180_count: match.score_180_count,
            high_finish: match.high_finish,
            best_leg: match.best_leg,
            worst_leg: match.worst_leg,
            // Include opponent statistics
            opponent_average_score: match.opponent_average_score,
            opponent_first_nine_avg: match.opponent_first_nine_avg,
            opponent_checkout_percentage: match.opponent_checkout_percentage,
            opponent_score_60_count: match.opponent_score_60_count,
            opponent_score_100_count: match.opponent_score_100_count,
            opponent_score_140_count: match.opponent_score_140_count,
            opponent_score_180_count: match.opponent_score_180_count,
            opponent_high_finish: match.opponent_high_finish,
            opponent_best_leg: match.opponent_best_leg,
            opponent_worst_leg: match.opponent_worst_leg,
          });
        }
      });

      // Sort matches within each tournament by match type priority
      const tournaments = Array.from(tournamentMap.values());
      tournaments.forEach((tournament) => {
        tournament.tournament_matches.sort((a: NakkaTournamentMatchDTO, b: NakkaTournamentMatchDTO) => {
          const priorityA = matchTypePriority[a.match_type] ?? 999;
          const priorityB = matchTypePriority[b.match_type] ?? 999;
          return priorityA - priorityB;
        });
      });

      return {
        tournaments,
      };
    },
    []
  );

  // Deduplicate and combine results (database + web)
  const combinedResults = useMemo(() => {
    if (!dbResults && !webResults) return null;

    // Combine all matches and deduplicate
    const allMatches: NakkaPlayerMatchResult[] = [];
    const matchIds = new Set<string>();

    // Add database results first (they take priority)
    if (dbResults) {
      dbResults.matches.forEach((match) => {
        if (!matchIds.has(match.nakka_match_identifier)) {
          allMatches.push(match);
          matchIds.add(match.nakka_match_identifier);
        }
      });
    }

    // Add web results, skipping duplicates
    if (webResults) {
      webResults.matches.forEach((match) => {
        if (!matchIds.has(match.nakka_match_identifier)) {
          allMatches.push(match);
          matchIds.add(match.nakka_match_identifier);
        }
      });
    }

    // Transform to tournament-grouped format for display
    return transformToTournamentFormat(allMatches);
  }, [dbResults, webResults, transformToTournamentFormat]);

  const totalMatches =
    combinedResults?.tournaments.reduce((acc, tournament) => acc + tournament.tournament_matches.length, 0) || 0;

  const dbMatchCount = dbResults?.matches.length || 0;
  const webMatchCount = webResults?.matches.length || 0;

  const handleStartOver = () => {
    setSearchStep("nickname");
    setNickname("");
    setKeyword("");
    setDbResults(null);
    setWebResults(null);
    setError(null);
    setNicknameError(null);
  };

  // Prevent rendering results while still in loading state
  const shouldShowResults = searchStep === "results" && !isSearchingDatabase;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="container mx-auto px-4 py-6 sm:py-12">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-800 via-violet-600 to-blue-600 dark:from-teal-400 dark:via-violet-400 dark:to-purple-400 bg-clip-text text-transparent mb-3 sm:mb-4 px-2 pb-1 leading-tight">
            {t("guest.title")}
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            {t("guest.subtitle")}
          </p>
        </div>

        {/* Step 1: Nickname Search */}
        {searchStep === "nickname" && !isSearchingDatabase && (
          <div key="nickname-step" className="max-w-2xl mx-auto mb-12">
            <div className="bg-card border rounded-lg p-6 shadow-lg">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="player-nickname">{t("guest.playerNickname")}</Label>
                  <Input
                    id="player-nickname"
                    type="text"
                    placeholder={t("guest.playerNicknamePlaceholder")}
                    value={nickname}
                    onChange={(e) => {
                      setNickname(e.target.value);
                      if (e.target.value.length >= 3) {
                        setNicknameError(null);
                      }
                    }}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && nickname.length >= 3) {
                        handleNicknameSearch();
                      }
                    }}
                    className={nicknameError ? "border-destructive" : ""}
                    disabled={isSearchingDatabase}
                  />
                  <p className="text-xs text-muted-foreground">{t("guest.nicknameHint")}</p>
                  {nicknameError && <p className="text-sm text-destructive">{nicknameError}</p>}
                </div>

                <Button
                  onClick={handleNicknameSearch}
                  disabled={isSearchingDatabase || nickname.length < 3}
                  className="w-full"
                  size="lg"
                >
                  {isSearchingDatabase ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      {t("guest.searching")}
                    </>
                  ) : (
                    <>
                      <Database className="mr-2 h-4 w-4" />
                      {t("guest.searchButton")}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Info Alert */}
            <Alert className="mt-4 border-blue-500/50 bg-blue-500/10">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <AlertDescription className="text-sm text-muted-foreground">
                {t("guest.searchDatabaseInfo")}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Loading State */}
        {isSearchingDatabase && (
          <div key="loading-step" className="max-w-2xl mx-auto mb-12">
            <div className="bg-card border rounded-lg p-12 shadow-lg">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-lg text-muted-foreground">{t("guest.searching")}</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Results with option to search more */}
        {shouldShowResults && (
          <div key="results-step">
            {/* Error Display */}
            {error && (
              <div className="max-w-2xl mx-auto mb-6">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}

            {/* Start Over Card */}
            {dbMatchCount > 0 && (
              <div className="max-w-6xl mx-auto mb-8 px-4">
                <div className="bg-card border rounded-lg p-4 sm:p-6 flex flex-col justify-center items-center text-center max-w-md mx-auto">
                  <Database className="h-10 w-10 sm:h-12 sm:w-12 text-teal-400 mb-3 sm:mb-4" />
                  <h3 className="text-sm sm:text-base font-semibold mb-1 sm:mb-2">{t("guest.startOver")}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                    {t("guest.startOverDescription")}
                  </p>
                  <Button onClick={handleStartOver} variant="outline" className="text-sm sm:text-base">
                    {t("guest.newSearch")}
                  </Button>
                </div>
              </div>
            )}

            {/* No Results Found in Database - Show Contact Form */}
            {dbMatchCount === 0 && !webResults && (
              <ContactNoKeywordForm
                nickname={nickname}
                initialKeyword=""
                onSuccess={() => {
                  console.log("Contact form submitted successfully");
                }}
                onNewSearch={handleStartOver}
              />
            )}

            {/* No Results Found After Web Search - Show Contact Form */}
            {dbMatchCount === 0 && webMatchCount === 0 && webResults && (
              <ContactNoKeywordForm
                nickname={nickname}
                initialKeyword={keyword}
                onSuccess={() => {
                  console.log("Contact form submitted successfully");
                }}
                onNewSearch={handleStartOver}
              />
            )}

            {/* Display Results */}
            {combinedResults && totalMatches > 0 && combinedResults.tournaments.length > 0 && (
              <div className="max-w-6xl mx-auto px-4">
                <div className="mb-6">
                  <h2 className="text-xl sm:text-2xl font-semibold">{t("guest.resultsTitle")}</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {dbMatchCount > 0 && webMatchCount > 0
                      ? t("guest.matchesFoundCombined", {
                          db: dbMatchCount,
                          web: webMatchCount,
                          total: totalMatches,
                        })
                      : t("guest.matchesFound", { count: totalMatches })}
                  </p>
                </div>

                {combinedResults && (
                  <TournamentResults
                    key={`results-${dbMatchCount}-${webMatchCount}`}
                    results={combinedResults}
                    nickname={nickname}
                  />
                )}

                {/* Call to Action */}
                <div className="mt-8 sm:mt-12 text-center bg-gradient-to-r from-purple-500/10 to-teal-500/10 border border-purple-500/20 rounded-lg p-6 sm:p-8">
                  <h3 className="text-lg sm:text-xl font-semibold mb-2">{t("guest.loginToSave")}</h3>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-4">
                    <Button asChild variant="default" size="lg" className="w-full sm:w-auto">
                      <a href="/auth/login">{t("nav.login")}</a>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                      <a href="/auth/register">{t("guest.registerNow")}</a>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
