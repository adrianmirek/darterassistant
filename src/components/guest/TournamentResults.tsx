import { Calendar, Users, Trophy, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/hooks/I18nProvider";
import type { RetrieveTournamentsMatchesResponseDTO, NakkaTournamentMatchDTO } from "@/types";

interface TournamentResultsProps {
  results: RetrieveTournamentsMatchesResponseDTO;
}

export function TournamentResults({ results }: TournamentResultsProps) {
  const t = useTranslation();

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatMatchType = (matchType: string): string => {
    // Convert match type codes to readable format
    const typeMap: Record<string, string> = {
      rr: "Round Robin",
      t_top_16: "Top 16",
      t_top_8: "Top 8",
      t_quarter_final: "Quarter Final",
      t_semi_final: "Semi Final",
      t_final: "Final",
    };
    return typeMap[matchType] || matchType;
  };

  return (
    <div className="space-y-6">
      {results.tournaments.map((tournament) => (
        <Card key={tournament.nakka_identifier} className="overflow-hidden">
          {/* Tournament Header */}
          <div className="bg-gradient-to-r from-purple-500/10 to-teal-500/10 border-b px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-5 w-5 text-purple-400" />
                  <h3 className="text-lg font-semibold">
                    {tournament.tournament_name}
                  </h3>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(tournament.tournament_date)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>
                      {tournament.tournament_matches.length}{" "}
                      {tournament.tournament_matches.length === 1
                        ? t("tournaments.match")
                        : t("tournaments.matches")}
                    </span>
                  </div>
                </div>
              </div>
              <a
                href={tournament.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                {t("common.viewDetails")}
              </a>
            </div>
          </div>

          {/* Matches List */}
          <div className="p-6">
            <div className="space-y-3">
              {tournament.tournament_matches.map((match) => (
                <MatchCard key={match.nakka_match_identifier} match={match} />
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

interface MatchCardProps {
  match: NakkaTournamentMatchDTO;
}

function MatchCard({ match }: MatchCardProps) {
  const t = useTranslation();

  const formatMatchType = (matchType: string): string => {
    const typeMap: Record<string, string> = {
      rr: "Round Robin",
      t_top_16: "Top 16",
      t_top_8: "Top 8",
      t_quarter_final: "Quarter Final",
      t_semi_final: "Semi Final",
      t_final: "Final",
    };
    return typeMap[matchType] || matchType;
  };

  return (
    <div
      className={`relative border rounded-lg p-4 transition-all hover:shadow-md ${
        match.isChecked
          ? "border-purple-500/50 bg-purple-500/5"
          : "border-border bg-card"
      }`}
    >
      {match.isChecked && (
        <div className="absolute top-2 right-2">
          <Badge variant="default" className="bg-purple-500 hover:bg-purple-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("guest.yourMatch")}
          </Badge>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        {/* Match Type */}
        <div className="flex-shrink-0">
          <Badge variant="outline" className="font-mono text-xs">
            {formatMatchType(match.match_type)}
          </Badge>
        </div>

        {/* Players */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
          {/* Player */}
          <div className="flex items-center gap-2">
            <div
              className={`flex-1 ${
                match.isChecked ? "font-semibold text-purple-400" : ""
              }`}
            >
              <div className="text-sm text-muted-foreground">
                {t("guest.playerLabel")}
              </div>
              <div className="truncate">{match.player_name}</div>
              <div className="text-xs text-muted-foreground font-mono">
                {match.player_code}
              </div>
            </div>
          </div>

          {/* VS Divider */}
          <div className="hidden md:flex items-center justify-center text-muted-foreground font-semibold">
            {t("tournaments.vs")}
          </div>

          {/* Opponent */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="text-sm text-muted-foreground">
                {t("guest.opponentLabel")}
              </div>
              <div className="truncate">{match.opponent_name}</div>
              <div className="text-xs text-muted-foreground font-mono">
                {match.opponent_code}
              </div>
            </div>
          </div>
        </div>

        {/* Match Link */}
        <div className="flex-shrink-0">
          <a
            href={match.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-teal-400 hover:text-teal-300 transition-colors underline"
          >
            {t("guest.matchDetails")}
          </a>
        </div>
      </div>
    </div>
  );
}

