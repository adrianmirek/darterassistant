import { useFormContext } from "react-hook-form";
import { format } from "date-fns";
import type { AddTournamentFormViewModel } from "./AddTournamentForm";
import type { MatchTypeDTO } from "@/types";

interface Step3_ReviewProps {
  matchTypes: MatchTypeDTO[];
}

export default function Step3_Review({ matchTypes }: Step3_ReviewProps) {
  const form = useFormContext<AddTournamentFormViewModel>();
  const values = form.getValues();

  const selectedMatchType = matchTypes.find((type) => type.id.toString() === values.match_type_id);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Basic Information</h3>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-sm font-medium text-muted-foreground">Tournament Name</dt>
            <dd className="text-sm font-semibold">{values.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm font-medium text-muted-foreground">Date</dt>
            <dd className="text-sm font-semibold">{values.date ? format(values.date, "PPP") : "-"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm font-medium text-muted-foreground">Match Type</dt>
            <dd className="text-sm font-semibold">{selectedMatchType?.name || "-"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm font-medium text-muted-foreground">Final Placement</dt>
            <dd className="text-sm font-semibold">{values.final_placement}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Performance Metrics</h3>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Average Score</dt>
            <dd className="mt-1 text-2xl font-bold">{values.average_score.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">First Nine Avg</dt>
            <dd className="mt-1 text-2xl font-bold">{values.first_nine_avg.toFixed(2)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Checkout %</dt>
            <dd className="mt-1 text-2xl font-bold">{values.checkout_percentage.toFixed(2)}%</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">High Finish</dt>
            <dd className="mt-1 text-2xl font-bold">{values.high_finish === 0 ? "-" : values.high_finish}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Score Counts</h3>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">60+ Scores</dt>
            <dd className="mt-1 text-xl font-bold">{values.score_60_count}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">100+ Scores</dt>
            <dd className="mt-1 text-xl font-bold">{values.score_100_count}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">140+ Scores</dt>
            <dd className="mt-1 text-xl font-bold">{values.score_140_count}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">180 Scores</dt>
            <dd className="mt-1 text-xl font-bold">{values.score_180_count}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Leg Performance</h3>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Best Leg</dt>
            <dd className="mt-1 text-2xl font-bold">{values.best_leg} darts</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Worst Leg</dt>
            <dd className="mt-1 text-2xl font-bold">{values.worst_leg} darts</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg bg-muted p-4">
        <p className="text-sm text-muted-foreground">
          Please review all information above before submitting. You can go back to make any changes.
        </p>
      </div>
    </div>
  );
}
