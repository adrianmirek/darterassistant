import { useState, useEffect } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { enGB, pl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation, useLanguage } from "@/lib/hooks/I18nProvider";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
}

export default function DateRangePicker({ startDate, endDate, onDateRangeChange }: DateRangePickerProps) {
  const t = useTranslation();
  const lang = useLanguage();
  const dateLocale = lang === "pl" ? pl : enGB;
  const [localStartDate, setLocalStartDate] = useState<Date>(startDate);
  const [localEndDate, setLocalEndDate] = useState<Date>(endDate);
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  useEffect(() => {
    setLocalStartDate(startDate);
    setLocalEndDate(endDate);
  }, [startDate, endDate]);

  const handleStartDateSelect = (date: Date | undefined) => {
    if (date) {
      setLocalStartDate(date);
      setStartOpen(false);
      // Auto-apply if both dates are valid
      if (date <= localEndDate) {
        onDateRangeChange(date, localEndDate);
      }
    }
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    if (date) {
      setLocalEndDate(date);
      setEndOpen(false);
      // Auto-apply if both dates are valid
      if (date >= localStartDate) {
        onDateRangeChange(localStartDate, date);
      }
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center flex-1">
        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <label className="text-sm font-medium text-muted-foreground">{t("tournaments.startDate")}</label>
          <Popover open={startOpen} onOpenChange={setStartOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-[240px] justify-start text-left font-normal",
                  !localStartDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {localStartDate ? (
                  format(localStartDate, "PPP", { locale: dateLocale })
                ) : (
                  <span>{t("tournaments.pickDate")}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 notranslate" align="start" translate="no">
              <Calendar
                mode="single"
                selected={localStartDate}
                onSelect={handleStartDateSelect}
                initialFocus
                disabled={(date) => date > localEndDate || date > new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-2 w-full sm:w-auto">
          <label className="text-sm font-medium text-muted-foreground">{t("tournaments.endDate")}</label>
          <Popover open={endOpen} onOpenChange={setEndOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-[240px] justify-start text-left font-normal",
                  !localEndDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {localEndDate ? (
                  format(localEndDate, "PPP", { locale: dateLocale })
                ) : (
                  <span>{t("tournaments.pickDate")}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 notranslate" align="start" translate="no">
              <Calendar
                mode="single"
                selected={localEndDate}
                onSelect={handleEndDateSelect}
                initialFocus
                disabled={(date) => date < localStartDate || date > new Date()}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
