import { useState, useEffect } from "react";
import { I18nProvider } from "@/lib/hooks/I18nProvider";
import { ThemeProvider } from "@/lib/hooks/ThemeProvider";
import { GuestNav } from "@/components/navigation/GuestNav";
import { GuestSetupPage } from "./GuestSetupPage";
import { GuestHomepage } from "./GuestHomepage";
import { Trophy, Target } from "lucide-react";
import type { Language } from "@/lib/i18n";

declare global {
  interface Window {
    __DARTER_LANG__?: Language;
  }
}

type GuestView = "home" | "setup";

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
          <GuestNav currentView={currentView} onViewChange={setCurrentView} />
          <main className="flex-1 pb-20 md:pb-0">
            {currentView === "home" ? <GuestHomepage /> : <GuestSetupPage />}
          </main>

          {/* Mobile Bottom Navigation */}
          <nav className="fixed bottom-0 left-0 right-0 bg-card border-t md:hidden z-50">
            <div className="container mx-auto px-4">
              <div className="grid grid-cols-2 gap-2 py-3">
                <button
                  onClick={() => setCurrentView("home")}
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
                  onClick={() => setCurrentView("setup")}
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
        </div>
      </I18nProvider>
    </ThemeProvider>
  );
}
