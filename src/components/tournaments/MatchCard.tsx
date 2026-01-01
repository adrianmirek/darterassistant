import type { MatchDetail } from "@/types";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/hooks/I18nProvider";

interface MatchCardProps {
  match: MatchDetail;
}

export default function MatchCard({ match }: MatchCardProps) {
  const t = useTranslation();

  const isWin = match.player_score > match.opponent_score;

  return (
    <div className="p-3 sm:p-4 border border-border rounded-lg bg-card hover:bg-accent/5 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-medium truncate">{match.opponent}</span>
            <span className="text-xs text-muted-foreground">{match.match_type}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isWin ? "default" : "secondary"} className="text-xs sm:text-sm font-bold">
            {match.result}
          </Badge>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        <StatItem label={t("tournaments.avgScore")} value={match.average_score.toFixed(2)} />
        <StatItem label={t("tournaments.firstNineShort")} value={match.first_nine_avg.toFixed(2)} />
        <StatItem label={t("tournaments.coPercent")} value={`${match.checkout_percentage.toFixed(1)}%`} />
        <StatItem label={t("tournaments.highFinish")} value={match.high_finish} />
        <StatItem
          label={t("tournaments.bestLegShort")}
          value={match.best_leg > 0 ? `${match.best_leg} ${t("tournaments.darts")}` : "-"}
        />
        <StatItem label="180s" value={match.score_180s} highlight={match.score_180s > 0} />
        <StatItem label="140+" value={match.score_140_plus} highlight={match.score_140_plus > 0} />
        <StatItem label="100+" value={match.score_100_plus} highlight={match.score_100_plus > 0} />
        <StatItem label="60+" value={match.score_60_plus} highlight={match.score_60_plus > 0} />
      </div>
    </div>
  );
}

interface StatItemProps {
  label: string;
  value: string | number;
  highlight?: boolean;
}

function StatItem({ label, value, highlight = false }: StatItemProps) {
  return (
    <div className="flex flex-col min-w-0">
      <span className="text-xs text-muted-foreground truncate">{label}</span>
      <span className={`text-xs sm:text-sm font-semibold ${highlight ? "text-primary" : "text-foreground"} truncate`}>
        {value}
      </span>
    </div>
  );
}
