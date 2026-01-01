import { useState, useEffect } from "react";
import { format, subMonths } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Calendar } from "lucide-react";
import TournamentCard from "./TournamentCard";
import DateRangePicker from "./DateRangePicker";
import PaginationControls from "./PaginationControls";
import PageHeader from "@/components/PageHeader";
import { I18nProvider, useTranslation } from "@/lib/hooks/I18nProvider";
import { type Language, defaultLanguage } from "@/lib/i18n";
import type { PaginatedTournamentsData, ApiResponse } from "@/types";

function TournamentsPageContent() {
  const t = useTranslation();

  // Initialize with one month range (default)
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [startDate, setStartDate] = useState<Date>(subMonths(new Date(), 1));
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  const [data, setData] = useState<PaginatedTournamentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTournaments = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        page: currentPage.toString(),
        page_size: pageSize.toString(),
      });

      const response = await fetch(`/api/tournaments/list?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<PaginatedTournamentsData> = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("tournaments.errorLoadingTournaments"));
    } finally {
      setLoading(false);
    }
  };

  // Fetch tournaments when filters change
  useEffect(() => {
    fetchTournaments();
  }, [startDate, endDate, currentPage, pageSize]);

  const handleDateRangeChange = (newStartDate: Date, newEndDate: Date) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of page
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="container max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <PageHeader titleKey="tournaments.tournamentsListTitle" subtitleKey="tournaments.selectDateRange" />

      {/* Date Range Filter */}
      <div className="mb-6 sm:mb-8 bg-card border border-border rounded-lg p-4 sm:p-6 shadow-sm">
        <DateRangePicker startDate={startDate} endDate={endDate} onDateRangeChange={handleDateRangeChange} />
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4 sm:space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-border rounded-lg p-4 sm:p-6 space-y-3 sm:space-y-4">
              <Skeleton className="h-6 sm:h-8 w-3/4" />
              <Skeleton className="h-3 sm:h-4 w-1/2" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {[1, 2, 3, 4].map((j) => (
                  <Skeleton key={j} className="h-16 sm:h-20" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Empty State */}
      {!loading && !error && data && data.tournaments.length === 0 && (
        <div className="text-center py-12 sm:py-16">
          <Calendar className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-3 sm:mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold mb-2">{t("tournaments.emptyState")}</h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
            {t("tournaments.emptyStateDescription")}
          </p>
        </div>
      )}

      {/* Tournaments List */}
      {!loading && !error && data && data.tournaments.length > 0 && (
        <>
          <div className="mb-3 sm:mb-4 text-xs sm:text-sm text-muted-foreground">
            {t("tournaments.showingResults").replace("{count}", data.pagination.total_count.toString())}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 mb-6 sm:mb-8">
            {data.tournaments.map((tournament) => (
              <TournamentCard key={tournament.tournament_id} tournament={tournament} />
            ))}
          </div>

          {/* Pagination */}
          <PaginationControls
            currentPage={data.pagination.current_page}
            totalPages={data.pagination.total_pages}
            hasNextPage={data.pagination.has_next_page}
            hasPreviousPage={data.pagination.has_previous_page}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}

export default function TournamentsPage() {
  const [lang, setLang] = useState<Language>(defaultLanguage);

  useEffect(() => {
    // Get language from localStorage or window global
    const storedLang = localStorage.getItem("darter-language") as Language;
    const windowLang =
      (typeof window !== "undefined" && (window as { __DARTER_LANG__?: Language }).__DARTER_LANG__) || undefined;
    const currentLang = storedLang || windowLang || defaultLanguage;
    setLang(currentLang);
  }, []);

  return (
    <I18nProvider lang={lang}>
      <TournamentsPageContent />
    </I18nProvider>
  );
}
