import { describe, it, expect } from "vitest";
import { isValidISODate, isValidDateRange, parseISODate } from "./date.utils";

describe("Date Utilities", () => {
  describe("isValidISODate", () => {
    it("should validate correct ISO date format", () => {
      expect(isValidISODate("2024-01-15")).toBe(true);
      expect(isValidISODate("2024-12-31")).toBe(true);
      expect(isValidISODate("2023-06-01")).toBe(true);
    });

    it("should reject invalid date formats", () => {
      expect(isValidISODate("2024/01/15")).toBe(false);
      expect(isValidISODate("15-01-2024")).toBe(false);
      expect(isValidISODate("2024-1-5")).toBe(false);
      expect(isValidISODate("2024-01-5")).toBe(false);
    });

    it("should reject invalid dates", () => {
      expect(isValidISODate("2024-02-30")).toBe(false);
      expect(isValidISODate("2024-13-01")).toBe(false);
      expect(isValidISODate("2024-00-01")).toBe(false);
    });

    it("should reject non-date strings", () => {
      expect(isValidISODate("not a date")).toBe(false);
      expect(isValidISODate("")).toBe(false);
      expect(isValidISODate("2024")).toBe(false);
    });

    it("should handle leap years correctly", () => {
      expect(isValidISODate("2024-02-29")).toBe(true);
      expect(isValidISODate("2023-02-29")).toBe(false);
    });
  });

  describe("isValidDateRange", () => {
    it("should validate correct date ranges", () => {
      expect(isValidDateRange("2024-01-01", "2024-12-31")).toBe(true);
      expect(isValidDateRange("2024-06-01", "2024-06-30")).toBe(true);
    });

    it("should accept same start and end date", () => {
      expect(isValidDateRange("2024-01-15", "2024-01-15")).toBe(true);
    });

    it("should reject end date before start date", () => {
      expect(isValidDateRange("2024-12-31", "2024-01-01")).toBe(false);
      expect(isValidDateRange("2024-06-30", "2024-06-01")).toBe(false);
    });

    it("should handle year boundaries", () => {
      expect(isValidDateRange("2023-12-31", "2024-01-01")).toBe(true);
      expect(isValidDateRange("2024-01-01", "2023-12-31")).toBe(false);
    });
  });

  describe("parseISODate", () => {
    it("should parse valid ISO date strings", () => {
      const date = parseISODate("2024-01-15");
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2024);
      expect(date.getMonth()).toBe(0); // January is 0
      expect(date.getDate()).toBe(15);
    });

    it("should parse different dates correctly", () => {
      const date1 = parseISODate("2024-06-30");
      expect(date1.getMonth()).toBe(5); // June is 5
      expect(date1.getDate()).toBe(30);

      const date2 = parseISODate("2023-12-25");
      expect(date2.getFullYear()).toBe(2023);
      expect(date2.getMonth()).toBe(11); // December is 11
      expect(date2.getDate()).toBe(25);
    });
  });
});
