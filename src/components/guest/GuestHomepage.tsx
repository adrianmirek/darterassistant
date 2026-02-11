import { useState, useCallback, useMemo, startTransition, useEffect, useRef } from "react";
import { AlertCircle, Database, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/hooks/I18nProvider";
import { TournamentResults } from "./TournamentResults";
import { ContactNoKeywordForm } from "./ContactNoKeywordForm";
import { cleanPlayerName } from "@/lib/utils/text-normalization";
import type {
  RetrieveTournamentsMatchesResponseDTO,
  GetPlayerMatchesResponseDTO,
  NakkaPlayerMatchResult,
  NakkaTournamentWithMatchesDTO,
  NakkaTournamentMatchDTO,
} from "@/types";

type SearchStep = "nickname" | "keyword" | "results";

interface UniquePlayer {
  player_name: string;
  match_count: number;
}

export function GuestHomepage() {
  const t = useTranslation();

  // Search state
  const [searchStep, setSearchStep] = useState<SearchStep>("nickname");
  const [nickname, setNickname] = useState(""); // Input field for nicknames (comma-separated)
  const [keyword, setKeyword] = useState("");

  // Player filtering state
  const [uniquePlayers, setUniquePlayers] = useState<UniquePlayer[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Track if we should skip auto-refresh (to prevent infinite loop)
  const skipAutoRefresh = useRef(false);

  // Add nickname dialog state
  const [isAddNicknameOpen, setIsAddNicknameOpen] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const [newNicknameError, setNewNicknameError] = useState<string | null>(null);

  // Contact form state
  const [showContactForm, setShowContactForm] = useState(false);

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
        skipAutoRefresh.current = true; // Set flag before updating selectedPlayers

        startTransition(() => {
          setIsSearchingDatabase(false);
          setDbResults(data.data);

          // Extract unique players from results
          // Clean player names to avoid duplicates (e.g., "Leon Faryniuk" and "Leon Faryniuk 🗸")
          const playersMap = new Map<string, number>();
          data.data.matches.forEach((match: NakkaPlayerMatchResult) => {
            const cleanedName = cleanPlayerName(match.player_name);
            const count = playersMap.get(cleanedName) || 0;
            playersMap.set(cleanedName, count + 1);
          });

          const players = Array.from(playersMap.entries())
            .map(([player_name, match_count]) => ({ player_name, match_count }))
            .sort((a, b) => b.match_count - a.match_count);

          setUniquePlayers(players);
          setSelectedPlayers(players.map((p) => p.player_name));

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

  // Toggle player selection and auto-refresh
  const togglePlayerSelection = useCallback((playerName: string) => {
    setSelectedPlayers((prev) => {
      if (prev.includes(playerName)) {
        return prev.filter((p) => p !== playerName);
      } else {
        return [...prev, playerName];
      }
    });
  }, []);

  // Auto-refresh when selected players change (after toggle or add)
  useEffect(() => {
    // Skip if flag is set
    if (skipAutoRefresh.current) {
      skipAutoRefresh.current = false;
      return;
    }

    // Only auto-refresh if we're in results step and have players selected
    if (searchStep === "results" && selectedPlayers.length > 0 && dbResults) {
      // Trigger refresh
      const refreshData = async () => {
        setIsRefreshing(true);
        setError(null);

        try {
          const response = await fetch("/api/nakka/get-player-matches", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              nicknames: selectedPlayers.length === 1 ? selectedPlayers[0] : selectedPlayers,
              limit: 30,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || t("errors.generic"));
          }

          if (data.success) {
            // Set flag before updating state
            skipAutoRefresh.current = true;

            startTransition(() => {
              setIsRefreshing(false);
              setDbResults(data.data);
              setWebResults(null);

              // Update unique players from results
              // Clean player names to avoid duplicates (e.g., "Leon Faryniuk" and "Leon Faryniuk 🗸")
              const playersMap = new Map<string, number>();
              data.data.matches.forEach((match: NakkaPlayerMatchResult) => {
                const cleanedName = cleanPlayerName(match.player_name);
                const count = playersMap.get(cleanedName) || 0;
                playersMap.set(cleanedName, count + 1);
              });

              const players = Array.from(playersMap.entries())
                .map(([player_name, match_count]) => ({ player_name, match_count }))
                .sort((a, b) => b.match_count - a.match_count);

              setUniquePlayers(players);
              // Don't update selectedPlayers here to avoid loop
            });
          } else {
            throw new Error(data.error || t("errors.generic"));
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : t("errors.network"));
          setIsRefreshing(false);
        }
      };

      refreshData();
    }
  }, [selectedPlayers, searchStep, dbResults, t]);

  // Add new nickname to the filter list and fetch data
  const handleAddNickname = useCallback(async () => {
    const trimmedNickname = newNickname.trim();

    if (trimmedNickname.length < 3) {
      setNewNicknameError(t("guest.nicknameMinLength"));
      return;
    }

    // Check if nickname already exists in unique players or selected players
    const existsInUnique = uniquePlayers.some((p) => p.player_name.toLowerCase() === trimmedNickname.toLowerCase());
    const existsInSelected = selectedPlayers.some((p) => p.toLowerCase() === trimmedNickname.toLowerCase());

    if (existsInUnique || existsInSelected) {
      setNewNicknameError(t("guest.nicknameAlreadyExists"));
      return;
    }

    // Close dialog immediately
    setIsAddNicknameOpen(false);
    setNewNickname("");
    setNewNicknameError(null);

    // Start refreshing state
    setIsRefreshing(true);
    setError(null);

    try {
      // Combine selected players with new nickname
      const allNicknames = [...selectedPlayers, trimmedNickname];

      const response = await fetch("/api/nakka/get-player-matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nicknames: allNicknames.length === 1 ? allNicknames[0] : allNicknames,
          limit: 30,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t("errors.generic"));
      }

      if (data.success) {
        skipAutoRefresh.current = true; // Set flag before updating selectedPlayers

        startTransition(() => {
          setIsRefreshing(false);
          setDbResults(data.data);
          setWebResults(null); // Clear web results as we're doing a fresh search

          // Extract unique players from results
          // Clean player names to avoid duplicates (e.g., "Leon Faryniuk" and "Leon Faryniuk 🗸")
          const playersMap = new Map<string, number>();
          data.data.matches.forEach((match: NakkaPlayerMatchResult) => {
            const cleanedName = cleanPlayerName(match.player_name);
            const count = playersMap.get(cleanedName) || 0;
            playersMap.set(cleanedName, count + 1);
          });

          const players = Array.from(playersMap.entries())
            .map(([player_name, match_count]) => ({ player_name, match_count }))
            .sort((a, b) => b.match_count - a.match_count);

          setUniquePlayers(players);
          // Keep all players selected (including the new one)
          setSelectedPlayers(players.map((p) => p.player_name));
        });
      } else {
        throw new Error(data.error || t("errors.generic"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.network"));
      setIsRefreshing(false);

      // On error, still add the nickname to the list so user can try refresh manually
      setUniquePlayers((prev) => [...prev, { player_name: trimmedNickname, match_count: 0 }]);
      setSelectedPlayers((prev) => [...prev, trimmedNickname]);
    }
  }, [newNickname, uniquePlayers, selectedPlayers, t]);

  // Open add nickname dialog
  const handleOpenAddNickname = useCallback(() => {
    setNewNickname("");
    setNewNicknameError(null);
    setIsAddNicknameOpen(true);
  }, []);

  // Close add nickname dialog
  const handleCloseAddNickname = useCallback(() => {
    setIsAddNicknameOpen(false);
    setNewNickname("");
    setNewNicknameError(null);
  }, []);

  // Transform player matches to tournament-grouped format for display
  const transformToTournamentFormat = useCallback(
    (playerMatches: NakkaPlayerMatchResult[]): RetrieveTournamentsMatchesResponseDTO => {
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

      // Matches are already sorted by the database (by match_date DESC within each tournament)
      // No need to re-sort here - preserve the database ordering
      const tournaments = Array.from(tournamentMap.values());

      return {
        tournaments,
      };
    },
    []
  );

  // Deduplicate and combine results (database + web) with player filtering
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

    // Filter by selected players
    // Compare cleaned names to handle cases where DB has "Leon Faryniuk 🗸" but selected is "Leon Faryniuk"
    const filteredMatches = allMatches.filter((match) => {
      const cleanedMatchName = cleanPlayerName(match.player_name);
      return selectedPlayers.includes(cleanedMatchName);
    });

    // Transform to tournament-grouped format for display
    return transformToTournamentFormat(filteredMatches);
  }, [dbResults, webResults, selectedPlayers, transformToTournamentFormat]);

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
    setUniquePlayers([]);
    setSelectedPlayers([]);
    setShowContactForm(false);
  };

  const handleShowContactForm = () => {
    setShowContactForm(true);
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

            {/* Refreshing State - Show while refreshing */}
            {isRefreshing && (
              <div className="max-w-2xl mx-auto mb-12">
                <div className="bg-card border rounded-lg p-12 shadow-lg">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-lg text-muted-foreground">{t("guest.refreshing")}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Content - Hidden while refreshing */}
            {!isRefreshing && (
              <>
                {/* Player Filtering Card */}
                {!showContactForm && dbMatchCount > 0 && (
                  <div className="max-w-6xl mx-auto mb-8 px-4">
                    <div className="bg-card border rounded-lg p-4 sm:p-6">
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Database className="h-5 w-5 text-teal-400" />
                            <h3 className="text-sm font-semibold">{t("guest.filterPlayers")}</h3>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button onClick={handleShowContactForm} variant="outline" size="sm" className="whitespace-nowrap">
                              {t("guest.noTournamentContact")}
                            </Button>
                            <Button onClick={handleStartOver} variant="outline" size="sm" className="whitespace-nowrap">
                              {t("guest.newSearch")}
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">{t("guest.filterPlayersDescription")}</p>

                        {/* Player Chips Grid */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {uniquePlayers.map((player) => {
                            const isSelected = selectedPlayers.includes(player.player_name);
                            return (
                              <button
                                key={player.player_name}
                                onClick={() => togglePlayerSelection(player.player_name)}
                                disabled={selectedPlayers.length === 1 && isSelected}
                                className={`
                                  inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
                                  transition-all duration-200
                                  ${
                                    isSelected
                                      ? "bg-teal-500/20 text-teal-400 border border-teal-500/50 hover:bg-teal-500/30"
                                      : "bg-muted text-muted-foreground border border-transparent hover:border-border"
                                  }
                                  ${selectedPlayers.length === 1 && isSelected ? "opacity-50 cursor-not-allowed" : ""}
                                `}
                              >
                                <span translate="no">{cleanPlayerName(player.player_name)}</span>
                                <span className="text-xs opacity-70">({player.match_count})</span>
                                {isSelected ? <X className="h-3 w-3" /> : <span className="text-xs">+</span>}
                              </button>
                            );
                          })}
                        </div>

                        {/* Add Button */}
                        <Button onClick={handleOpenAddNickname} size="sm" variant="outline">
                          <Plus className="mr-2 h-3 w-3" />
                          {t("guest.addNickname")}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact Form - Show when manually triggered or no results found */}
                {showContactForm && !isRefreshing && (
                  <ContactNoKeywordForm
                    nickname={selectedPlayers.length > 0 ? selectedPlayers.join(", ") : nickname}
                    initialKeyword=""
                    onSuccess={() => {
                      console.log("Contact form submitted successfully");
                    }}
                    onNewSearch={handleStartOver}
                  />
                )}

                {/* No Results Found in Database - Show Contact Form */}
                {!showContactForm && dbMatchCount === 0 && !webResults && !isRefreshing && (
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
                {!showContactForm && dbMatchCount === 0 && webMatchCount === 0 && webResults && !isRefreshing && (
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
                {!showContactForm && combinedResults && totalMatches > 0 && combinedResults.tournaments.length > 0 && (
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
                        nickname={selectedPlayers.join(", ")}
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
              </>
            )}
          </div>
        )}
      </div>

      {/* Add Nickname Dialog */}
      <Dialog open={isAddNicknameOpen} onOpenChange={setIsAddNicknameOpen}>
        <DialogContent>
          <DialogClose onClick={handleCloseAddNickname} />
          <DialogHeader>
            <DialogTitle>{t("guest.addNicknameTitle")}</DialogTitle>
            <DialogDescription>{t("guest.addNicknameDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-nickname">{t("guest.playerNickname")}</Label>
              <Input
                id="new-nickname"
                type="text"
                placeholder={t("guest.playerNicknamePlaceholder")}
                value={newNickname}
                onChange={(e) => {
                  setNewNickname(e.target.value);
                  if (e.target.value.length >= 3) {
                    setNewNicknameError(null);
                  }
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && newNickname.trim().length >= 3) {
                    handleAddNickname();
                  }
                }}
                className={newNicknameError ? "border-destructive" : ""}
              />
              {newNicknameError && <p className="text-sm text-destructive">{newNicknameError}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseAddNickname}>
              {t("guest.cancel")}
            </Button>
            <Button onClick={handleAddNickname} disabled={newNickname.trim().length < 3}>
              {t("guest.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
