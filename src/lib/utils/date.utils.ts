/**
 * Utility functions for date validation and parsing
 */

/**
 * Validate ISO date format (YYYY-MM-DD)
 */
export function isValidISODate(dateString: string): boolean {
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDateRegex.test(dateString)) {
    return false;
  }

  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toISOString().startsWith(dateString);
}

/**
 * Check if endDate is greater than or equal to startDate
 */
export function isValidDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return end >= start;
}

/**
 * Parse ISO date string to Date object
 */
export function parseISODate(dateString: string): Date {
  return new Date(dateString);
}
