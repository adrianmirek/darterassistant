/**
 * Generates a device fingerprint based on hardware and browser characteristics
 * This ensures unique identifiers across different browsers on the same device
 * Uses only stable, deterministic properties for consistent results
 *
 * @returns Device fingerprint hash
 */
async function generateDeviceFingerprint(): Promise<string> {
  const fingerprint: string[] = [];

  // Hardware characteristics
  fingerprint.push(`${screen.width}`);
  fingerprint.push(`${screen.height}`);
  fingerprint.push(`${screen.colorDepth}`);
  fingerprint.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Browser-specific characteristics to ensure uniqueness across browsers
  // These are stable and deterministic
  fingerprint.push(navigator.userAgent);
  fingerprint.push(navigator.language);
  fingerprint.push(`${navigator.hardwareConcurrency || 0}`);
  fingerprint.push(navigator.platform);

  const combined = fingerprint.join("::");

  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  const hashHex = Math.abs(hash).toString(16).padStart(8, "0");
  const uuid = `${hashHex.slice(0, 8)}-${hashHex.slice(0, 4)}-4${hashHex.slice(0, 3)}-8${hashHex.slice(0, 3)}-${hashHex.padEnd(12, hashHex.slice(0, 4)).slice(0, 12)}`;

  return uuid;
}

/**
 * Gets or creates a persistent device identifier
 * Uses fingerprinting as the device ID (unique per browser)
 * Caches in localStorage for performance when available
 *
 * @returns Device identifier (UUID-like string)
 */
export async function getDeviceIdentifier(): Promise<string> {
  const STORAGE_KEY = "device_id";
  const FINGERPRINT_KEY = "device_fingerprint_raw";

  try {
    const storedId = localStorage.getItem(STORAGE_KEY);
    const storedFingerprint = localStorage.getItem(FINGERPRINT_KEY);

    const currentFingerprint = await generateDeviceFingerprint();

    // Build current fingerprint components for comparison
    const fingerprintComponents = [
      `${screen.width}`,
      `${screen.height}`,
      `${screen.colorDepth}`,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.userAgent,
      navigator.language,
      `${navigator.hardwareConcurrency || 0}`,
      navigator.platform,
    ].join("::");

    // If fingerprint matches cached one, return cached ID
    if (storedId && storedFingerprint === fingerprintComponents) {
      console.log("[Device] Using cached device identifier:", storedId);
      return storedId;
    }

    // New fingerprint - cache it
    localStorage.setItem(STORAGE_KEY, currentFingerprint);
    localStorage.setItem(FINGERPRINT_KEY, fingerprintComponents);
    console.log("[Device] Generated new device identifier:", currentFingerprint);

    return currentFingerprint;
  } catch {
    console.log("[Device] localStorage not available, using fingerprint");
    const deviceId = await generateDeviceFingerprint();
    console.log("[Device] Generated device identifier (no cache):", deviceId);
    return deviceId;
  }
}

export function getDeviceIdentifierSync(): string {
  const STORAGE_KEY = "device_id";

  try {
    const storedId = localStorage.getItem(STORAGE_KEY);
    if (storedId) {
      return storedId;
    }
  } catch {
    // Continue
  }

  // Generate fingerprint with browser-specific data
  const fingerprint = [
    `${screen.width}`,
    `${screen.height}`,
    `${screen.colorDepth}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.userAgent,
    navigator.language,
    `${navigator.hardwareConcurrency || 0}`,
    navigator.platform,
  ].join("::");

  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  const hashHex = Math.abs(hash).toString(16).padStart(8, "0");
  const uuid = `${hashHex.slice(0, 8)}-${hashHex.slice(0, 4)}-4${hashHex.slice(0, 3)}-8${hashHex.slice(0, 3)}-${hashHex.padEnd(12, hashHex.slice(0, 4)).slice(0, 12)}`;

  return uuid;
}
