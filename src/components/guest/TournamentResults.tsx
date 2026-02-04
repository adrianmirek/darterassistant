import { useState, useCallback, useEffect } from "react";
import { Calendar, Users, Trophy, CheckCircle2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/hooks/I18nProvider";
import type { RetrieveTournamentsMatchesResponseDTO, NakkaTournamentMatchDTO } from "@/types";

interface TournamentResultsProps {
  results: RetrieveTournamentsMatchesResponseDTO;
  nickname: string;
}

export function TournamentResults({ results, nickname }: TournamentResultsProps) {
  const t = useTranslation();

  // All hooks must be called before any conditional returns
  const [tournamentsData, setTournamentsData] = useState(results?.tournaments || []);
  const [fetchingTournaments, setFetchingTournaments] = useState<
    Record<string, { isFetching: boolean; current: number; total: number; currentMatchId: string | null }>
  >({});
  const [fetchingMatchIds, setFetchingMatchIds] = useState<Set<string>>(new Set());

  // Update local state when results prop changes (e.g., after searching tournaments)
  useEffect(() => {
    if (results?.tournaments && Array.isArray(results.tournaments)) {
      setTournamentsData(results.tournaments);
    }
  }, [results]);

  // All hooks including useCallback must be before the early return
  const handleRefreshTournament = useCallback(
    async (tournamentIdentifier: string) => {
      const tournament = tournamentsData.find((t) => t.nakka_identifier === tournamentIdentifier);
      if (!tournament) return;

      const matchesWithoutResults = tournament.tournament_matches.filter(
        (match) =>
          match.player_score === null ||
          match.player_score === undefined ||
          match.opponent_score === null ||
          match.opponent_score === undefined ||
          match.average_score === null ||
          match.average_score === undefined
      );

      if (matchesWithoutResults.length === 0) return;

      setFetchingTournaments((prev) => ({
        ...prev,
        [tournamentIdentifier]: {
          isFetching: true,
          current: 0,
          total: matchesWithoutResults.length,
          currentMatchId: null,
        },
      }));

      for (let i = 0; i < matchesWithoutResults.length; i++) {
        const match = matchesWithoutResults[i];

        if (!match.tournament_match_id || match.tournament_match_id === 0) {
          console.error(`Cannot fetch results for match ${match.nakka_match_identifier}: not yet saved to database`);
          continue;
        }

        try {
          // Mark this match as being fetched
          setFetchingMatchIds((prev) => new Set(prev).add(match.nakka_match_identifier));
          setFetchingTournaments((prev) => ({
            ...prev,
            [tournamentIdentifier]: {
              isFetching: true,
              current: i + 1,
              total: matchesWithoutResults.length,
              currentMatchId: match.nakka_match_identifier,
            },
          }));

          const response = await fetch("/api/nakka/fetch-match-results", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              tournament_match_id: match.tournament_match_id,
              nakka_match_identifier: match.nakka_match_identifier,
              match_href: match.href,
              nick_name: nickname,
            }),
          });

          const data = await response.json();

          if (response.ok && data.success && data.data) {
            setTournamentsData((prev) =>
              prev.map((t) => {
                if (t.nakka_identifier !== tournamentIdentifier) return t;

                return {
                  ...t,
                  tournament_matches: t.tournament_matches.map((m) => {
                    if (m.nakka_match_identifier !== match.nakka_match_identifier) return m;

                    return {
                      ...m,
                      average_score: data.data.average_score,
                      player_score: data.data.player_score,
                      opponent_score: data.data.opponent_score,
                      first_nine_avg: data.data.first_nine_avg,
                      checkout_percentage: data.data.checkout_percentage,
                      score_60_count: data.data.score_60_count,
                      score_100_count: data.data.score_100_count,
                      score_140_count: data.data.score_140_count,
                      score_180_count: data.data.score_180_count,
                      high_finish: data.data.high_finish,
                      best_leg: data.data.best_leg,
                      worst_leg: data.data.worst_leg,
                      opponent_average_score: data.data.opponent_average_score,
                      opponent_first_nine_avg: data.data.opponent_first_nine_avg,
                      opponent_checkout_percentage: data.data.opponent_checkout_percentage,
                      opponent_score_60_count: data.data.opponent_score_60_count,
                      opponent_score_100_count: data.data.opponent_score_100_count,
                      opponent_score_140_count: data.data.opponent_score_140_count,
                      opponent_score_180_count: data.data.opponent_score_180_count,
                      opponent_high_finish: data.data.opponent_high_finish,
                      opponent_best_leg: data.data.opponent_best_leg,
                      opponent_worst_leg: data.data.opponent_worst_leg,
                    };
                  }),
                };
              })
            );
          } else {
            console.error(`Failed to fetch results for match ${match.nakka_match_identifier}:`, data.error);
          }
        } catch (error) {
          console.error(`Error fetching results for match ${match.nakka_match_identifier}:`, error);
        } finally {
          // Remove this match from fetching set
          setFetchingMatchIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(match.nakka_match_identifier);
            return newSet;
          });
        }
      }

      setFetchingTournaments((prev) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [tournamentIdentifier]: _, ...newState } = prev;
        return newState;
      });
    },
    [tournamentsData, nickname]
  );

  // Safety check - ensure results and tournaments exist
  if (!results || !results.tournaments || results.tournaments.length === 0) {
    return null;
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Check if tournament has any matches without results
  const hasMatchesWithoutResults = (matches: NakkaTournamentMatchDTO[]): boolean => {
    return matches.some(
      (match) =>
        match.player_score === null ||
        match.player_score === undefined ||
        match.opponent_score === null ||
        match.opponent_score === undefined ||
        match.average_score === null ||
        match.average_score === undefined
    );
  };

  return (
    <div className="space-y-6">
      {tournamentsData &&
        Array.isArray(tournamentsData) &&
        tournamentsData.map((tournament) => {
          const fetchStatus = fetchingTournaments[tournament.nakka_identifier];
          const isFetching = fetchStatus?.isFetching || false;

          return (
            <Card key={tournament.nakka_identifier} className="overflow-hidden">
              {/* Tournament Header */}
              <div className="bg-gradient-to-r from-purple-500/10 to-teal-500/10 border-b px-4 sm:px-6 py-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Trophy className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <h3 className="text-base sm:text-lg font-semibold leading-tight">{tournament.tournament_name}</h3>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span>{formatDate(tournament.tournament_date)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span>
                          {tournament.tournament_matches.length}{" "}
                          {tournament.tournament_matches.length === 1
                            ? t("tournaments.match")
                            : t("tournaments.matches")}
                        </span>
                      </div>
                    </div>
                    {hasMatchesWithoutResults(tournament.tournament_matches) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRefreshTournament(tournament.nakka_identifier)}
                        disabled={isFetching}
                        className="text-xs sm:text-sm self-start sm:self-auto"
                      >
                        {isFetching ? (
                          <>
                            <div className="mr-1 sm:mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            <span className="hidden sm:inline">
                              {t("guest.fetchingResults")} ({fetchStatus.current}/{fetchStatus.total})
                            </span>
                            <span className="sm:hidden">
                              {fetchStatus.current}/{fetchStatus.total}
                            </span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">{t("guest.fetchMissingResults")}</span>
                            <span className="sm:hidden">{t("guest.fetchResults")}</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Matches List */}
              <div className="p-3 sm:p-6">
                <div className="space-y-3">
                  {tournament.tournament_matches.map((match) => (
                    <MatchCard
                      key={match.nakka_match_identifier}
                      match={match}
                      nickname={nickname}
                      isFetchingFromParent={fetchingMatchIds.has(match.nakka_match_identifier)}
                    />
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
    </div>
  );
}

interface MatchCardProps {
  match: NakkaTournamentMatchDTO;
  nickname: string;
  isFetchingFromParent?: boolean;
}

function MatchCard({ match, nickname, isFetchingFromParent = false }: MatchCardProps) {
  const t = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [matchData, setMatchData] = useState<NakkaTournamentMatchDTO>(match);

  // Update match data when prop changes (from parent fetch)
  useEffect(() => {
    setMatchData(match);
  }, [match]);

  const formatMatchType = (matchType: string): string => {
    // Convert match type codes to readable format using translations
    const typeMap: Record<string, string> = {
      rr: t("guest.matchTypeRr"),
      t_top_32: t("guest.matchTypeTop32"),
      t_top_16: t("guest.matchTypeTop16"),
      t_top_8: t("guest.matchTypeTop8"),
      t_quarter_final: t("guest.matchTypeQuarterFinal"),
      "t_semi-final": t("guest.matchTypeSemiFinal"),
      t_final: t("guest.matchTypeFinal"),
    };
    return typeMap[matchType] || matchType;
  };

  const hasResults =
    matchData.player_score !== null &&
    matchData.player_score !== undefined &&
    matchData.opponent_score !== null &&
    matchData.opponent_score !== undefined &&
    matchData.average_score !== null &&
    matchData.average_score !== undefined;

  // Combined fetching state: either local refresh or parent-triggered fetch
  const isFetching = isRefreshing || isFetchingFromParent;

  const handleRefreshMatch = useCallback(async () => {
    // Validate we have required data
    if (!matchData.tournament_match_id || matchData.tournament_match_id === 0) {
      console.error("Cannot fetch results: match not yet saved to database");
      return;
    }

    setIsRefreshing(true);

    try {
      const response = await fetch("/api/nakka/fetch-match-results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tournament_match_id: matchData.tournament_match_id,
          nakka_match_identifier: matchData.nakka_match_identifier,
          match_href: matchData.href,
          nick_name: nickname,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch match results");
      }

      if (data.success && data.data) {
        // Update match data with fresh results
        setMatchData({
          tournament_match_id: data.data.tournament_match_id,
          nakka_match_identifier: data.data.nakka_match_identifier,
          match_type: data.data.match_type,
          player_name: data.data.player_name,
          player_code: data.data.player_code,
          opponent_name: data.data.opponent_name,
          opponent_code: data.data.opponent_code,
          href: data.data.match_href,
          isChecked: true,
          // Player statistics
          average_score: data.data.average_score,
          player_score: data.data.player_score,
          opponent_score: data.data.opponent_score,
          first_nine_avg: data.data.first_nine_avg,
          checkout_percentage: data.data.checkout_percentage,
          score_60_count: data.data.score_60_count,
          score_100_count: data.data.score_100_count,
          score_140_count: data.data.score_140_count,
          score_180_count: data.data.score_180_count,
          high_finish: data.data.high_finish,
          best_leg: data.data.best_leg,
          worst_leg: data.data.worst_leg,
          // Opponent statistics
          opponent_average_score: data.data.opponent_average_score,
          opponent_first_nine_avg: data.data.opponent_first_nine_avg,
          opponent_checkout_percentage: data.data.opponent_checkout_percentage,
          opponent_score_60_count: data.data.opponent_score_60_count,
          opponent_score_100_count: data.data.opponent_score_100_count,
          opponent_score_140_count: data.data.opponent_score_140_count,
          opponent_score_180_count: data.data.opponent_score_180_count,
          opponent_high_finish: data.data.opponent_high_finish,
          opponent_best_leg: data.data.opponent_best_leg,
          opponent_worst_leg: data.data.opponent_worst_leg,
        });
        console.log("Match results updated successfully");
      }
    } catch (error) {
      console.error("Error fetching match results:", error);
      // TODO: Show error toast to user
    } finally {
      setIsRefreshing(false);
    }
  }, [matchData.tournament_match_id, matchData.nakka_match_identifier, matchData.href, nickname]);

  return (
    <div
      className={`relative border rounded-lg p-3 sm:p-4 transition-all hover:shadow-md ${
        isFetching
          ? "border-teal-500/50 bg-teal-500/5 ring-2 ring-teal-500/20"
          : matchData.isChecked
            ? "border-purple-500/50 bg-purple-500/5"
            : "border-border bg-card"
      }`}
    >
      {isFetching && (
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="default" className="bg-teal-500 hover:bg-teal-600 text-[10px] sm:text-xs px-1.5 sm:px-2">
            <div className="mr-0.5 sm:mr-1 h-2.5 w-2.5 sm:h-3 sm:w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            {t("guest.refreshingResults")}
          </Badge>
        </div>
      )}
      {matchData.isChecked && !isFetching && (
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="default" className="bg-purple-500 hover:bg-purple-600 text-[10px] sm:text-xs px-1.5 sm:px-2">
            <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
            {t("guest.yourMatch")}
          </Badge>
        </div>
      )}

      <div className="space-y-3">
        {/* Match Type Badge - Mobile Only */}
        <div className="flex items-center md:hidden">
          <Badge variant="outline" className="font-mono text-[10px] sm:text-xs">
            {formatMatchType(matchData.match_type)}
          </Badge>
        </div>

        {/* Main Match Info - Responsive Layout */}
        {/* Mobile: Vertical Stack */}
        <div className="space-y-2 md:hidden">
          {/* Player Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span
                className={`truncate text-sm ${matchData.isChecked ? "font-semibold text-purple-400" : "font-medium"}`}
              >
                {matchData.player_name}
              </span>
              {hasResults && matchData.average_score !== null && matchData.average_score !== undefined && (
                <Badge variant="secondary" className="font-mono text-[10px] flex-shrink-0">
                  {matchData.average_score.toFixed(2)}
                </Badge>
              )}
            </div>
            {hasResults && (
              <Badge
                variant="outline"
                className={`font-semibold text-xs flex-shrink-0 ${
                  (matchData.player_score ?? 0) > (matchData.opponent_score ?? 0)
                    ? "bg-green-500/10 text-green-500 border-green-500/50"
                    : "bg-red-500/10 text-red-500 border-red-500/50"
                }`}
              >
                {matchData.player_score}
              </Badge>
            )}
          </div>

          {/* VS Divider */}
          <div className="flex items-center justify-center">
            <span className="text-xs text-muted-foreground font-medium">{t("tournaments.vs")}</span>
          </div>

          {/* Opponent Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="truncate text-sm font-medium">{matchData.opponent_name}</span>
              {hasResults &&
                matchData.opponent_average_score !== null &&
                matchData.opponent_average_score !== undefined && (
                  <Badge variant="secondary" className="font-mono text-[10px] flex-shrink-0">
                    {matchData.opponent_average_score.toFixed(2)}
                  </Badge>
                )}
            </div>
            {hasResults && (
              <Badge
                variant="outline"
                className={`font-semibold text-xs flex-shrink-0 ${
                  (matchData.opponent_score ?? 0) > (matchData.player_score ?? 0)
                    ? "bg-green-500/10 text-green-500 border-green-500/50"
                    : "bg-red-500/10 text-red-500 border-red-500/50"
                }`}
              >
                {matchData.opponent_score}
              </Badge>
            )}
          </div>
        </div>

        {/* Desktop: One Row Layout */}
        <div className="hidden md:flex items-center gap-4">
          {/* Match Type */}
          <div className="flex-shrink-0 w-[120px]">
            <Badge variant="outline" className="font-mono text-xs whitespace-nowrap">
              {formatMatchType(matchData.match_type)}
            </Badge>
          </div>

          {/* Players with Scores */}
          <div className="flex-1 grid grid-cols-5 gap-2 items-center">
            {/* Player */}
            <div className="col-span-2 flex items-center gap-2 justify-end">
              <span className={`truncate ${matchData.isChecked ? "font-semibold text-purple-400" : ""}`}>
                {matchData.player_name}
              </span>
              <div className="w-[60px] flex justify-end">
                {hasResults && matchData.average_score !== null && matchData.average_score !== undefined && (
                  <Badge variant="secondary" className="font-mono text-xs">
                    {matchData.average_score.toFixed(2)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Score and VS Divider */}
            <div className="flex items-center justify-center gap-2 text-muted-foreground font-semibold min-w-[140px]">
              {hasResults ? (
                <>
                  <Badge
                    variant="outline"
                    className={`font-semibold ${
                      (matchData.player_score ?? 0) > (matchData.opponent_score ?? 0)
                        ? "bg-green-500/10 text-green-500 border-green-500/50"
                        : "bg-red-500/10 text-red-500 border-red-500/50"
                    }`}
                  >
                    {matchData.player_score}
                  </Badge>
                  <span>{t("tournaments.vs")}</span>
                  <Badge
                    variant="outline"
                    className={`font-semibold ${
                      (matchData.opponent_score ?? 0) > (matchData.player_score ?? 0)
                        ? "bg-green-500/10 text-green-500 border-green-500/50"
                        : "bg-red-500/10 text-red-500 border-red-500/50"
                    }`}
                  >
                    {matchData.opponent_score}
                  </Badge>
                </>
              ) : (
                <span>{t("tournaments.vs")}</span>
              )}
            </div>

            {/* Opponent */}
            <div className="col-span-2 flex items-center gap-2">
              <div className="w-[60px]">
                {hasResults &&
                  matchData.opponent_average_score !== null &&
                  matchData.opponent_average_score !== undefined && (
                    <Badge variant="secondary" className="font-mono text-xs">
                      {matchData.opponent_average_score.toFixed(2)}
                    </Badge>
                  )}
              </div>
              <span className="truncate">{matchData.opponent_name}</span>
            </div>
          </div>
        </div>

        {/* Basic Statistics - Always Visible */}
        {hasResults &&
          ((matchData.first_nine_avg !== null && matchData.first_nine_avg !== undefined) ||
            (matchData.checkout_percentage !== null && matchData.checkout_percentage !== undefined)) && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border/50">
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                {/* First Nine Average */}
                {matchData.first_nine_avg !== null && matchData.first_nine_avg !== undefined && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                      {t("tournaments.firstNineShort")}:
                    </span>
                    <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs">
                      {matchData.first_nine_avg.toFixed(2)}
                    </Badge>
                  </div>
                )}

                {/* Checkout Percentage */}
                {matchData.checkout_percentage !== null && matchData.checkout_percentage !== undefined && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] sm:text-xs text-muted-foreground">{t("tournaments.coPercent")}:</span>
                    <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs">
                      {matchData.checkout_percentage.toFixed(1)}%
                    </Badge>
                  </div>
                )}
              </div>

              {/* Expand/Collapse Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 px-2 self-start sm:self-auto"
              >
                <span className="text-[10px] sm:text-xs mr-1">{isExpanded ? "Less" : "More"}</span>
                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </div>
          )}

        {/* Detailed Statistics - Expandable */}
        {hasResults && isExpanded && (
          <div className="pt-3 border-t border-border/50 space-y-4">
            {/* Player Stats */}
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 truncate">
                {matchData.player_name}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {matchData.first_nine_avg !== null && matchData.first_nine_avg !== undefined && (
                  <div className="flex flex-col gap-0.5 sm:gap-1">
                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                      {t("tournaments.firstNineShort")}
                    </span>
                    <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs justify-center">
                      {matchData.first_nine_avg.toFixed(2)}
                    </Badge>
                  </div>
                )}
                {matchData.checkout_percentage !== null && matchData.checkout_percentage !== undefined && (
                  <div className="flex flex-col gap-0.5 sm:gap-1">
                    <span className="text-[10px] sm:text-xs text-muted-foreground">{t("tournaments.checkout")}</span>
                    <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs justify-center">
                      {matchData.checkout_percentage.toFixed(1)}%
                    </Badge>
                  </div>
                )}
                {matchData.high_finish !== null && matchData.high_finish !== undefined && (
                  <div className="flex flex-col gap-0.5 sm:gap-1">
                    <span className="text-[10px] sm:text-xs text-muted-foreground">{t("tournaments.highFinish")}</span>
                    <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs justify-center">
                      {matchData.high_finish}
                    </Badge>
                  </div>
                )}
                {matchData.best_leg !== null && matchData.best_leg !== undefined && (
                  <div className="flex flex-col gap-0.5 sm:gap-1">
                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                      {t("tournaments.bestLegShort")}
                    </span>
                    <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs justify-center">
                      {matchData.best_leg} {t("tournaments.darts")}
                    </Badge>
                  </div>
                )}
                {matchData.score_180_count !== null &&
                  matchData.score_180_count !== undefined &&
                  matchData.score_180_count > 0 && (
                    <div className="flex flex-col gap-0.5 sm:gap-1">
                      <span className="text-[10px] sm:text-xs text-muted-foreground">180s</span>
                      <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs justify-center">
                        {matchData.score_180_count}
                      </Badge>
                    </div>
                  )}
                {matchData.score_140_count !== null &&
                  matchData.score_140_count !== undefined &&
                  matchData.score_140_count > 0 && (
                    <div className="flex flex-col gap-0.5 sm:gap-1">
                      <span className="text-[10px] sm:text-xs text-muted-foreground">140+</span>
                      <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs justify-center">
                        {matchData.score_140_count}
                      </Badge>
                    </div>
                  )}
                {matchData.score_100_count !== null &&
                  matchData.score_100_count !== undefined &&
                  matchData.score_100_count > 0 && (
                    <div className="flex flex-col gap-0.5 sm:gap-1">
                      <span className="text-[10px] sm:text-xs text-muted-foreground">100+</span>
                      <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs justify-center">
                        {matchData.score_100_count}
                      </Badge>
                    </div>
                  )}
                {matchData.score_60_count !== null &&
                  matchData.score_60_count !== undefined &&
                  matchData.score_60_count > 0 && (
                    <div className="flex flex-col gap-0.5 sm:gap-1">
                      <span className="text-[10px] sm:text-xs text-muted-foreground">60+</span>
                      <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs justify-center">
                        {matchData.score_60_count}
                      </Badge>
                    </div>
                  )}
              </div>
            </div>

            {/* Opponent Stats */}
            {(matchData.opponent_average_score !== null || matchData.opponent_first_nine_avg !== null) && (
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 truncate">
                  {matchData.opponent_name}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {matchData.opponent_first_nine_avg !== null && matchData.opponent_first_nine_avg !== undefined && (
                    <div className="flex flex-col gap-0.5 sm:gap-1">
                      <span className="text-[10px] sm:text-xs text-muted-foreground">
                        {t("tournaments.firstNineShort")}
                      </span>
                      <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs justify-center">
                        {matchData.opponent_first_nine_avg.toFixed(2)}
                      </Badge>
                    </div>
                  )}
                  {matchData.opponent_checkout_percentage !== null &&
                    matchData.opponent_checkout_percentage !== undefined && (
                      <div className="flex flex-col gap-0.5 sm:gap-1">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          {t("tournaments.checkout")}
                        </span>
                        <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs justify-center">
                          {matchData.opponent_checkout_percentage.toFixed(1)}%
                        </Badge>
                      </div>
                    )}
                  {matchData.opponent_high_finish !== null && matchData.opponent_high_finish !== undefined && (
                    <div className="flex flex-col gap-0.5 sm:gap-1">
                      <span className="text-[10px] sm:text-xs text-muted-foreground">
                        {t("tournaments.highFinish")}
                      </span>
                      <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs justify-center">
                        {matchData.opponent_high_finish}
                      </Badge>
                    </div>
                  )}
                  {matchData.opponent_best_leg !== null && matchData.opponent_best_leg !== undefined && (
                    <div className="flex flex-col gap-0.5 sm:gap-1">
                      <span className="text-[10px] sm:text-xs text-muted-foreground">
                        {t("tournaments.bestLegShort")}
                      </span>
                      <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs justify-center">
                        {matchData.opponent_best_leg} {t("tournaments.darts")}
                      </Badge>
                    </div>
                  )}
                  {matchData.opponent_score_180_count !== null &&
                    matchData.opponent_score_180_count !== undefined &&
                    matchData.opponent_score_180_count > 0 && (
                      <div className="flex flex-col gap-0.5 sm:gap-1">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">180s</span>
                        <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs justify-center">
                          {matchData.opponent_score_180_count}
                        </Badge>
                      </div>
                    )}
                  {matchData.opponent_score_140_count !== null &&
                    matchData.opponent_score_140_count !== undefined &&
                    matchData.opponent_score_140_count > 0 && (
                      <div className="flex flex-col gap-0.5 sm:gap-1">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">140+</span>
                        <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs justify-center">
                          {matchData.opponent_score_140_count}
                        </Badge>
                      </div>
                    )}
                  {matchData.opponent_score_100_count !== null &&
                    matchData.opponent_score_100_count !== undefined &&
                    matchData.opponent_score_100_count > 0 && (
                      <div className="flex flex-col gap-0.5 sm:gap-1">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">100+</span>
                        <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs justify-center">
                          {matchData.opponent_score_100_count}
                        </Badge>
                      </div>
                    )}
                  {matchData.opponent_score_60_count !== null &&
                    matchData.opponent_score_60_count !== undefined &&
                    matchData.opponent_score_60_count > 0 && (
                      <div className="flex flex-col gap-0.5 sm:gap-1">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">60+</span>
                        <Badge variant="secondary" className="font-mono text-[10px] sm:text-xs justify-center">
                          {matchData.opponent_score_60_count}
                        </Badge>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Results Message */}
        {!hasResults && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border/50">
            <span className="text-xs sm:text-sm text-muted-foreground italic">{t("guest.matchNoResults")}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshMatch}
              disabled={isFetching}
              className="text-xs sm:text-sm self-start sm:self-auto"
            >
              {isFetching ? (
                <>
                  <div className="mr-1 sm:mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t("guest.refreshingResults")}
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {t("guest.refreshResults")}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
