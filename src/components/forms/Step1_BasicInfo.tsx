import { useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { AddTournamentFormViewModel } from "./AddTournamentForm";
import type { TournamentTypeDTO } from "@/types";

interface Step1_BasicInfoProps {
  tournamentTypes: TournamentTypeDTO[];
  isLoadingTournamentTypes: boolean;
  tournamentTypesError: string | null;
}

export default function Step1_BasicInfo({
  tournamentTypes,
  isLoadingTournamentTypes,
  tournamentTypesError,
}: Step1_BasicInfoProps) {
  const form = useFormContext<AddTournamentFormViewModel>();

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tournament Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter tournament name" {...field} data-testid="tournament-name-input" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Tournament Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                      data-testid="tournament-date-input"
                    >
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="tournament_type_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tournament Type</FormLabel>
                {tournamentTypesError ? (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    {tournamentTypesError}
                  </div>
                ) : (
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingTournamentTypes}>
                    <FormControl>
                      <SelectTrigger className="w-full" data-testid="tournament-type-select">
                        <SelectValue
                          placeholder={
                            isLoadingTournamentTypes ? "Loading tournament types..." : "Select a tournament type"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tournamentTypes.map((type) => (
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

          <FormField
            control={form.control}
            name="final_place"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Final Place (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter final placement (e.g., 1, 2, 3)"
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? undefined : parseInt(value, 10));
                    }}
                    value={field.value ?? ""}
                    data-testid="final-place-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}
