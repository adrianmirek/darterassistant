import { useFormContext } from 'react-hook-form';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { AddTournamentFormViewModel } from './AddTournamentForm';
import type { MatchTypeDTO } from '@/types';

interface Step1_BasicInfoProps {
  matchTypes: MatchTypeDTO[];
  isLoadingMatchTypes: boolean;
  matchTypesError: string | null;
}

export default function Step1_BasicInfo({
  matchTypes,
  isLoadingMatchTypes,
  matchTypesError,
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
                <Input
                  placeholder="Enter tournament name"
                  {...field}
                />
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
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? (
                        format(field.value, 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date('1900-01-01')
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="match_type_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Match Type</FormLabel>
              {matchTypesError ? (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {matchTypesError}
                </div>
              ) : (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isLoadingMatchTypes}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue 
                        placeholder={
                          isLoadingMatchTypes 
                            ? 'Loading match types...' 
                            : 'Select a match type'
                        } 
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
      </div>
    </div>
  );
}

