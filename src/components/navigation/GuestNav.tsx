/* eslint-disable react/prop-types */
import { Target, Trophy } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTranslation } from "@/lib/hooks/I18nProvider";
import { LanguageSwitcherCompact } from "@/components/ui/language-switcher";

export type GuestView = "home" | "setup";

export interface GuestNavProps {
  currentView?: GuestView;
  onViewChange?: Dispatch<SetStateAction<GuestView>> | ((view: GuestView) => void);
}

export const GuestNav: React.FC<GuestNavProps> = ({ currentView, onViewChange }) => {
  const t = useTranslation();

  return (
    <header className="border-b bg-background transition-colors duration-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* App Logo/Name */}
          <div className="flex items-center gap-6">
            <a href="/" className="flex items-center gap-2 group">
              <Target className="h-6 w-6 text-purple-600 dark:text-purple-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300" />
              <h1 className="hidden md:block font-mono text-lg md:text-xl font-semibold bg-gradient-to-r from-purple-600 via-violet-600 to-blue-600 dark:from-teal-400 dark:to-purple-400 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:via-purple-600 group-hover:to-violet-600 dark:group-hover:from-blue-400 dark:group-hover:to-teal-400 transition-colors duration-300">
                {t("common.appName")}
              </h1>
            </a>

            {/* Desktop Navigation Menu */}
            {onViewChange && (
              <nav className="hidden md:flex items-center gap-1">
                <button
                  onClick={() => {
                    if (typeof onViewChange === "function") {
                      onViewChange("home");
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentView === "home"
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/90 hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Trophy className="h-4 w-4" />
                  <span className="text-sm font-medium">Tournaments</span>
                </button>
                <button
                  onClick={() => {
                    if (typeof onViewChange === "function") {
                      onViewChange("setup");
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    currentView === "setup"
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Target className="h-4 w-4" />
                  <span className="text-sm font-medium">Play Match</span>
                </button>
              </nav>
            )}
          </div>

          {/* Language Switcher and Theme Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <LanguageSwitcherCompact />
            </div>

            <div className="flex-shrink-0">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default GuestNav;
