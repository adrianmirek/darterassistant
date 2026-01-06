import { useState, useEffect } from "react";
import { I18nProvider } from "@/lib/hooks/I18nProvider";
import { ThemeProvider } from "@/lib/hooks/ThemeProvider";
import GuestNav from "./GuestNav";
import type { Language } from "@/lib/i18n";

interface GuestNavWrapperProps {
  lang?: Language;
}

export default function GuestNavWrapper({ lang: initialLang }: GuestNavWrapperProps) {
  const [lang, setLang] = useState<Language>(initialLang || "en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Get language from global scope (set by Layout.astro) or use initial lang
    const storedLang = (window as any).__DARTER_LANG__ || initialLang || "en";
    setLang(storedLang as Language);
    setMounted(true);
  }, [initialLang]);

  // Show a minimal placeholder during SSR/mounting
  if (!mounted) {
    return (
      <header className="border-b bg-background transition-colors duration-200">
        <div className="container mx-auto px-4 py-4">
          <div className="h-10" />
        </div>
      </header>
    );
  }

  return (
    <ThemeProvider>
      <I18nProvider lang={lang}>
        <GuestNav />
      </I18nProvider>
    </ThemeProvider>
  );
}

