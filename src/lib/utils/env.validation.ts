/**
 * Validates that all required environment variables are set
 * Throws an error if any are missing
 */
export function validateEnvironmentVariables() {
  const requiredEnvVars = [
    "SUPABASE_URL",
    "SUPABASE_PUBLIC_KEY",
    "OPENROUTER_API_KEY",
  ] as const;

  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!import.meta.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    const errorMessage = `Missing required environment variables: ${missing.join(", ")}`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  console.log("✓ All required environment variables are set");
}

/**
 * Gets an environment variable value with runtime validation
 */
export function getRequiredEnv(key: keyof ImportMetaEnv): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

