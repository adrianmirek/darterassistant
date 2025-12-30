/**
 * i18n utilities
 * Provides translation functions and language management
 */

import { en } from "./translations/en";
import { pl } from "./translations/pl";
import type { Language } from "./config";
import { defaultLanguage } from "./config";

const translations = {
  en,
  pl,
} as const;

/**
 * Get translation object for a specific language
 * @param lang - Language code
 * @returns Translation object
 */
export function getTranslations(lang: Language = defaultLanguage) {
  return translations[lang] || translations[defaultLanguage];
}

/**
 * Get nested translation value using dot notation
 * @param obj - Translation object
 * @param path - Dot-notation path (e.g., 'auth.loginTitle')
 * @returns Translation string or undefined
 */
function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  return path.split(".").reduce((current: unknown, key: string): unknown => {
    return current && typeof current === "object" && key in current
      ? (current as Record<string, unknown>)[key]
      : undefined;
  }, obj) as string | undefined;
}

/**
 * Translate a key with optional interpolation
 * @param lang - Language code
 * @param key - Translation key in dot notation (e.g., 'auth.loginTitle')
 * @param params - Optional parameters for interpolation
 * @returns Translated string
 */
export function t(lang: Language, key: string, params?: Record<string, string | number>): string {
  const translations = getTranslations(lang);
  let translation = getNestedValue(translations as Record<string, unknown>, key);

  if (!translation) {
    // Development warning for missing translations
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn(`Translation key not found: ${key}`);
    }
    return key;
  }

  // Interpolate parameters if provided
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      if (translation) {
        translation = translation.replace(`{${paramKey}}`, String(value));
      }
    });
  }

  return translation;
}

/**
 * Create a translation function bound to a specific language
 * @param lang - Language code
 * @returns Translation function
 */
export function createTranslator(lang: Language) {
  return (key: string, params?: Record<string, string | number>) => t(lang, key, params);
}

// Export types and utilities
export type { Language } from "./config";
export type { TranslationKeys } from "./translations/en";
export { languages, defaultLanguage, getSupportedLanguage, detectLanguageFromHeader } from "./config";
export { en, pl };
