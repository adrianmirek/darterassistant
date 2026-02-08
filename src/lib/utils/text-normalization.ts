/**
 * Text normalization utilities for accent-insensitive search
 * Primarily for handling Polish diacritics
 */

/**
 * Normalizes Polish text by removing diacritics and converting to lowercase
 * This allows "Bułkowski" and "Bulkowski" to match
 *
 * @param text - Text to normalize
 * @returns Normalized text with diacritics removed and lowercased
 *
 * @example
 * normalizePolishText("Bułkowski") // "bulkowski"
 * normalizePolishText("Michał Żak") // "michal zak"
 */
export function normalizePolishText(text: string): string {
  if (!text) return "";

  return (
    text
      .toLowerCase()
      // Replace Polish characters (both cases handled via toLowerCase above, but being explicit)
      .replace(/[ąĄ]/g, "a")
      .replace(/[ćĆ]/g, "c")
      .replace(/[ęĘ]/g, "e")
      .replace(/[łŁ]/g, "l")
      .replace(/[ńŃ]/g, "n")
      .replace(/[óÓ]/g, "o")
      .replace(/[śŚ]/g, "s")
      .replace(/[źŹ]/g, "z")
      .replace(/[żŻ]/g, "z")
  );
}

/**
 * Checks if a text contains a search term (case and accent insensitive)
 *
 * @param text - Text to search in
 * @param searchTerm - Term to search for
 * @returns True if text contains search term (normalized)
 *
 * @example
 * containsNormalized("Bułkowski", "bulkowski") // true
 * containsNormalized("Bułkowski", "Bulkowski") // true
 */
export function containsNormalized(text: string, searchTerm: string): boolean {
  return normalizePolishText(text).includes(normalizePolishText(searchTerm));
}

/**
 * Cleans player name by removing unwanted characters:
 * - Checkmark symbols (🗸, ✓, ✔)
 * - Parentheses with numbers like (7), (6)
 * - Other common unwanted characters
 *
 * @param name - Player name to clean
 * @returns Cleaned player name
 *
 * @example
 * cleanPlayerName("Damian Reniec 🗸") // "Damian Reniec"
 * cleanPlayerName("Piątkowski Jakub (7)") // "Piątkowski Jakub"
 * cleanPlayerName("Obroszko Mateusz (6)") // "Obroszko Mateusz"
 */
export function cleanPlayerName(name: string): string {
  if (!name) return "";

  return (
    name
      // Remove checkmark symbols (u flag for proper Unicode handling)
      .replace(/[🗸✓✔]/gu, "")
      // Remove parentheses with numbers: (7), (6), etc.
      .replace(/\s*\(\d+\)/g, "")
      // Remove any remaining trailing/leading whitespace
      .trim()
  );
}
