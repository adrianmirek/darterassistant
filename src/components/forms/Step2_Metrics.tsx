import { useFormContext } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { AddTournamentFormViewModel } from "./AddTournamentForm";

export default function Step2_Metrics() {
  const form = useFormContext<AddTournamentFormViewModel>();

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="final_placement"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Final Placement</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="1"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                />
              </FormControl>
              <FormDescription>Your final position in the tournament</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Performance Metrics</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="average_score"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Average Score</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="180"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="first_nine_avg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Nine Average</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="180"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="checkout_percentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Checkout Percentage</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="high_finish"
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
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                  />
                </FormControl>
                <FormDescription>Enter 0 if no high finish</FormDescription>
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
            name="score_60_count"
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
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="score_100_count"
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
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="score_140_count"
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
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="score_180_count"
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
            name="best_leg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Best Leg (darts)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="9"
                    step="1"
                    placeholder="9"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 9)}
                  />
                </FormControl>
                <FormDescription>Minimum 9 darts</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="worst_leg"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Worst Leg (darts)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="9"
                    step="1"
                    placeholder="9"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 9)}
                  />
                </FormControl>
                <FormDescription>Minimum 9 darts</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}
