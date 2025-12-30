import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Cleanup after each test case
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Extend Vitest's expect with jest-dom matchers
// This is already done by importing '@testing-library/jest-dom/vitest'

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
/* eslint-disable @typescript-eslint/no-useless-constructor, @typescript-eslint/no-empty-function */
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords(): unknown[] {
    return [];
  }
  unobserve() {}
} as unknown as typeof IntersectionObserver;
/* eslint-enable @typescript-eslint/no-useless-constructor, @typescript-eslint/no-empty-function */

// Mock ResizeObserver
/* eslint-disable @typescript-eslint/no-useless-constructor, @typescript-eslint/no-empty-function */
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as unknown as typeof ResizeObserver;
/* eslint-enable @typescript-eslint/no-useless-constructor, @typescript-eslint/no-empty-function */

// Set up environment variables for testing
process.env.NODE_ENV = "test";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
  writable: true,
});

// Mock hasPointerCapture for Radix UI components in jsdom
if (typeof HTMLElement !== "undefined" && !HTMLElement.prototype.hasPointerCapture) {
  HTMLElement.prototype.hasPointerCapture = function () {
    return false;
  };
}

if (typeof HTMLElement !== "undefined" && !HTMLElement.prototype.setPointerCapture) {
  HTMLElement.prototype.setPointerCapture = function () {
    // no-op
  };
}

if (typeof HTMLElement !== "undefined" && !HTMLElement.prototype.releasePointerCapture) {
  HTMLElement.prototype.releasePointerCapture = function () {
    // no-op
  };
}
