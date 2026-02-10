import { useState, useEffect } from "react";
import { I18nProvider } from "@/lib/hooks/I18nProvider";
import { ThemeProvider } from "@/lib/hooks/ThemeProvider";
import { GuestNav } from "@/components/navigation/GuestNav";
import { GuestSetupPage } from "./GuestSetupPage";
import { GuestHomepage } from "./GuestHomepage";
import { GuestScoreBoard } from "./GuestScoreBoard";
import { Trophy, Target } from "lucide-react";
import type { Language } from "@/lib/i18n";

declare global {
  interface Window {
    __DARTER_LANG__?: Language;
  }
}

type GuestView = "home" | "setup" | "scoring";

export function GuestPage() {
  const [lang, setLang] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);
  const [currentView, setCurrentView] = useState<GuestView>("home");

  useEffect(() => {
    // Get language from global scope (set by Layout.astro)
    const storedLang = window.__DARTER_LANG__ || "en";
    setLang(storedLang as Language);
    setMounted(true);
  }, []);

  // Handle initial URL routing on mount
  useEffect(() => {
    if (!mounted) return;

    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view") as GuestView | null;

    // Handle /score URL (redirect from separate page)
    if (path === "/score" || viewParam === "scoring") {
      setCurrentView("scoring");
      // Clean up URL
      window.history.replaceState({ view: "scoring" }, "", "/");
    } else if (viewParam === "setup") {
      setCurrentView("setup");
      window.history.replaceState({ view: "setup" }, "", "/");
    } else {
      setCurrentView("home");
      window.history.replaceState({ view: "home" }, "", "/");
    }
  }, [mounted]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.view) {
        setCurrentView(e.state.view as GuestView);
      } else {
        // No state means user navigated to root
        setCurrentView("home");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Navigate between views with browser history support
  const navigateToView = (view: GuestView) => {
    setCurrentView(view);
    
    // Update browser history
    const url = view === "home" ? "/" : `/?view=${view}`;
    window.history.pushState({ view }, "", url);
  };

  // Handle match start
  const handleMatchStart = () => {
    navigateToView("scoring");
  };

  // Handle exit from scoring
  const handleExitScoring = () => {
    navigateToView("setup");
  };

  // Don't render anything during SSR
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <ThemeProvider>
      <I18nProvider lang={lang}>
        <div className="min-h-screen flex flex-col">
          {/* Hide navigation when in scoring view */}
          {currentView !== "scoring" && (
            <GuestNav currentView={currentView} onViewChange={navigateToView} />
          )}
          
          <main className={`flex-1 ${currentView !== "scoring" ? "pb-20 md:pb-0" : ""}`}>
            {currentView === "home" && <GuestHomepage />}
            {currentView === "setup" && <GuestSetupPage onMatchStart={handleMatchStart} />}
            {currentView === "scoring" && <GuestScoreBoard onExit={handleExitScoring} />}
          </main>

          {/* Mobile Bottom Navigation - hide during scoring */}
          {currentView !== "scoring" && (
            <nav className="fixed bottom-0 left-0 right-0 bg-card border-t md:hidden z-50">
              <div className="container mx-auto px-4">
                <div className="grid grid-cols-2 gap-2 py-3">
                  <button
                    onClick={() => navigateToView("home")}
                    className={`flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-lg transition-colors ${
                      currentView === "home"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <Trophy className="h-5 w-5" />
                    <span className="text-xs font-medium">Tournaments</span>
                  </button>
                  <button
                    onClick={() => navigateToView("setup")}
                    className={`flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-lg transition-colors ${
                      currentView === "setup"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <Target className="h-5 w-5" />
                    <span className="text-xs font-medium">Play Match</span>
                  </button>
                </div>
              </div>
            </nav>
          )}
        </div>
      </I18nProvider>
    </ThemeProvider>
  );
}
