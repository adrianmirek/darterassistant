import { useFormContext } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { AddTournamentFormViewModel } from "./AddTournamentForm";
import type { MatchTypeDTO } from "@/types";

interface Step2_MetricsProps {
  matchTypes: MatchTypeDTO[];
  isLoadingMatchTypes: boolean;
  matchTypesError: string | null;
  onSaveMatch: () => void;
}

export default function Step2_Metrics({
  matchTypes,
  isLoadingMatchTypes,
  matchTypesError,
  onSaveMatch,
}: Step2_MetricsProps) {
  const form = useFormContext<AddTournamentFormViewModel>();

  return (
    <div className="space-y-6">
      {/* Match Type, Opponent Name, and Result - Horizontal Layout */}
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3 items-start">
        {/* Match Type Field */}
        <FormField
          control={form.control}
          name="current_match.match_type_id"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Match Type</FormLabel>
              {matchTypesError ? (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{matchTypesError}</div>
              ) : (
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.clearErrors("current_match.match_type_id");
                  }}
                  value={field.value}
                  disabled={isLoadingMatchTypes}
                >
                  <FormControl>
                    <SelectTrigger className="w-full" data-testid="match-type-select">
                      <SelectValue
                        placeholder={isLoadingMatchTypes ? "Loading match types..." : "Select a match type"}
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {matchTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Opponent Name Field */}
        <FormField
          control={form.control}
          name="current_match.opponent_name"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Opponent Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter opponent name" maxLength={255} {...field} data-testid="opponent-name-input" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Result Field (Player Score : Opponent Score) */}
        <div className="flex flex-col space-y-2">
          <FormLabel>Result</FormLabel>
          <div className="flex items-start gap-2">
            <FormField
              control={form.control}
              name="current_match.player_score"
              render={({ field }) => (
                <FormItem className="flex-1 space-y-1">
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                      data-testid="player-score-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <span className="text-lg font-semibold pt-2">:</span>
            <FormField
              control={form.control}
              name="current_match.opponent_score"
              render={({ field }) => (
                <FormItem className="flex-1 space-y-1">
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      {...field}
                      value={field.value || ""}
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                      data-testid="opponent-score-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Performance Metrics</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="current_match.average_score"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Average Score</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0.01"
                    max="180"
                    step="1.00"
                    placeholder=""
                    {...field}
                    value={field.value === 0 ? "" : field.value}
                    onChange={(e) => {
                      const value = e.target.value === "" ? 0 : parseFloat(e.target.value);
                      field.onChange(value);
                      if (value > 0) {
                        form.clearErrors("current_match.average_score");
                      }
                    }}
                    data-testid="average-score-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="current_match.first_nine_avg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Nine Average</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0.01"
                    max="180"
                    step="1.00"
                    placeholder=""
                    {...field}
                    value={field.value === 0 ? "" : field.value}
                    onChange={(e) => {
                      const value = e.target.value === "" ? 0 : parseFloat(e.target.value);
                      field.onChange(value);
                      if (value > 0) {
                        form.clearErrors("current_match.first_nine_avg");
                      }
                    }}
                    data-testid="first-nine-avg-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="current_match.checkout_percentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Checkout Percentage</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1.00"
                    placeholder="0"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    data-testid="checkout-percentage-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="current_match.high_finish"
            render={({ field }) => (
              <FormItem>
                <FormLabel>High Finish</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="170"
                    step="1"
                    placeholder="0"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    data-testid="high-finish-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Score Counts</h3>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FormField
            control={form.control}
            name="current_match.score_60_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel>60+ Scores</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    {...field}
                    value={field.value || ""}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    data-testid="score-60-count-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="current_match.score_100_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel>100+ Scores</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    data-testid="score-100-count-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="current_match.score_140_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel>140+ Scores</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    data-testid="score-140-count-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="current_match.score_180_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel>180 Scores</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                    data-testid="score-180-count-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Leg Performance</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="current_match.best_leg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Best Leg (darts)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="9"
                    step="1"
                    placeholder="21"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 21)}
                    data-testid="best-leg-input"
                  />
                </FormControl>
                <FormDescription>Minimum 9 darts</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="current_match.worst_leg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Worst Leg (darts)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="9"
                    step="1"
                    placeholder="33"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 33)}
                    data-testid="worst-leg-input"
                  />
                </FormControl>
                <FormDescription>Minimum 9 darts</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* NEW: New Match Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button type="button" variant="secondary" onClick={onSaveMatch} data-testid="new-match-button">
          New Match
        </Button>
      </div>
    </div>
  );
}
