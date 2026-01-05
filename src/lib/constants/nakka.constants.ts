/**
 * Nakka 01 Platform Constants
 * Configuration for scraping and interacting with n01darts.com
 */

export const NAKKA_BASE_URL = "https://n01darts.com/n01/tournament";
export const NAKKA_REQUEST_TIMEOUT_MS = 15000;
export const NAKKA_USER_AGENT = "Mozilla/5.0 (compatible; DarterAssistant/1.0)";

export const NAKKA_STATUS_CODES = {
  COMPLETED: "40",
  PREPARING: "10",
  ONGOING: "20",
} as const;
