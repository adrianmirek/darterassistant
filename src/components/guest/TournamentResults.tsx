import { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Users,
  Trophy,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Target,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/hooks/I18nProvider";
import { cleanPlayerName } from "@/lib/utils/text-normalization";
import type { RetrieveTournamentsMatchesResponseDTO, NakkaTournamentMatchDTO } from "@/types";

interface TournamentResultsProps {
  results: RetrieveTournamentsMatchesResponseDTO;
  nickname: string;
}

interface PlayerStats {
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  avgScore: number;
  avgFirstNine: number;
  avgCheckout: number;
  total180s: number;
  total140s: number;
  total100s: number;
  highFinish: number;
  bestLeg: number;
}

export function TournamentResults({ results, nickname }: TournamentResultsProps) {
  const t = useTranslation();

  // All hooks must be called before any conditional returns
  const [tournamentsData, setTournamentsData] = useState(results?.tournaments || []);

  // Update local state when results prop changes (e.g., after searching tournaments)
  useEffect(() => {
    if (results?.tournaments && Array.isArray(results.tournaments)) {
      setTournamentsData(results.tournaments);
    }
  }, [results]);

  // Calculate player statistics from all matches
  const playerStats = useMemo(() => {
    const stats: PlayerStats = {
      totalMatches: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      avgScore: 0,
      avgFirstNine: 0,
      avgCheckout: 0,
      total180s: 0,
      total140s: 0,
      total100s: 0,
      highFinish: 0,
      bestLeg: 999,
    };

    let scoreSum = 0;
    let scoreCount = 0;
    let firstNineSum = 0;
    let firstNineCount = 0;
    let checkoutSum = 0;
    let checkoutCount = 0;

    tournamentsData.forEach((tournament) => {
      tournament.tournament_matches.forEach((match) => {
        stats.totalMatches++;

        // Win/Loss
        if (
          match.player_score !== null &&
          match.player_score !== undefined &&
          match.opponent_score !== null &&
          match.opponent_score !== undefined
        ) {
          if (match.player_score > match.opponent_score) {
            stats.wins++;
          } else {
            stats.losses++;
          }
        }

        // Average score
        if (match.average_score !== null && match.average_score !== undefined) {
          scoreSum += match.average_score;
          scoreCount++;
        }

        // First nine average
        if (match.first_nine_avg !== null && match.first_nine_avg !== undefined) {
          firstNineSum += match.first_nine_avg;
          firstNineCount++;
        }

        // Checkout percentage
        if (match.checkout_percentage !== null && match.checkout_percentage !== undefined) {
          checkoutSum += match.checkout_percentage;
          checkoutCount++;
        }

        // High scores
        if (match.score_180_count !== null && match.score_180_count !== undefined) {
          stats.total180s += match.score_180_count;
        }
        if (match.score_140_count !== null && match.score_140_count !== undefined) {
          stats.total140s += match.score_140_count;
        }
        if (match.score_100_count !== null && match.score_100_count !== undefined) {
          stats.total100s += match.score_100_count;
        }

        // Best stats
        if (match.high_finish !== null && match.high_finish !== undefined && match.high_finish > stats.highFinish) {
          stats.highFinish = match.high_finish;
        }
        if (
          match.best_leg !== null &&
          match.best_leg !== undefined &&
          match.best_leg > 0 &&
          match.best_leg < stats.bestLeg
        ) {
          stats.bestLeg = match.best_leg;
        }
      });
    });

    stats.winRate = stats.totalMatches > 0 ? (stats.wins / stats.totalMatches) * 100 : 0;
    stats.avgScore = scoreCount > 0 ? scoreSum / scoreCount : 0;
    stats.avgFirstNine = firstNineCount > 0 ? firstNineSum / firstNineCount : 0;
    stats.avgCheckout = checkoutCount > 0 ? checkoutSum / checkoutCount : 0;

    if (stats.bestLeg === 999) stats.bestLeg = 0;

    return stats;
  }, [tournamentsData]);

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

  return (
    <div className="space-y-6">
      {/* Player Overview Section */}
      <PlayerOverview stats={playerStats} nickname={nickname} />

      {/* Tournament List */}
      {tournamentsData &&
        Array.isArray(tournamentsData) &&
        tournamentsData.map((tournament) => {
          return (
            <Card key={tournament.nakka_identifier} className="overflow-hidden">
              {/* Tournament Header */}
              <div className="bg-gradient-to-r from-purple-500/10 to-teal-500/10 border-b px-4 sm:px-6 py-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Trophy className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <h3 className="text-base sm:text-lg font-semibold leading-tight">{tournament.tournament_name}</h3>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>{formatDate(tournament.tournament_date)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span>
                        {tournament.tournament_matches.length}{" "}
                        {tournament.tournament_matches.length === 1 ? t("tournaments.match") : t("tournaments.matches")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Matches List */}
              <div className="p-3 sm:p-6">
                <div className="space-y-3">
                  {tournament.tournament_matches.map((match) => (
                    <MatchCard key={match.nakka_match_identifier} match={match} nickname={nickname} />
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
    </div>
  );
}

interface PlayerOverviewProps {
  stats: PlayerStats;
  nickname: string;
}

function PlayerOverview({ stats, nickname }: PlayerOverviewProps) {
  const t = useTranslation();

  // Determine strong and weak sides
  const strongSides: { label: string; value: string; icon: typeof TrendingUp }[] = [];
  const weakSides: { label: string; value: string; icon: typeof TrendingDown }[] = [];

  // Categorize stats (these thresholds are approximate for darts)
  if (stats.avgScore >= 69) {
    strongSides.push({ label: t("tournaments.avgScore"), value: stats.avgScore.toFixed(2), icon: TrendingUp });
  } else if (stats.avgScore > 0 && stats.avgScore < 60) {
    weakSides.push({ label: t("tournaments.avgScore"), value: stats.avgScore.toFixed(2), icon: TrendingDown });
  }

  if (stats.avgCheckout >= 29) {
    strongSides.push({
      label: t("guest.checkoutPercent"),
      value: `${stats.avgCheckout.toFixed(1)}%`,
      icon: TrendingUp,
    });
  } else if (stats.avgCheckout > 0 && stats.avgCheckout < 25) {
    weakSides.push({
      label: t("guest.checkoutPercent"),
      value: `${stats.avgCheckout.toFixed(1)}%`,
      icon: TrendingDown,
    });
  }

  if (stats.avgFirstNine >= 75) {
    strongSides.push({
      label: t("tournaments.firstNineShort"),
      value: stats.avgFirstNine.toFixed(2),
      icon: TrendingUp,
    });
  } else if (stats.avgFirstNine > 0 && stats.avgFirstNine < 60) {
    weakSides.push({
      label: t("tournaments.firstNineShort"),
      value: stats.avgFirstNine.toFixed(2),
      icon: TrendingDown,
    });
  }

  if (stats.winRate >= 60) {
    strongSides.push({ label: t("guest.winRate"), value: `${stats.winRate.toFixed(1)}%`, icon: TrendingUp });
  } else if (stats.winRate < 40) {
    weakSides.push({ label: t("guest.winRate"), value: `${stats.winRate.toFixed(1)}%`, icon: TrendingDown });
  }

  return (
    <Card className="overflow-hidden border-2 border-purple-500/30">
      <div className="bg-gradient-to-r from-purple-500/20 to-teal-500/20 border-b px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-purple-400 flex-shrink-0" />
          <div>
            <h2 className="text-xl sm:text-2xl font-bold" translate="no">
              {nickname}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t("guest.performanceOverview")} - {t("guest.lastMatches", { count: stats.totalMatches })}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-muted/50 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-green-500">{stats.wins}</div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">{t("guest.wins")}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-red-500">{stats.losses}</div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">{t("guest.losses")}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-purple-400">
              {stats.avgScore > 0 ? stats.avgScore.toFixed(1) : "-"}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">{t("tournaments.avgScore")}</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 sm:p-4 text-center">
            <div className="text-2xl sm:text-3xl font-bold text-teal-400">
              {stats.winRate > 0 ? stats.winRate.toFixed(0) : "0"}%
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">{t("guest.winRate")}</div>
          </div>
        </div>

        {/* Win/Loss Chart */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">{t("guest.winLossDistribution")}</h3>
          <div className="flex items-center gap-2 h-8 sm:h-10 bg-muted/30 rounded-lg overflow-hidden">
            {stats.totalMatches > 0 ? (
              <>
                <div
                  className="h-full bg-green-500/80 flex items-center justify-center text-xs sm:text-sm font-bold text-white transition-all"
                  style={{ width: `${stats.winRate}%` }}
                >
                  {stats.winRate >= 20 && <span>{stats.wins}</span>}
                </div>
                <div
                  className="h-full bg-red-500/80 flex items-center justify-center text-xs sm:text-sm font-bold text-white transition-all"
                  style={{ width: `${100 - stats.winRate}%` }}
                >
                  {100 - stats.winRate >= 20 && <span>{stats.losses}</span>}
                </div>
              </>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                No data
              </div>
            )}
          </div>
        </div>

        {/* Strong & Weak Sides */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Strong Sides */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-green-500 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t("guest.strongSides")}
            </h3>
            {strongSides.length > 0 ? (
              <div className="space-y-2">
                {strongSides.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2"
                  >
                    <span className="text-xs sm:text-sm">{item.label}</span>
                    <Badge variant="secondary" className="bg-green-500/20 text-green-500 border-green-500/50">
                      {item.value}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic bg-muted/30 rounded-lg px-3 py-2">
                {t("guest.playMoreMatches")}
              </div>
            )}
          </div>

          {/* Weak Sides */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-amber-500 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              {t("guest.areasToImprove")}
            </h3>
            {weakSides.length > 0 ? (
              <div className="space-y-2">
                {weakSides.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2"
                  >
                    <span className="text-xs sm:text-sm">{item.label}</span>
                    <Badge variant="secondary" className="bg-amber-500/20 text-amber-500 border-amber-500/50">
                      {item.value}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic bg-muted/30 rounded-lg px-3 py-2">
                {t("guest.greatPerformance")}
              </div>
            )}
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 pt-4 border-t">
          {stats.total180s > 0 && (
            <div className="text-center">
              <div className="text-lg sm:text-xl font-bold text-amber-400">{stats.total180s}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">{t("guest.score180s")}</div>
            </div>
          )}
          {stats.total140s > 0 && (
            <div className="text-center">
              <div className="text-lg sm:text-xl font-bold">{stats.total140s}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">{t("guest.score140s")}</div>
            </div>
          )}
          {stats.total100s > 0 && (
            <div className="text-center">
              <div className="text-lg sm:text-xl font-bold">{stats.total100s}</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">{t("guest.score100s")}</div>
            </div>
          )}
          {stats.avgCheckout > 0 && (
            <div className="text-center">
              <div className="text-lg sm:text-xl font-bold text-green-400">{stats.avgCheckout.toFixed(1)}%</div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">{t("guest.checkoutPercent")}</div>
            </div>
          )}
          {/* High Finish - Always show */}
          <div className="text-center">
            <div className="text-lg sm:text-xl font-bold text-purple-400">
              {stats.highFinish > 0 ? stats.highFinish : "-"}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">{t("tournaments.highFinish")}</div>
          </div>
          {/* Best Leg - Always show, positioned right of High Finish */}
          <div className="text-center">
            <div className="text-lg sm:text-xl font-bold text-teal-400">{stats.bestLeg > 0 ? stats.bestLeg : "-"}</div>
            <div className="text-[10px] sm:text-xs text-muted-foreground">{t("tournaments.bestLegShort")}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

interface MatchCardProps {
  match: NakkaTournamentMatchDTO;
  nickname: string;
}

function MatchCard({ match }: MatchCardProps) {
  const t = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [matchData, setMatchData] = useState<NakkaTournamentMatchDTO>(match);

  // Update match data when prop changes
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

  return (
    <div
      className={`relative border rounded-lg p-3 sm:p-4 transition-all hover:shadow-md ${
        matchData.isChecked ? "border-purple-500/50 bg-purple-500/5" : "border-border bg-card"
      }`}
    >
      {matchData.isChecked && (
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
                translate="no"
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
              <span className="truncate text-sm font-medium" translate="no">
                {cleanPlayerName(matchData.opponent_name)}
              </span>
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
              <span className={`truncate ${matchData.isChecked ? "font-semibold text-purple-400" : ""}`} translate="no">
                {cleanPlayerName(matchData.player_name)}
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
              <span className="truncate" translate="no">
                {cleanPlayerName(matchData.opponent_name)}
              </span>
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
              <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 truncate" translate="no">
                {cleanPlayerName(matchData.player_name)}
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
                <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2 truncate" translate="no">
                  {cleanPlayerName(matchData.opponent_name)}
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
          <div className="pt-2 border-t border-border/50">
            <span className="text-xs sm:text-sm text-muted-foreground italic">{t("guest.matchNoResults")}</span>
          </div>
        )}
      </div>
    </div>
  );
}
