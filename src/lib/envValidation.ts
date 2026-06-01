/**
 * Startup environment validation — fail fast on misconfiguration
 * rather than discovering missing secrets at runtime.
 *
 * Called from src/instrumentation.ts (Next.js startup hook).
 */

const REQUIRED: readonly string[] = [
  "AUTH_SECRET",
  "DATABASE_URL",
];

const RECOMMENDED: readonly string[] = [
  "NEXTAUTH_URL",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
];

export function validateEnv(): void {
  const missing = REQUIRED.filter(k => !process.env[k]?.trim());

  if (missing.length > 0) {
    const msg = `[startup] FATAL — missing required environment variables:\n  ${missing.join("\n  ")}`;
    console.error(msg);
    if (process.env.NODE_ENV === "production") {
      // Hard fail in production — better a crashed deploy than a live app with no secrets
      process.exit(1);
    }
  }

  const absent = RECOMMENDED.filter(k => !process.env[k]?.trim());
  if (absent.length > 0) {
    console.warn(
      `[startup] Recommended env vars not set (some features will degrade gracefully):\n  ${absent.join("\n  ")}`
    );
  }

  const secret = process.env.AUTH_SECRET ?? "";
  if (secret && secret.length < 32) {
    console.warn("[startup] AUTH_SECRET is shorter than 32 characters — use `openssl rand -base64 48` to generate a strong secret");
  }

  if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_URL?.startsWith("https://")) {
    console.warn("[startup] NEXTAUTH_URL should use https:// in production");
  }
}
