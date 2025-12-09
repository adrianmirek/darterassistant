import { useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import type { AddTournamentFormViewModel, MatchDataViewModel } from "./AddTournamentForm";
import type { MatchTypeDTO, TournamentTypeDTO } from "@/types";
import { Button } from "@/components/ui/button";

interface Step3_ReviewProps {
  matchTypes: MatchTypeDTO[];
  tournamentTypes: TournamentTypeDTO[];
  matches: MatchDataViewModel[];
  onRemoveMatch: (index: number) => void;
}

export default function Step3_Review({ matchTypes, tournamentTypes, matches, onRemoveMatch }: Step3_ReviewProps) {
  const form = useFormContext<AddTournamentFormViewModel>();
  const values = form.getValues();

  const selectedTournamentType = tournamentTypes.find((type) => type.id.toString() === values.tournament_type_id);

  // Helper function to get match type name
  const getMatchTypeName = (matchTypeId: string) => {
    const matchType = matchTypes.find((type) => type.id.toString() === matchTypeId);
    return matchType?.name || "Unknown";
  };

  return (
    <div className="space-y-6">
      {/* Tournament Information Card */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Tournament Information</h3>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-sm font-medium text-muted-foreground">Tournament Name</dt>
            <dd className="text-sm font-semibold" data-testid="review-tournament-name">
              {values.name}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm font-medium text-muted-foreground">Date</dt>
            <dd className="text-sm font-semibold" data-testid="review-tournament-date">
              {values.date ? format(values.date, "PPP") : "-"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm font-medium text-muted-foreground">Tournament Type</dt>
            <dd className="text-sm font-semibold" data-testid="review-tournament-type">
              {selectedTournamentType?.name || "-"}
            </dd>
          </div>
          {values.final_place && (
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-muted-foreground">Final Place</dt>
              <dd className="text-sm font-semibold" data-testid="review-final-place">
                {values.final_place}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Matches Table Card */}
      <div className="rounded-lg border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Matches</h3>
          <span className="text-sm text-muted-foreground" data-testid="review-matches-count">
            {matches.length} {matches.length === 1 ? "match" : "matches"}
          </span>
        </div>

        {matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matches added yet.</p>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm" data-testid="review-matches-table">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="pb-3 font-medium text-muted-foreground">#</th>
                    <th className="pb-3 font-medium text-muted-foreground">Match Type</th>
                    <th className="pb-3 font-medium text-muted-foreground">Opponent</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">Result</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Avg</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">CO%</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">60+</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">100+</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">140+</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">180s</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">High Finish</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Best Leg</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {matches.map((match, index) => (
                    <tr key={index} className="hover:bg-muted/50">
                      <td className="py-3 text-muted-foreground">{index + 1}</td>
                      <td className="py-3 font-medium">{getMatchTypeName(match.match_type_id)}</td>
                      <td className="py-3">
                        {match.opponent_name || <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="py-3 text-center font-mono">
                        {match.player_score} : {match.opponent_score}
                      </td>
                      <td className="py-3 text-right font-mono">{match.average_score.toFixed(2)}</td>
                      <td className="py-3 text-right font-mono">{match.checkout_percentage.toFixed(1)}%</td>
                      <td className="py-3 text-right font-mono">{match.score_60_count}</td>
                      <td className="py-3 text-right font-mono">{match.score_100_count}</td>
                      <td className="py-3 text-right font-mono">{match.score_140_count}</td>
                      <td className="py-3 text-right font-mono">{match.score_180_count}</td>
                      <td className="py-3 text-right font-mono">{match.high_finish || "-"}</td>
                      <td className="py-3 text-right font-mono">{match.best_leg}</td>
                      <td className="py-3 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveMatch(index)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          data-testid={`remove-match-${index}`}
                          aria-label={`Remove match ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block sm:hidden space-y-3" data-testid="review-matches-cards">
              {matches.map((match, index) => (
                <div
                  key={index}
                  className="rounded-lg border bg-muted/50 p-4 hover:bg-muted transition-colors match-card"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">Match {index + 1}</h4>
                      <p className="text-sm text-muted-foreground">{getMatchTypeName(match.match_type_id)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveMatch(index)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      data-testid={`remove-match-${index}`}
                      aria-label={`Remove match ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {match.opponent_name && (
                    <p className="text-sm mb-2">
                      <span className="text-muted-foreground">vs</span>{" "}
                      <span className="font-medium">{match.opponent_name}</span>
                    </p>
                  )}

                  <div className="text-sm mb-3">
                    <span className="text-muted-foreground">Result:</span>{" "}
                    <span className="font-mono font-semibold">
                      {match.player_score} : {match.opponent_score}
                    </span>
                  </div>

                  <dl className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Avg</dt>
                      <dd className="font-mono font-semibold">{match.average_score.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">1st 9</dt>
                      <dd className="font-mono font-semibold">{match.first_nine_avg.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">CO%</dt>
                      <dd className="font-mono font-semibold">{match.checkout_percentage.toFixed(1)}%</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">180s</dt>
                      <dd className="font-mono font-semibold">{match.score_180_count}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Best Leg</dt>
                      <dd className="font-mono font-semibold">{match.best_leg}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">High Finish</dt>
                      <dd className="font-mono font-semibold">{match.high_finish || "-"}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Optional: Summary Statistics Card */}
      {matches.length > 1 && (
        <div className="rounded-lg border bg-card p-6" data-testid="overall-stats-card">
          <h3 className="mb-4 text-lg font-semibold">Overall Statistics</h3>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Avg Score</dt>
              <dd className="mt-1 text-2xl font-bold">
                {(matches.reduce((sum, m) => sum + m.average_score, 0) / matches.length).toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">CO%</dt>
              <dd className="mt-1 text-2xl font-bold">
                {(matches.reduce((sum, m) => sum + m.checkout_percentage, 0) / matches.length).toFixed(1)}%
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">60+</dt>
              <dd className="mt-1 text-2xl font-bold">{matches.reduce((sum, m) => sum + m.score_60_count, 0)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">100+</dt>
              <dd className="mt-1 text-2xl font-bold">{matches.reduce((sum, m) => sum + m.score_100_count, 0)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">140+</dt>
              <dd className="mt-1 text-2xl font-bold">{matches.reduce((sum, m) => sum + m.score_140_count, 0)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">180s</dt>
              <dd className="mt-1 text-2xl font-bold">{matches.reduce((sum, m) => sum + m.score_180_count, 0)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Best Leg</dt>
              <dd className="mt-1 text-2xl font-bold">{Math.min(...matches.map((m) => m.best_leg))} darts</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">High Finish</dt>
              <dd className="mt-1 text-2xl font-bold">{Math.max(...matches.map((m) => m.high_finish))}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* Info Banner */}
      <div className="rounded-lg bg-muted p-4">
        <p className="text-sm text-muted-foreground">
          Review your tournament and all matches above. You can add more matches or submit to save.
        </p>
      </div>
    </div>
  );
}
