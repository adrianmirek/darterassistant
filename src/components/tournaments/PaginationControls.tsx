import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/hooks/I18nProvider";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
}: PaginationControlsProps) {
  const t = useTranslation();

  if (totalPages <= 1) {
    return null;
  }

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      // Show last page
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mt-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPreviousPage}
        aria-label={t("tournaments.previousPage")}
        className="px-2 sm:px-4"
      >
        <ChevronLeft className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline">{t("tournaments.previousPage")}</span>
      </Button>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, idx) =>
          typeof page === "number" ? (
            <Button
              key={idx}
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
              className="min-w-[2rem] sm:min-w-[2.5rem] px-2 sm:px-3"
            >
              {page}
            </Button>
          ) : (
            <span key={idx} className="px-1 sm:px-2 text-muted-foreground text-sm">
              {page}
            </span>
          )
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage}
        aria-label={t("tournaments.nextPage")}
        className="px-2 sm:px-4"
      >
        <span className="hidden sm:inline">{t("tournaments.nextPage")}</span>
        <ChevronRight className="h-4 w-4 sm:ml-1" />
      </Button>
    </div>
  );
}
