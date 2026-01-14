import { Construction } from "lucide-react";
import { useTranslation } from "@/lib/hooks/I18nProvider";

export function GuestHomepageUnderConstruction() {
  const t = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="container mx-auto px-4 py-6 sm:py-12">
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-teal-400 to-purple-400 bg-clip-text text-transparent mb-3 sm:mb-4 px-2 pb-1 leading-tight">
            {t("guest.title")}
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            {t("guest.subtitle")}
          </p>
        </div>

        {/* Under Construction Section */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-card border rounded-lg p-8 sm:p-12 shadow-lg text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-amber-500/10 rounded-full">
                <Construction className="h-16 w-16 sm:h-20 sm:w-20 text-amber-400 animate-pulse" />
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold mb-4">{t("guest.underConstructionTitle")}</h2>

            <p className="text-base sm:text-lg text-muted-foreground mb-6">{t("guest.underConstructionMessage")}</p>

            <div className="inline-block px-6 py-3 bg-gradient-to-r from-teal-500/10 to-purple-500/10 border border-teal-500/20 rounded-lg">
              <p className="text-sm text-muted-foreground">{t("guest.underConstructionThanks")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
