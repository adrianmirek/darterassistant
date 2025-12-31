import { describe, it, expect } from "vitest";
import { languages, defaultLanguage, getSupportedLanguage, detectLanguageFromHeader, type Language } from "./config";

describe("i18n config", () => {
  describe("languages", () => {
    it("should have English language", () => {
      expect(languages.en).toBe("English");
    });

    it("should have Polish language", () => {
      expect(languages.pl).toBe("Polski");
    });
  });

  describe("defaultLanguage", () => {
    it("should be English", () => {
      expect(defaultLanguage).toBe("en");
    });
  });

  describe("getSupportedLanguage", () => {
    it("should return 'en' for English language codes", () => {
      expect(getSupportedLanguage("en")).toBe("en");
      expect(getSupportedLanguage("EN")).toBe("en");
      expect(getSupportedLanguage("en-US")).toBe("en");
      expect(getSupportedLanguage("en-GB")).toBe("en");
    });

    it("should return 'pl' for Polish language codes", () => {
      expect(getSupportedLanguage("pl")).toBe("pl");
      expect(getSupportedLanguage("PL")).toBe("pl");
      expect(getSupportedLanguage("pl-PL")).toBe("pl");
    });

    it("should return default language for unsupported codes", () => {
      expect(getSupportedLanguage("fr")).toBe(defaultLanguage);
      expect(getSupportedLanguage("de")).toBe(defaultLanguage);
      expect(getSupportedLanguage("es")).toBe(defaultLanguage);
      expect(getSupportedLanguage("it-IT")).toBe(defaultLanguage);
    });

    it("should handle case insensitivity", () => {
      expect(getSupportedLanguage("EN-US")).toBe("en");
      expect(getSupportedLanguage("PL-pl")).toBe("pl");
    });

    it("should handle language codes with regions", () => {
      expect(getSupportedLanguage("en-US")).toBe("en");
      expect(getSupportedLanguage("en-GB")).toBe("en");
      expect(getSupportedLanguage("pl-PL")).toBe("pl");
    });
  });

  describe("detectLanguageFromHeader", () => {
    it("should return default language when header is undefined", () => {
      expect(detectLanguageFromHeader(undefined)).toBe(defaultLanguage);
    });

    it("should return default language when header is null", () => {
      expect(detectLanguageFromHeader(null)).toBe(defaultLanguage);
    });

    it("should return default language when header is empty", () => {
      expect(detectLanguageFromHeader("")).toBe(defaultLanguage);
    });

    it("should detect single language from header", () => {
      expect(detectLanguageFromHeader("en-US")).toBe("en");
      expect(detectLanguageFromHeader("pl-PL")).toBe("pl");
    });

    it("should detect language from simple header", () => {
      expect(detectLanguageFromHeader("en")).toBe("en");
      expect(detectLanguageFromHeader("pl")).toBe("pl");
    });

    it("should prioritize language by quality value", () => {
      expect(detectLanguageFromHeader("fr;q=0.9,en-US;q=0.8,pl;q=1.0")).toBe("pl");
      expect(detectLanguageFromHeader("pl;q=0.7,en-US;q=0.9")).toBe("en");
    });

    it("should handle complex Accept-Language header", () => {
      expect(detectLanguageFromHeader("pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7")).toBe("pl");
    });

    it("should handle header without quality values", () => {
      expect(detectLanguageFromHeader("en-US,en,pl")).toBe("en");
    });

    it("should handle mixed quality and no-quality values", () => {
      expect(detectLanguageFromHeader("fr;q=0.5,pl,en;q=0.8")).toBe("pl");
    });

    it("should return default language for unsupported languages", () => {
      expect(detectLanguageFromHeader("fr-FR,fr;q=0.9")).toBe(defaultLanguage);
      expect(detectLanguageFromHeader("de-DE")).toBe(defaultLanguage);
    });

    it("should handle whitespace in header", () => {
      expect(detectLanguageFromHeader(" en-US , pl ; q=0.9 ")).toBe("en");
    });

    it("should prioritize supported language over unsupported with higher quality", () => {
      expect(detectLanguageFromHeader("fr;q=1.0,pl;q=0.8")).toBe("pl");
    });

    it("should handle edge case with only default language in header", () => {
      expect(detectLanguageFromHeader("en")).toBe("en");
      expect(detectLanguageFromHeader("en-US")).toBe("en");
    });

    it("should sort by quality correctly", () => {
      expect(detectLanguageFromHeader("en;q=0.5,pl;q=0.9,fr;q=0.1")).toBe("pl");
    });

    it("should handle implicit quality of 1.0", () => {
      expect(detectLanguageFromHeader("pl,en;q=0.9")).toBe("pl");
      expect(detectLanguageFromHeader("en,pl;q=0.9")).toBe("en");
    });
  });

  describe("Language type", () => {
    it("should allow 'en' and 'pl' as Language type", () => {
      const lang1: Language = "en";
      const lang2: Language = "pl";

      expect(lang1).toBe("en");
      expect(lang2).toBe("pl");
    });
  });
});
