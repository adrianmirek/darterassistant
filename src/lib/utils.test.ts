import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("Utils", () => {
  describe("cn (className merger)", () => {
    it("should merge class names correctly", () => {
      const result = cn("class1", "class2");
      expect(result).toContain("class1");
      expect(result).toContain("class2");
    });

    it("should handle conditional classes", () => {
      const isConditional = true;
      const isExcluded = false;
      const result = cn("base", isConditional && "conditional", isExcluded && "excluded");
      expect(result).toContain("base");
      expect(result).toContain("conditional");
      expect(result).not.toContain("excluded");
    });

    it("should merge tailwind classes correctly", () => {
      // When two conflicting classes are provided, the last one should win
      const result = cn("px-2", "px-4");
      expect(result).toContain("px-4");
      expect(result).not.toContain("px-2");
    });

    it("should handle empty inputs", () => {
      const result = cn();
      expect(result).toBe("");
    });

    it("should handle undefined and null", () => {
      const result = cn("class1", undefined, null, "class2");
      expect(result).toContain("class1");
      expect(result).toContain("class2");
    });
  });
});
