/**
 * I18n Context Provider for React components
 * Provides translation functions and language state to all child components
 */

import React, { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from "react";
import { getTranslations, type Language, type TranslationKeys } from "@/lib/i18n";
import { createTranslator } from "@/lib/i18n";

interface I18nContextType {
  lang: Language;
  t: (key: string, params?: Record<string, string | number>) => string;
  translations: TranslationKeys;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  lang: Language;
  children: ReactNode;
}

export function I18nProvider({ lang: initialLang, children }: I18nProviderProps) {
  const [lang, setLang] = useState<Language>(initialLang);

  useEffect(() => {
    // Check localStorage for user preference on mount
    const storedLang = localStorage.getItem("darter-language") as Language;
    if (storedLang && (storedLang === "en" || storedLang === "pl")) {
      setLang(storedLang);
    }
  }, []);

  const value = useMemo(
    () => ({
      lang,
      t: createTranslator(lang),
      translations: getTranslations(lang),
    }),
    [lang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Hook to access i18n context
 * @returns I18n context with translation functions
 * @throws Error if used outside of I18nProvider
 */
export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);

  if (context === undefined) {
    throw new Error("useI18n must be used within an I18nProvider");
  }

  return context;
}

/**
 * Hook to get translation function
 * @returns Translation function
 */
export function useTranslation() {
  const { t } = useI18n();
  return t;
}

/**
 * Hook to get current language
 * @returns Current language code
 */
export function useLanguage() {
  const { lang } = useI18n();
  return lang;
}
