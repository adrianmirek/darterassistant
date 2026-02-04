#!/usr/bin/env node
/* eslint-env node */
/* eslint-disable no-console */

/**
 * PWA Icon Generator Script
 *
 * This script generates PWA icons from your source image.
 *
 * Requirements:
 * - Node.js installed
 * - sharp package (npm install sharp)
 * - Source image in public/ folder (e.g., favicon.png or your logo)
 *
 * Usage:
 *   npm install sharp
 *   node scripts/generate-pwa-icons.js [source-image]
 *
 * Example:
 *   node scripts/generate-pwa-icons.js public/favicon.png
 */

import { readFile } from "fs/promises";
import { resolve, join } from "path";

// Try to import sharp, provide helpful error if not installed
let sharp;
try {
  const sharpModule = await import("sharp");
  sharp = sharpModule.default;
} catch {
  // eslint-disable-next-line no-undef
  console.error("❌ Error: sharp package is not installed");
  // eslint-disable-next-line no-undef
  console.error("📦 Please install it by running: npm install sharp --save-dev");
  // eslint-disable-next-line no-undef
  console.error("");
  // eslint-disable-next-line no-undef
  console.error("Alternative: Use online tools mentioned in PWA_SETUP.md");
  // eslint-disable-next-line no-undef
  process.exit(1);
}

// Get source image from command line argument or use default
// eslint-disable-next-line no-undef
const args = process.argv.slice(2);
const sourceImage = args[0] || "public/favicon.png";

const sizes = [
  { size: 192, name: "pwa-192x192.png" },
  { size: 512, name: "pwa-512x512.png" },
];

async function generateIcons() {
  // eslint-disable-next-line no-undef
  console.log("🎨 PWA Icon Generator");
  // eslint-disable-next-line no-undef
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  // eslint-disable-next-line no-undef
  console.log(`📁 Source: ${sourceImage}`);
  // eslint-disable-next-line no-undef
  console.log("");

  try {
    // Read source image
    const sourcePath = resolve(sourceImage);
    const imageBuffer = await readFile(sourcePath);

    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    // eslint-disable-next-line no-undef
    console.log(`✓ Source image loaded: ${metadata.width}×${metadata.height}px`);
    // eslint-disable-next-line no-undef
    console.log("");

    // Generate each size
    for (const { size, name } of sizes) {
      const outputPath = join("public", name);

      await sharp(imageBuffer)
        .resize(size, size, {
          fit: "contain",
          background: { r: 15, g: 23, b: 42, alpha: 1 }, // #0f172a
        })
        .png()
        .toFile(outputPath);

      // eslint-disable-next-line no-undef
      console.log(`✓ Generated: ${outputPath} (${size}×${size}px)`);
    }

    // eslint-disable-next-line no-undef
    console.log("");
    // eslint-disable-next-line no-undef
    console.log("✨ Success! PWA icons generated successfully");
    // eslint-disable-next-line no-undef
    console.log("");
    // eslint-disable-next-line no-undef
    console.log("📱 Next steps:");
    // eslint-disable-next-line no-undef
    console.log("   1. Check the generated icons in public/ folder");
    // eslint-disable-next-line no-undef
    console.log("   2. Run: npm run dev");
    // eslint-disable-next-line no-undef
    console.log("   3. Test PWA installation in your browser");
    // eslint-disable-next-line no-undef
    console.log("");
    // eslint-disable-next-line no-undef
    console.log("📖 See PWA_SETUP.md for testing instructions");
  } catch (error) {
    if (error.code === "ENOENT") {
      // eslint-disable-next-line no-undef
      console.error(`❌ Error: Source image not found: ${sourceImage}`);
      // eslint-disable-next-line no-undef
      console.error("");
      // eslint-disable-next-line no-undef
      console.error("💡 Usage: node scripts/generate-pwa-icons.js [source-image]");
      // eslint-disable-next-line no-undef
      console.error("   Example: node scripts/generate-pwa-icons.js public/favicon.png");
    } else {
      // eslint-disable-next-line no-undef
      console.error("❌ Error generating icons:", error.message);
    }
    // eslint-disable-next-line no-undef
    process.exit(1);
  }
}

generateIcons();
