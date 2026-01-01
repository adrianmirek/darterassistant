import { Trophy, Calendar, Target } from "lucide-react";
import type { TournamentListItem } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import MatchCard from "./MatchCard";
import { useTranslation, useLanguage } from "@/lib/hooks/I18nProvider";
import { format } from "date-fns";
import { enGB, pl } from "date-fns/locale";

interface TournamentCardProps {
  tournament: TournamentListItem;
}

export default function TournamentCard({ tournament }: TournamentCardProps) {
  const t = useTranslation();
  const lang = useLanguage();
  const dateLocale = lang === "pl" ? pl : enGB;
  const stats = tournament.statistics;

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 w-full">
      <CardHeader className="pb-3 p-4 sm:p-6">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold truncate">{tournament.tournament_name}</h3>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-1 text-xs sm:text-sm text-muted-foreground">
              <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span className="truncate">
                {format(new Date(tournament.tournament_date), "PPP", { locale: dateLocale })}
              </span>
            </div>
          </div>
          {tournament.final_place && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Trophy className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-purple-500 dark:text-purple-400 shrink-0" />
              <Badge variant="secondary" className="shrink-0 text-xs sm:text-sm">
                #{tournament.final_place}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs sm:text-sm">
            {tournament.tournament_type}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0">
        {/* Tournament Average - Prominent Display */}
        <div className="flex items-center justify-center p-3 sm:p-4 bg-primary/10 rounded-lg">
          <div className="text-center">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">{t("tournaments.tournamentAverage")}</p>
            <p className="text-2xl sm:text-3xl font-bold text-primary">{stats.tournament_avg.toFixed(2)}</p>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <StatCard label="180s" value={stats.total_180s} highlight={stats.total_180s > 0} />
          <StatCard label="140+" value={stats.total_140_plus} highlight={stats.total_140_plus > 0} />
          <StatCard label="100+" value={stats.total_100_plus} highlight={stats.total_100_plus > 0} />
          <StatCard label="60+" value={stats.total_60_plus} highlight={stats.total_60_plus > 0} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          <StatCard label={t("tournaments.coPercent")} value={`${stats.avg_checkout_percentage.toFixed(1)}%`} />
          <StatCard label={t("tournaments.highFinish")} value={stats.best_high_finish} />
          <StatCard
            label={t("tournaments.bestLegShort")}
            value={stats.best_leg > 0 ? `${stats.best_leg} ${t("tournaments.darts")}` : "-"}
          />
        </div>

        {/* AI Feedback */}
        {tournament.ai_feedback && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs sm:text-sm text-muted-foreground italic break-words">{tournament.ai_feedback}</p>
          </div>
        )}

        {/* Matches Section */}
        {tournament.matches && tournament.matches.length > 0 && (
          <Accordion type="single" collapsible className="border-t pt-3 sm:pt-4">
            <AccordionItem value="matches" className="border-none">
              <AccordionTrigger className="hover:no-underline py-2">
                <div className="flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="font-medium text-sm sm:text-base">
                    {t("tournaments.allMatches")} ({tournament.matches.length})
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-3 sm:pt-4 space-y-2 sm:space-y-3">
                {tournament.matches.map((match) => (
                  <MatchCard key={match.match_id} match={match} />
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  highlight?: boolean;
}

function StatCard({ label, value, highlight = false }: StatCardProps) {
  return (
    <div className="flex flex-col items-center p-2 sm:p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
      <span className="text-xs text-muted-foreground mb-0.5 sm:mb-1 truncate w-full text-center">{label}</span>
      <span className={`text-base sm:text-lg font-bold ${highlight ? "text-primary" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
