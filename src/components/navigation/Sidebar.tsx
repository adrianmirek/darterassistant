import { Plus, ChevronRight, ChevronLeft, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebarContext } from "@/lib/hooks/SidebarProvider";
import { useTranslation } from "@/lib/hooks/I18nProvider";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const { isExpanded, toggleSidebar } = useSidebarContext();
  const t = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {/* Sidebar */}
      <aside
        style={{
          width: mounted ? undefined : "var(--sidebar-initial-width, 0px)",
        }}
        className={cn(
          "fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border z-40",
          mounted && "transition-all duration-300 ease-in-out",
          mounted && (isExpanded ? "w-64" : "w-0")
        )}
      >
        {/* Sidebar Content */}
        <div
          style={{
            opacity: mounted ? undefined : "var(--sidebar-initial-opacity, 0)",
          }}
          className={cn(
            "flex flex-col h-full pt-24 pb-20",
            mounted && "transition-opacity duration-300",
            mounted && (isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"),
            !mounted && "pointer-events-none"
          )}
        >
          {/* Navigation Items */}
          <nav className="flex-1 px-3 py-4">
            <a
              href="/"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200 group"
            >
              <Trophy className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
              <span className="font-medium">{t("nav.tournaments")}</span>
            </a>
            <a
              href="/tournaments/new"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors duration-200 group"
            >
              <Plus className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
              <span className="font-medium">{t("nav.addTournament")}</span>
            </a>
          </nav>
        </div>

        {/* Close Button Inside Sidebar */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label={t("nav.closeSidebar")}
          style={{
            opacity: mounted ? undefined : "var(--sidebar-initial-opacity, 0)",
          }}
          className={cn(
            "absolute top-20 -right-10 h-10 w-10 rounded-full bg-sidebar border border-sidebar-border shadow-lg hover:bg-sidebar-accent transition-all duration-300",
            mounted && (isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"),
            !mounted && "pointer-events-none"
          )}
        >
          <ChevronLeft className="h-5 w-5 text-sidebar-foreground" />
        </Button>
      </aside>

      {/* Toggle Button (visible when sidebar is closed) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        aria-label={t("nav.openSidebar")}
        style={{
          opacity: mounted ? undefined : "calc(1 - var(--sidebar-initial-opacity, 0))",
        }}
        className={cn(
          "fixed top-20 left-4 h-10 w-10 rounded-full bg-sidebar border border-sidebar-border shadow-lg hover:bg-sidebar-accent transition-all duration-300 z-40",
          mounted && (isExpanded ? "opacity-0 pointer-events-none" : "opacity-100"),
          !mounted && "pointer-events-none"
        )}
      >
        <ChevronRight className="h-5 w-5 text-sidebar-foreground" />
      </Button>

      {/* Overlay for mobile (click to close) */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}
    </>
  );
}
