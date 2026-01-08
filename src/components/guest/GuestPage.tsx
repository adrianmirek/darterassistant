import { useState, useEffect } from "react";
import { I18nProvider } from "@/lib/hooks/I18nProvider";
import { ThemeProvider } from "@/lib/hooks/ThemeProvider";
import GuestNav from "@/components/navigation/GuestNav";
import { GuestHomepage } from "./GuestHomepage";
import type { Language } from "@/lib/i18n";

declare global {
  interface Window {
    __DARTER_LANG__?: Language;
  }
}

export function GuestPage() {
  const [lang, setLang] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

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
          <GuestNav />
          <main className="flex-1">
            <GuestHomepage />
          </main>
        </div>
      </I18nProvider>
    </ThemeProvider>
  );
}
