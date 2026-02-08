import { describe, it, expect } from "vitest";
import { normalizePolishText, containsNormalized, cleanPlayerName } from "./text-normalization";

describe("text-normalization", () => {
  describe("normalizePolishText", () => {
    it("should remove Polish diacritics and convert to lowercase", () => {
      expect(normalizePolishText("Bułkowski")).toBe("bulkowski");
      expect(normalizePolishText("Michał")).toBe("michal");
      expect(normalizePolishText("Łukasz")).toBe("lukasz");
      expect(normalizePolishText("Żak")).toBe("zak");
      expect(normalizePolishText("Ćwik")).toBe("cwik");
    });

    it("should handle all Polish diacritics", () => {
      expect(normalizePolishText("ąćęłńóśźż")).toBe("acelnoszz");
      expect(normalizePolishText("ĄĆĘŁŃÓŚŹŻ")).toBe("acelnoszz");
    });

    it("should handle mixed text with Polish and regular characters", () => {
      expect(normalizePolishText("Jan Kowalski")).toBe("jan kowalski");
      expect(normalizePolishText("Michał Żółtkowski")).toBe("michal zoltkowski");
    });

    it("should handle empty string", () => {
      expect(normalizePolishText("")).toBe("");
    });

    it("should preserve spaces and special characters", () => {
      expect(normalizePolishText("Michał Żak-Kowalski")).toBe("michal zak-kowalski");
      expect(normalizePolishText("Test 123")).toBe("test 123");
    });
  });

  describe("containsNormalized", () => {
    it("should match text with and without Polish diacritics", () => {
      expect(containsNormalized("Bułkowski", "bulkowski")).toBe(true);
      expect(containsNormalized("Bułkowski", "Bulkowski")).toBe(true);
      expect(containsNormalized("Jan Bułkowski", "bulkowski")).toBe(true);
      expect(containsNormalized("Jan Bulkowski", "bułkowski")).toBe(true);
    });

    it("should be case insensitive", () => {
      expect(containsNormalized("Michał", "MICHAŁ")).toBe(true);
      expect(containsNormalized("MICHAŁ", "michał")).toBe(true);
      expect(containsNormalized("MiChAł", "mIcHaŁ")).toBe(true);
    });

    it("should handle partial matches", () => {
      expect(containsNormalized("Jan Kowalski", "Kowal")).toBe(true);
      expect(containsNormalized("Michał Żółtkowski", "żółt")).toBe(true);
      expect(containsNormalized("Michał Żółtkowski", "zolt")).toBe(true);
    });

    it("should return false for non-matching text", () => {
      expect(containsNormalized("Bułkowski", "Nowak")).toBe(false);
      expect(containsNormalized("Jan", "Adam")).toBe(false);
    });

    it("should handle empty strings", () => {
      expect(containsNormalized("", "test")).toBe(false);
      expect(containsNormalized("test", "")).toBe(true); // Empty search matches everything
    });
  });

  describe("Real-world tournament scenarios", () => {
    it("should match player names regardless of diacritic usage", () => {
      // User searches with diacritics
      expect(containsNormalized("Jan Bułkowski", "Bułkowski")).toBe(true);

      // User searches without diacritics
      expect(containsNormalized("Jan Bułkowski", "Bulkowski")).toBe(true);

      // Database has no diacritics, user searches with
      expect(containsNormalized("Jan Bulkowski", "Bułkowski")).toBe(true);
    });

    it("should handle complex Polish names", () => {
      const playerName = "Michał Żółtkowski-Ćwik";

      expect(containsNormalized(playerName, "Michał")).toBe(true);
      expect(containsNormalized(playerName, "Michal")).toBe(true);
      expect(containsNormalized(playerName, "Żółtkowski")).toBe(true);
      expect(containsNormalized(playerName, "Zoltkowski")).toBe(true);
      expect(containsNormalized(playerName, "Ćwik")).toBe(true);
      expect(containsNormalized(playerName, "Cwik")).toBe(true);
    });
  });

  describe("cleanPlayerName", () => {
    it("should remove checkmark symbols", () => {
      expect(cleanPlayerName("Damian Reniec 🗸")).toBe("Damian Reniec");
      expect(cleanPlayerName("Jan Kowalski ✓")).toBe("Jan Kowalski");
      expect(cleanPlayerName("Michał Nowak ✔")).toBe("Michał Nowak");
    });

    it("should remove parentheses with numbers", () => {
      expect(cleanPlayerName("Piątkowski Jakub (7)")).toBe("Piątkowski Jakub");
      expect(cleanPlayerName("Obroszko Mateusz (6)")).toBe("Obroszko Mateusz");
      expect(cleanPlayerName("Jan Kowalski (12)")).toBe("Jan Kowalski");
      expect(cleanPlayerName("Test Player (1)")).toBe("Test Player");
    });

    it("should handle multiple unwanted characters", () => {
      expect(cleanPlayerName("Damian Reniec 🗸 (7)")).toBe("Damian Reniec");
      expect(cleanPlayerName("Jan Kowalski ✓ (12) 🗸")).toBe("Jan Kowalski");
    });

    it("should handle names without unwanted characters", () => {
      expect(cleanPlayerName("Jan Kowalski")).toBe("Jan Kowalski");
      expect(cleanPlayerName("Michał Żółtkowski")).toBe("Michał Żółtkowski");
    });

    it("should handle empty string", () => {
      expect(cleanPlayerName("")).toBe("");
    });

    it("should trim extra whitespace", () => {
      expect(cleanPlayerName("  Jan Kowalski  ")).toBe("Jan Kowalski");
      expect(cleanPlayerName("Jan Kowalski   (7)  ")).toBe("Jan Kowalski");
    });

    it("should handle real-world tournament examples", () => {
      expect(cleanPlayerName("Damian Reniec 🗸")).toBe("Damian Reniec");
      expect(cleanPlayerName("Piątkowski Jakub (7)")).toBe("Piątkowski Jakub");
      expect(cleanPlayerName("Obroszko Mateusz (6)")).toBe("Obroszko Mateusz");
    });
  });
});
