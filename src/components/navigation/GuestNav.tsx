import { Target } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTranslation } from "@/lib/hooks/I18nProvider";
import { LanguageSwitcherCompact } from "@/components/ui/language-switcher";

export default function GuestNav() {
  const t = useTranslation();

  return (
    <header className="border-b bg-background transition-colors duration-200">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* App Logo/Name */}
          <a href="/" className="flex items-center gap-2 group">
            <Target className="h-6 w-6 text-purple-400 group-hover:text-blue-400 transition-colors duration-300" />
            <h1 className="hidden md:block font-mono text-lg md:text-xl font-semibold bg-gradient-to-r from-teal-400 to-purple-400 bg-clip-text text-transparent group-hover:from-blue-400 group-hover:to-teal-400 transition-colors duration-300">
              {t("common.appName")}
            </h1>
          </a>

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
}
