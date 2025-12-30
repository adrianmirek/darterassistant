/**
 * Language Switcher Component
 * Allows users to manually switch between supported languages
 */

import { useState, useEffect } from "react";
import { type Language } from "@/lib/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PolishFlag } from "./flags/PolishFlag";
import { UKFlag } from "./flags/UKFlag";

// Language configuration with flag components
const languageConfig = {
  en: {
    name: "English",
    FlagComponent: UKFlag,
    code: "EN",
  },
  pl: {
    name: "Polski",
    FlagComponent: PolishFlag,
    code: "PL",
  },
} as const;

interface LanguageSwitcherProps {
  currentLang?: Language;
  onLanguageChange?: (lang: Language) => void;
}

export function LanguageSwitcher({ currentLang, onLanguageChange }: LanguageSwitcherProps) {
  const [lang, setLang] = useState<Language>("en");

  useEffect(() => {
    // Get language from localStorage or use currentLang prop
    const storedLang = (localStorage.getItem("darter-language") as Language) || currentLang || "en";
    setLang(storedLang);
  }, [currentLang]);

  const handleLanguageChange = (value: string) => {
    const newLang = value as Language;
    setLang(newLang);

    // Store the preference in localStorage
    localStorage.setItem("darter-language", newLang);

    // Call the callback if provided
    if (onLanguageChange) {
      onLanguageChange(newLang);
    } else {
      // Reload the page to apply the new language
      window.location.reload();
    }
  };

  const CurrentFlag = languageConfig[lang].FlagComponent;

  return (
    <div className="flex items-center gap-2">
      <Select value={lang} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue>
            <span className="flex items-center gap-2">
              <CurrentFlag className="w-6 h-4" />
              <span>{languageConfig[lang].name}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(languageConfig).map(([code, config]) => {
            const FlagComponent = config.FlagComponent;
            return (
              <SelectItem key={code} value={code}>
                <span className="flex items-center gap-2">
                  <FlagComponent className="w-6 h-4" />
                  <span>{config.name}</span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Compact Language Switcher Button
 * A more compact version with flag and language code
 */
export function LanguageSwitcherCompact({ currentLang, onLanguageChange }: LanguageSwitcherProps) {
  const [lang, setLang] = useState<Language>("en");

  useEffect(() => {
    // Get language from localStorage or use currentLang prop
    const storedLang = (localStorage.getItem("darter-language") as Language) || currentLang || "en";
    setLang(storedLang);
  }, [currentLang]);

  const handleLanguageChange = (value: string) => {
    const newLang = value as Language;
    setLang(newLang);

    localStorage.setItem("darter-language", newLang);

    if (onLanguageChange) {
      onLanguageChange(newLang);
    } else {
      window.location.reload();
    }
  };

  const CurrentFlag = languageConfig[lang].FlagComponent;

  return (
    <Select value={lang} onValueChange={handleLanguageChange}>
      <SelectTrigger
        className="min-w-[56px] w-[56px] h-[40px] border-none hover:bg-accent focus:ring-0 focus:ring-offset-0 p-0"
        aria-label="Select language"
      >
        <div className="flex items-center justify-center w-full h-full px-2">
          <CurrentFlag className="w-10 h-7 rounded shadow-sm flex-shrink-0" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(languageConfig).map(([code, config]) => {
          const FlagComponent = config.FlagComponent;
          return (
            <SelectItem key={code} value={code}>
              <span className="flex items-center gap-2">
                <FlagComponent className="w-8 h-6 rounded shadow-sm" />
                <span>{config.name}</span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
