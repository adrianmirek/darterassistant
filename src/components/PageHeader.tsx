/**
 * Client-side Page Header Component
 * Displays page title and subtitle with i18n support
 */

import { useState, useEffect } from "react";
import { I18nProvider, useTranslation } from "@/lib/hooks/I18nProvider";
import { type Language, defaultLanguage } from "@/lib/i18n";

interface PageHeaderProps {
  titleKey: string;
  subtitleKey: string;
}

function PageHeaderContent({ titleKey, subtitleKey }: { titleKey: string; subtitleKey: string }) {
  const t = useTranslation();

  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight mb-2">{t(titleKey)}</h1>
      <p className="text-muted-foreground">{t(subtitleKey)}</p>
    </div>
  );
}

export default function PageHeader({ titleKey, subtitleKey }: PageHeaderProps) {
  const [lang, setLang] = useState<Language>(defaultLanguage);

  useEffect(() => {
    // Get language from localStorage or window global
    const storedLang = localStorage.getItem("darter-language") as Language;
    const windowLang =
      (typeof window !== "undefined" && (window as { __DARTER_LANG__?: Language }).__DARTER_LANG__) || undefined;
    const currentLang = storedLang || windowLang || defaultLanguage;
    setLang(currentLang);
  }, []);

  return (
    <I18nProvider lang={lang}>
      <PageHeaderContent titleKey={titleKey} subtitleKey={subtitleKey} />
    </I18nProvider>
  );
}
