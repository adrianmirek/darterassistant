/**
 * i18n Configuration
 * Defines supported languages and default language for the application
 */

export const languages = {
  en: "English",
  pl: "Polski",
} as const;

export type Language = keyof typeof languages;

export const defaultLanguage: Language = "en";

/**
 * Get the supported language from browser language code
 * @param browserLang - Browser language code (e.g., 'en-US', 'pl-PL', 'pl')
 * @returns Supported language code or default language
 */
export function getSupportedLanguage(browserLang: string): Language {
  // Extract the language code (e.g., 'en' from 'en-US')
  const langCode = browserLang.toLowerCase().split("-")[0];

  // Check if the language is supported
  if (langCode in languages) {
    return langCode as Language;
  }

  // Return default language if not supported
  return defaultLanguage;
}

/**
 * Detect language from browser Accept-Language header
 * @param acceptLanguageHeader - Accept-Language header value
 * @returns Detected language or default language
 */
export function detectLanguageFromHeader(acceptLanguageHeader?: string | null): Language {
  if (!acceptLanguageHeader) {
    return defaultLanguage;
  }

  // Parse Accept-Language header (e.g., "pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7")
  const languages = acceptLanguageHeader
    .split(",")
    .map((lang) => {
      const [code, qValue] = lang.trim().split(";");
      const quality = qValue ? parseFloat(qValue.split("=")[1]) : 1.0;
      return { code: code.trim(), quality };
    })
    .sort((a, b) => b.quality - a.quality);

  // Find the first supported language
  for (const { code } of languages) {
    const supportedLang = getSupportedLanguage(code);
    if (supportedLang !== defaultLanguage || code.startsWith(defaultLanguage)) {
      return supportedLang;
    }
  }

  return defaultLanguage;
}
