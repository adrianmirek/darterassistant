import { useMemo } from "react";
import { TrendingUp, TrendingDown, Trophy, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GetPlayerMatchesResponseDTO, NakkaPlayerMatchResult } from "@/types";

interface PlayerOverviewProps {
  results: GetPlayerMatchesResponseDTO | null;
  nickname: string;
}

export function PlayerOverview({ results, nickname }: PlayerOverviewProps) {
  const stats = useMemo(() => {
    if (!results || !results.matches || results.matches.length === 0) {
      return null;
    }

    const matches = results.matches;
    const totalMatches = matches.length;

    // Calculate wins and losses
    let wins = 0;
    let losses = 0;
    let totalAverage = 0;
    let avgCount = 0;
    let totalCheckout = 0;
    let checkoutCount = 0;
    let totalFirstNine = 0;
    let firstNineCount = 0;
    let total180s = 0;
    let total140s = 0;
    let total100s = 0;

    matches.forEach((match: NakkaPlayerMatchResult) => {
      // Count wins/losses
      if (
        match.player_score !== null &&
        match.player_score !== undefined &&
        match.opponent_score !== null &&
        match.opponent_score !== undefined
      ) {
        if (match.player_score > match.opponent_score) {
          wins++;
        } else {
          losses++;
        }
      }

      // Average score
      if (match.average_score !== null && match.average_score !== undefined) {
        totalAverage += match.average_score;
        avgCount++;
      }

      // Checkout percentage
      if (match.checkout_percentage !== null && match.checkout_percentage !== undefined) {
        totalCheckout += match.checkout_percentage;
        checkoutCount++;
      }

      // First nine average
      if (match.first_nine_avg !== null && match.first_nine_avg !== undefined) {
        totalFirstNine += match.first_nine_avg;
        firstNineCount++;
      }

      // High scores
      if (match.score_180_count) total180s += match.score_180_count;
      if (match.score_140_count) total140s += match.score_140_count;
      if (match.score_100_count) total100s += match.score_100_count;
    });

    const avgScore = avgCount > 0 ? totalAverage / avgCount : 0;
    const avgCheckout = checkoutCount > 0 ? totalCheckout / checkoutCount : 0;
    const avgFirstNine = firstNineCount > 0 ? totalFirstNine / firstNineCount : 0;
    const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

    // Determine strong and weak sides
    const metrics = [
      { label: "Average Score", value: avgScore, threshold: 70 },
      { label: "Checkout %", value: avgCheckout, threshold: 30 },
      { label: "First 9 Avg", value: avgFirstNine, threshold: 70 },
    ];

    const strongSide = metrics.reduce((prev, current) => {
      const prevScore = prev.value / prev.threshold;
      const currentScore = current.value / current.threshold;
      return currentScore > prevScore ? current : prev;
    });

    const weakSide = metrics.reduce((prev, current) => {
      const prevScore = prev.value / prev.threshold;
      const currentScore = current.value / current.threshold;
      return currentScore < prevScore ? current : prev;
    });

    // Prepare chart data - group matches into segments for visualization
    const segmentSize = Math.ceil(totalMatches / 10); // Divide into ~10 segments
    const chartData: { wins: number; losses: number; avgScore: number }[] = [];

    for (let i = 0; i < totalMatches; i += segmentSize) {
      const segment = matches.slice(i, i + segmentSize);
      let segmentWins = 0;
      let segmentLosses = 0;
      let segmentAvgTotal = 0;
      let segmentAvgCount = 0;

      segment.forEach((match: NakkaPlayerMatchResult) => {
        if (
          match.player_score !== null &&
          match.player_score !== undefined &&
          match.opponent_score !== null &&
          match.opponent_score !== undefined
        ) {
          if (match.player_score > match.opponent_score) {
            segmentWins++;
          } else {
            segmentLosses++;
          }
        }

        if (match.average_score !== null && match.average_score !== undefined) {
          segmentAvgTotal += match.average_score;
          segmentAvgCount++;
        }
      });

      chartData.push({
        wins: segmentWins,
        losses: segmentLosses,
        avgScore: segmentAvgCount > 0 ? segmentAvgTotal / segmentAvgCount : 0,
      });
    }

    return {
      totalMatches,
      wins,
      losses,
      winRate,
      avgScore,
      avgCheckout,
      avgFirstNine,
      total180s,
      total140s,
      total100s,
      strongSide,
      weakSide,
      chartData,
    };
  }, [results]);

  if (!stats) {
    return null;
  }

  const maxAvgScore = Math.max(...stats.chartData.map((d) => d.avgScore), 100);
  const maxMatches = Math.max(...stats.chartData.map((d) => d.wins + d.losses), 5);

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/10 to-teal-500/10 border-b px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="h-5 w-5 text-purple-400 flex-shrink-0" />
          <h3 className="text-base sm:text-lg font-semibold">{nickname}&apos;s Performance Overview</h3>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Last {stats.totalMatches} {stats.totalMatches === 1 ? "match" : "matches"}
        </p>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Win/Loss Record */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="text-3xl sm:text-4xl font-bold text-green-500">{stats.wins}</div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">Wins</div>
          </div>
          <div className="text-center p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="text-3xl sm:text-4xl font-bold text-red-500">{stats.losses}</div>
            <div className="text-xs sm:text-sm text-muted-foreground mt-1">Losses</div>
          </div>
        </div>

        {/* Win Rate */}
        <div className="text-center">
          <div className="text-2xl sm:text-3xl font-bold">{stats.winRate.toFixed(1)}%</div>
          <div className="text-xs sm:text-sm text-muted-foreground">Win Rate</div>
        </div>

        {/* Performance Chart */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">Performance Trend</h4>
          <div className="bg-muted/20 rounded-lg p-4 space-y-4">
            {/* Win/Loss Chart */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Match Results</div>
              <div className="flex items-end gap-1 h-24">
                {stats.chartData.map((segment, idx) => {
                  const totalSegmentMatches = segment.wins + segment.losses;
                  const winHeight = totalSegmentMatches > 0 ? (segment.wins / maxMatches) * 100 : 0;
                  const lossHeight = totalSegmentMatches > 0 ? (segment.losses / maxMatches) * 100 : 0;

                  return (
                    <div key={idx} className="flex-1 flex flex-col justify-end items-center gap-0.5 h-full">
                      {segment.wins > 0 && (
                        <div
                          className="w-full bg-green-500 rounded-t transition-all hover:bg-green-600"
                          style={{ height: `${winHeight}%` }}
                          title={`${segment.wins} wins`}
                        />
                      )}
                      {segment.losses > 0 && (
                        <div
                          className="w-full bg-red-500 rounded-b transition-all hover:bg-red-600"
                          style={{ height: `${lossHeight}%` }}
                          title={`${segment.losses} losses`}
                        />
                      )}
                      {totalSegmentMatches === 0 && <div className="w-full h-1 bg-muted/50" />}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Oldest</span>
                <span>Recent</span>
              </div>
            </div>

            {/* Average Score Chart */}
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Average Score Trend</div>
              <div className="flex items-end gap-1 h-16">
                {stats.chartData.map((segment, idx) => {
                  const height = segment.avgScore > 0 ? (segment.avgScore / maxAvgScore) * 100 : 0;
                  return (
                    <div
                      key={idx}
                      className="flex-1 bg-gradient-to-t from-purple-500 to-teal-400 rounded-t transition-all hover:opacity-80"
                      style={{ height: `${height}%` }}
                      title={`Avg: ${segment.avgScore.toFixed(1)}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-card border rounded-lg">
            <Badge variant="secondary" className="font-mono text-xs sm:text-sm mb-1">
              {stats.avgScore.toFixed(1)}
            </Badge>
            <div className="text-[10px] sm:text-xs text-muted-foreground">Avg Score</div>
          </div>
          <div className="text-center p-3 bg-card border rounded-lg">
            <Badge variant="secondary" className="font-mono text-xs sm:text-sm mb-1">
              {stats.avgCheckout.toFixed(1)}%
            </Badge>
            <div className="text-[10px] sm:text-xs text-muted-foreground">Checkout</div>
          </div>
          <div className="text-center p-3 bg-card border rounded-lg">
            <Badge variant="secondary" className="font-mono text-xs sm:text-sm mb-1">
              {stats.avgFirstNine.toFixed(1)}
            </Badge>
            <div className="text-[10px] sm:text-xs text-muted-foreground">First 9</div>
          </div>
        </div>

        {/* Strong & Weak Sides */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-start gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-green-500 mb-1">Strong Side</div>
                <div className="text-sm font-medium truncate">{stats.strongSide.label}</div>
                <Badge variant="secondary" className="font-mono text-xs mt-1">
                  {stats.strongSide.value.toFixed(1)}
                  {stats.strongSide.label.includes("%") ? "%" : ""}
                </Badge>
              </div>
            </div>
          </div>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
            <div className="flex items-start gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-amber-500 mb-1">Area to Improve</div>
                <div className="text-sm font-medium truncate">{stats.weakSide.label}</div>
                <Badge variant="secondary" className="font-mono text-xs mt-1">
                  {stats.weakSide.value.toFixed(1)}
                  {stats.weakSide.label.includes("%") ? "%" : ""}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* High Scores Summary */}
        {(stats.total180s > 0 || stats.total140s > 0 || stats.total100s > 0) && (
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-amber-400" />
              <h4 className="text-sm font-semibold text-muted-foreground">High Scores</h4>
            </div>
            <div className="flex flex-wrap gap-3">
              {stats.total180s > 0 && (
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-amber-400">{stats.total180s}</span>
                  <span className="text-xs text-muted-foreground">× 180s</span>
                </div>
              )}
              {stats.total140s > 0 && (
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-amber-400">{stats.total140s}</span>
                  <span className="text-xs text-muted-foreground">× 140+</span>
                </div>
              )}
              {stats.total100s > 0 && (
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold text-amber-400">{stats.total100s}</span>
                  <span className="text-xs text-muted-foreground">× 100+</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
