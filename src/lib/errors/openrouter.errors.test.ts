import { describe, it, expect } from "vitest";
import {
  OpenRouterError,
  OpenRouterApiError,
  OpenRouterValidationError,
  OpenRouterNetworkError,
} from "./openrouter.errors";

describe("OpenRouter Errors", () => {
  describe("OpenRouterError", () => {
    it("should create an error with correct message and name", () => {
      const error = new OpenRouterError("Test error message");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(OpenRouterError);
      expect(error.message).toBe("Test error message");
      expect(error.name).toBe("OpenRouterError");
    });

    it("should maintain correct prototype chain", () => {
      const error = new OpenRouterError("Test error");

      expect(Object.getPrototypeOf(error)).toBe(OpenRouterError.prototype);
    });
  });

  describe("OpenRouterApiError", () => {
    it("should create an API error with status code", () => {
      const error = new OpenRouterApiError("API error", 500);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(OpenRouterError);
      expect(error).toBeInstanceOf(OpenRouterApiError);
      expect(error.message).toBe("API error");
      expect(error.name).toBe("OpenRouterApiError");
      expect(error.statusCode).toBe(500);
    });

    it("should create an API error with all optional parameters", () => {
      const error = new OpenRouterApiError("API error with details", 429, "rate_limit_exceeded", "RATE_LIMIT");

      expect(error.message).toBe("API error with details");
      expect(error.statusCode).toBe(429);
      expect(error.errorType).toBe("rate_limit_exceeded");
      expect(error.errorCode).toBe("RATE_LIMIT");
    });

    it("should handle optional parameters as undefined", () => {
      const error = new OpenRouterApiError("API error", 400);

      expect(error.errorType).toBeUndefined();
      expect(error.errorCode).toBeUndefined();
    });

    it("should maintain correct prototype chain", () => {
      const error = new OpenRouterApiError("Test error", 500);

      expect(Object.getPrototypeOf(error)).toBe(OpenRouterApiError.prototype);
    });
  });

  describe("OpenRouterValidationError", () => {
    it("should create a validation error without validation errors array", () => {
      const error = new OpenRouterValidationError("Validation failed");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(OpenRouterError);
      expect(error).toBeInstanceOf(OpenRouterValidationError);
      expect(error.message).toBe("Validation failed");
      expect(error.name).toBe("OpenRouterValidationError");
      expect(error.validationErrors).toEqual([]);
    });

    it("should create a validation error with validation errors array", () => {
      const validationErrors = [
        { field: "name", message: "Name is required" },
        { field: "email", message: "Email is invalid" },
      ];
      const error = new OpenRouterValidationError("Multiple validation errors", validationErrors);

      expect(error.message).toBe("Multiple validation errors");
      expect(error.validationErrors).toEqual(validationErrors);
      expect(error.validationErrors).toHaveLength(2);
    });

    it("should maintain correct prototype chain", () => {
      const error = new OpenRouterValidationError("Test error");

      expect(Object.getPrototypeOf(error)).toBe(OpenRouterValidationError.prototype);
    });
  });

  describe("OpenRouterNetworkError", () => {
    it("should create a network error without original error", () => {
      const error = new OpenRouterNetworkError("Network error");

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(OpenRouterError);
      expect(error).toBeInstanceOf(OpenRouterNetworkError);
      expect(error.message).toBe("Network error");
      expect(error.name).toBe("OpenRouterNetworkError");
      expect(error.originalError).toBeUndefined();
    });

    it("should create a network error with original error", () => {
      const originalError = new Error("Connection timeout");
      const error = new OpenRouterNetworkError("Failed to connect", originalError);

      expect(error.message).toBe("Failed to connect");
      expect(error.originalError).toBe(originalError);
      expect(error.originalError?.message).toBe("Connection timeout");
    });

    it("should maintain correct prototype chain", () => {
      const error = new OpenRouterNetworkError("Test error");

      expect(Object.getPrototypeOf(error)).toBe(OpenRouterNetworkError.prototype);
    });
  });
});
