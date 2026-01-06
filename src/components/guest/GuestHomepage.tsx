import { useState, useCallback } from "react";
import { Search, Save, AlertCircle, Database, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTranslation } from "@/lib/hooks/I18nProvider";
import { TournamentResults } from "./TournamentResults";
import type {
  RetrieveTournamentsMatchesResponseDTO,
  GetPlayerMatchesResponseDTO,
  NakkaPlayerMatchResult,
} from "@/types";

type SearchStep = "nickname" | "keyword" | "results";

export function GuestHomepage() {
  const t = useTranslation();

  // Search state
  const [searchStep, setSearchStep] = useState<SearchStep>("nickname");
  const [nickname, setNickname] = useState("");
  const [keyword, setKeyword] = useState("");

  // Loading states
  const [isSearchingDatabase, setIsSearchingDatabase] = useState(false);
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);

  // Results
  const [dbResults, setDbResults] = useState<GetPlayerMatchesResponseDTO | null>(null);
  const [webResults, setWebResults] = useState<RetrieveTournamentsMatchesResponseDTO | null>(null);

  // Errors
  const [error, setError] = useState<string | null>(null);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [keywordError, setKeywordError] = useState<string | null>(null);

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
      const response = await fetch("/api/nakka/get-player-matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nick_name: nickname.trim(),
          limit: 30,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("errors.generic"));
      }

      if (data.success) {
        setDbResults(data.data);
        setSearchStep("results");
      } else {
        throw new Error(data.error || t("errors.generic"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.network"));
    } finally {
      setIsSearchingDatabase(false);
    }
  }, [nickname, t]);

  // Step 2: Search by keyword + nickname (web scraping)
  const handleKeywordSearch = useCallback(async () => {
    if (keyword.trim().length < 3) {
      setKeywordError(t("guest.keywordMinLength"));
      return;
    }
    if (nickname.trim().length < 3) {
      setNicknameError(t("guest.nicknameMinLength"));
      return;
    }

    setIsSearchingWeb(true);
    setError(null);
    setWebResults(null);

    try {
      const response = await fetch("/api/nakka/retrieve-guest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          keyword: keyword.trim(),
          nick_name: nickname.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("errors.generic"));
      }

      if (data.success) {
        setWebResults(data.data);
      } else {
        throw new Error(data.error || t("errors.generic"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.network"));
    } finally {
      setIsSearchingWeb(false);
    }
  }, [keyword, nickname, t]);

  // Transform database results to match TournamentResults component format
  const transformDbResults = useCallback(
    (dbData: GetPlayerMatchesResponseDTO): RetrieveTournamentsMatchesResponseDTO => {
      // Group matches by tournament
      const tournamentMap = new Map<string, any>();

      dbData.matches.forEach((match: NakkaPlayerMatchResult) => {
        if (!tournamentMap.has(match.nakka_tournament_identifier)) {
          tournamentMap.set(match.nakka_tournament_identifier, {
            nakka_identifier: match.nakka_tournament_identifier,
            tournament_date: match.tournament_date,
            tournament_name: match.tournament_name,
            href: match.tournament_href,
            tournament_matches: [],
          });
        }

        tournamentMap.get(match.nakka_tournament_identifier)!.tournament_matches.push({
          nakka_match_identifier: match.nakka_match_identifier,
          match_type: match.match_type,
          player_name: match.player_name,
          player_code: match.player_code,
          opponent_name: match.opponent_name,
          opponent_code: match.opponent_code,
          href: match.match_href,
          isChecked: true, // All matches from DB are for the searched player
        });
      });

      return {
        tournaments: Array.from(tournamentMap.values()),
      };
    },
    []
  );

  // Deduplicate and combine results (database + web)
  const combinedResults = useCallback(() => {
    if (!dbResults && !webResults) return null;

    const dbTransformed = dbResults ? transformDbResults(dbResults) : null;
    
    // If only db results, return them
    if (dbTransformed && !webResults) {
      return dbTransformed;
    }
    
    // If only web results, return them
    if (webResults && !dbTransformed) {
      return webResults;
    }

    // Both exist - need to deduplicate
    // Collect all match identifiers from database results
    const dbMatchIds = new Set<string>();
    dbTransformed?.tournaments.forEach(tournament => {
      tournament.tournament_matches.forEach(match => {
        dbMatchIds.add(match.nakka_match_identifier);
      });
    });

    // Filter web results to exclude matches already in database
    const deduplicatedWebResults = webResults!.tournaments.map(tournament => ({
      ...tournament,
      tournament_matches: tournament.tournament_matches.filter(
        match => !dbMatchIds.has(match.nakka_match_identifier)
      ),
    })).filter(tournament => tournament.tournament_matches.length > 0); // Remove empty tournaments

    return {
      tournaments: [
        ...(dbTransformed?.tournaments || []),
        ...deduplicatedWebResults,
      ],
    };
  }, [dbResults, webResults, transformDbResults])();

  const totalMatches =
    combinedResults?.tournaments.reduce(
      (acc, tournament) => acc + tournament.tournament_matches.length,
      0
    ) || 0;

  const dbMatchCount = dbResults?.matches.length || 0;
  const webMatchCount =
    webResults?.tournaments.reduce((acc, t) => acc + t.tournament_matches.length, 0) || 0;

  const handleStartOver = () => {
    setSearchStep("nickname");
    setNickname("");
    setKeyword("");
    setDbResults(null);
    setWebResults(null);
    setError(null);
    setNicknameError(null);
    setKeywordError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-teal-400 to-purple-400 bg-clip-text text-transparent mb-4">
            {t("guest.title")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("guest.subtitle")}
          </p>
        </div>

        {/* Step 1: Nickname Search */}
        {searchStep === "nickname" && (
          <div className="max-w-2xl mx-auto mb-12">
            <div className="bg-card border rounded-lg p-6 shadow-lg">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="player-nickname">
                    {t("guest.playerNickname")}
                  </Label>
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
                  {nicknameError && (
                    <p className="text-sm text-destructive">{nicknameError}</p>
                  )}
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

        {/* Step 2: Results with option to search more */}
        {searchStep === "results" && (
          <>
            {/* Error Display */}
            {error && (
              <div className="max-w-2xl mx-auto mb-6">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </div>
            )}

            {/* Results Found - Show option to search more */}
            {dbMatchCount > 0 && (
              <div className="max-w-6xl mx-auto mb-8">
                {/* Action Cards */}
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  {/* Search More Tournaments Card */}
                  <div className="bg-card border rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-purple-500/10 rounded-lg">
                        <Globe className="h-6 w-6 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">
                          {t("guest.searchMoreTournaments")}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {t("guest.searchMoreDescription")}
                        </p>
                        <div className="space-y-3">
                          <Input
                            type="text"
                            placeholder={t("guest.tournamentKeywordPlaceholder")}
                            value={keyword}
                            onChange={(e) => {
                              setKeyword(e.target.value);
                              if (e.target.value.length >= 3) {
                                setKeywordError(null);
                              }
                            }}
                            onKeyPress={(e) => {
                              if (e.key === "Enter" && keyword.length >= 3) {
                                handleKeywordSearch();
                              }
                            }}
                            className={keywordError ? "border-destructive" : ""}
                            disabled={isSearchingWeb}
                          />
                          {keywordError && (
                            <p className="text-sm text-destructive">{keywordError}</p>
                          )}
                          <Button
                            onClick={handleKeywordSearch}
                            disabled={isSearchingWeb || keyword.length < 3}
                            className="w-full"
                          >
                            {isSearchingWeb ? (
                              <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                                {t("guest.searching")}
                              </>
                            ) : (
                              <>
                                <Search className="mr-2 h-4 w-4" />
                                {t("guest.searchTournaments")}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Start Over Card */}
                  <div className="bg-card border rounded-lg p-6 flex flex-col justify-center items-center text-center">
                    <Database className="h-12 w-12 text-teal-400 mb-4" />
                    <h3 className="font-semibold mb-2">{t("guest.startOver")}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t("guest.startOverDescription")}
                    </p>
                    <Button onClick={handleStartOver} variant="outline">
                      {t("guest.newSearch")}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* No Results Found - Show option to search by keyword */}
            {dbMatchCount === 0 && !webResults && (
              <div className="max-w-2xl mx-auto mb-8">
                <div className="bg-card border rounded-lg p-6">
                  <div className="text-center mb-6">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">
                      {t("guest.noMatchesInDatabase")}
                    </h3>
                    <p className="text-muted-foreground">
                      {t("guest.trySearchingByKeyword")}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="tournament-keyword">
                      {t("guest.tournamentKeyword")}
                    </Label>
                    <Input
                      id="tournament-keyword"
                      type="text"
                      placeholder={t("guest.tournamentKeywordPlaceholder")}
                      value={keyword}
                      onChange={(e) => {
                        setKeyword(e.target.value);
                        if (e.target.value.length >= 3) {
                          setKeywordError(null);
                        }
                      }}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && keyword.length >= 3) {
                          handleKeywordSearch();
                        }
                      }}
                      className={keywordError ? "border-destructive" : ""}
                      disabled={isSearchingWeb}
                    />
                    {keywordError && (
                      <p className="text-sm text-destructive">{keywordError}</p>
                    )}
                    <Button
                      onClick={handleKeywordSearch}
                      disabled={isSearchingWeb || keyword.length < 3}
                      className="w-full"
                      size="lg"
                    >
                      {isSearchingWeb ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                          {t("guest.searching")}
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          {t("guest.searchTournaments")}
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleStartOver}
                      variant="ghost"
                      className="w-full"
                    >
                      {t("guest.startOver")}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Display Results */}
            {combinedResults && totalMatches > 0 && (
              <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold">
                      {t("guest.resultsTitle")}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {dbMatchCount > 0 && webMatchCount > 0
                        ? t("guest.matchesFoundCombined", {
                            db: dbMatchCount,
                            web: webMatchCount,
                            total: totalMatches,
                          })
                        : t("guest.matchesFound", { count: totalMatches })}
                    </p>
                  </div>

                  {/* Mock-up Save Button */}
                  <Button variant="outline" size="lg">
                    <Save className="mr-2 h-4 w-4" />
                    {t("guest.savePlaceholder")}
                  </Button>
                </div>

                <TournamentResults results={combinedResults} />

                {/* Call to Action */}
                <div className="mt-12 text-center bg-gradient-to-r from-purple-500/10 to-teal-500/10 border border-purple-500/20 rounded-lg p-8">
                  <h3 className="text-xl font-semibold mb-2">
                    {t("guest.loginToSave")}
                  </h3>
                  <div className="flex gap-4 justify-center mt-4">
                    <Button asChild variant="default" size="lg">
                      <a href="/auth/login">{t("nav.login")}</a>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                      <a href="/auth/register">{t("guest.registerNow")}</a>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
