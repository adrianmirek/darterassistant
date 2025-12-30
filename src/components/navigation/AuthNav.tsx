import { Button } from "@/components/ui/button";
import { LogOut, Target } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ThemeProvider } from "@/lib/hooks/ThemeProvider";
import { I18nProvider } from "@/lib/hooks/I18nProvider";
import { LanguageSwitcherCompact } from "@/components/ui/language-switcher";
import { useTranslation } from "@/lib/hooks/I18nProvider";
import type { Language } from "@/lib/i18n";

interface AuthNavProps {
  userEmail: string;
  lang: Language;
}

function AuthNavContent({ userEmail }: { userEmail: string }) {
  const t = useTranslation();
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin", // Ensure cookies are sent
      });

      // Always redirect after logout attempt, regardless of response
      // Use replace to prevent back button from returning to authenticated page
      window.location.replace("/auth/login");
    } catch {
      // Redirect anyway to ensure user is logged out
      window.location.replace("/auth/login");
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 border-b bg-background transition-colors duration-200 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* App Logo/Name */}
          <div className="flex items-center gap-2 group">
            <Target className="h-6 w-6 text-blue-400 group-hover:text-purple-400 transition-colors duration-300" />
            <h1 className="hidden md:block font-mono text-lg md:text-xl font-semibold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent group-hover:from-teal-400 group-hover:to-purple-400 transition-colors duration-300">
              {t("common.appName")}
            </h1>
          </div>

          {/* User Info, Language Switcher, Theme Toggle, and Logout */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground min-w-[150px]">
              <span className="font-medium text-foreground truncate">{userEmail}</span>
            </div>

            <div className="flex-shrink-0">
              <LanguageSwitcherCompact />
            </div>

            <div className="flex-shrink-0">
              <ThemeToggle />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex-shrink-0 md:w-[110px] md:justify-start"
            >
              <LogOut className="h-4 w-4 md:mr-2 flex-shrink-0" />
              <span className="hidden md:inline md:flex-1 md:text-center">{t("nav.logout")}</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function AuthNav({ userEmail, lang }: AuthNavProps) {
  return (
    <I18nProvider lang={lang}>
      <ThemeProvider>
        <AuthNavContent userEmail={userEmail} />
      </ThemeProvider>
    </I18nProvider>
  );
}
