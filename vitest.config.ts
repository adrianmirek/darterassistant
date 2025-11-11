import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: "jsdom",

    // Use vmThreads pool for better Windows compatibility
    pool: "vmThreads",

    // Global test setup
    setupFiles: ["./src/test/setup.ts"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        ".astro/",
        "src/test/",
        "**/*.config.{js,ts}",
        "**/types.ts",
        "**/*.d.ts",
        "src/db/database.types.ts",
      ],
      // Set coverage thresholds (adjust as needed)
      thresholds: {
        lines: 30,
        functions: 30,
        branches: 30,
        statements: 30,
      },
    },

    // Global test configuration
    globals: true,

    // Test file patterns
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],

    // Exclude patterns
    exclude: ["node_modules", "dist", ".astro", "e2e"],

    // Reporter configuration
    reporters: ["verbose"],

    // Timeout configuration
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
