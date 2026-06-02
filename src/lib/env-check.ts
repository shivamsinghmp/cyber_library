/**
 * Environment variable validation — called once at startup.
 * Fails loudly (throws) if critical env vars are missing or weak,
 * rather than failing silently at runtime when users hit those features.
 *
 * Import this in src/app/layout.tsx server component to run on boot.
 */

const REQUIRED_VARS = [
  { key: "DATABASE_URL",       desc: "PostgreSQL connection string" },
  { key: "AUTH_SECRET",        desc: "NextAuth JWT secret (min 32 chars)" },
  { key: "ENCRYPTION_KEY",     desc: "AES-256 encryption key for stored secrets" },
] as const;

const OPTIONAL_VARS = [
  // AI
  { key: "ANTHROPIC_API_KEY",           desc: "AI StudyMate chat (can also be set via Admin → AI Keys)" },
  // Cache & rate limiting
  { key: "UPSTASH_REDIS_REST_URL",      desc: "Redis cache + rate limiting (login/signup brute-force protection disabled without this)" },
  { key: "UPSTASH_REDIS_REST_TOKEN",    desc: "Redis auth token" },
  // Payments
  { key: "RAZORPAY_KEY_ID",             desc: "Razorpay payments (checkout and coin purchases will fail)" },
  { key: "RAZORPAY_KEY_SECRET",         desc: "Razorpay webhook verification" },
  // Email
  { key: "RESEND_API_KEY",              desc: "Transactional email via Resend (OTP, welcome, payment emails)" },
  // WhatsApp
  { key: "WHATSAPP_ACCESS_TOKEN",       desc: "WhatsApp Business API (OTP and broadcast messages)" },
  { key: "WHATSAPP_APP_SECRET",         desc: "Meta app secret for webhook signature verification" },
  // Cron
  { key: "CRON_SECRET",                 desc: "Bearer token for /api/cron/* routes (expiry reminders will not run)" },
  // Site
  { key: "NEXT_PUBLIC_SITE_URL",        desc: "Canonical site URL for OG tags and sitemap" },
] as const;

let validated = false;

export function validateEnv(): void {
  // Only run once per process — avoid repeated checks on hot reload
  if (validated) return;
  validated = true;

  const errors: string[] = [];
  const warnings: string[] = [];
  const isProd = process.env.NODE_ENV === "production";

  // ── Required vars: presence check ──────────────────────────────────────────
  for (const { key, desc } of REQUIRED_VARS) {
    if (!process.env[key]?.trim()) {
      errors.push(`  ❌ ${key} — ${desc}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `[env-check] Missing REQUIRED environment variables:\n${errors.join("\n")}\n\nAdd them to .env.local and restart.`
    );
  }

  // ── Secret strength validation ──────────────────────────────────────────────
  const authSecret = process.env.AUTH_SECRET?.trim() ?? "";
  if (authSecret.length < 32) {
    throw new Error(
      `[env-check] AUTH_SECRET is too short (${authSecret.length} chars). ` +
      `Minimum 32 chars required. Generate with: openssl rand -base64 32`
    );
  }

  const encKey = process.env.ENCRYPTION_KEY?.trim() ?? "";
  if (encKey.length < 32) {
    throw new Error(
      `[env-check] ENCRYPTION_KEY is too short (${encKey.length} chars). ` +
      `Minimum 32 chars required. Recommended: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }
  // Recommended format: 64 hex chars (32 raw bytes)
  if (encKey.length < 64 || !/^[0-9a-fA-F]+$/.test(encKey)) {
    warnings.push(
      `ENCRYPTION_KEY — recommended format is 64 hex chars (32 bytes). ` +
      `Current key will work but has sub-optimal entropy. ` +
      `Regenerate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }

  // ── Production-specific security checks ────────────────────────────────────
  if (isProd) {
    // Superadmin env bypass should be removed after initial setup
    if (process.env.SUPERADMIN_EMAIL?.trim() || process.env.SUPERADMIN_PASSWORD?.trim()) {
      warnings.push(
        `SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD is set in production. ` +
        `Remove these after creating a proper DB admin account to reduce attack surface.`
      );
    }

    // DATABASE_URL should not contain plain passwords in logs — warn if it includes localhost
    const dbUrl = process.env.DATABASE_URL ?? "";
    if (dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1")) {
      warnings.push(`DATABASE_URL points to localhost — this looks like a dev config in a production env.`);
    }

    // AUTH_SECRET should not look like the example placeholder
    if (authSecret === "your_auth_secret_here" || authSecret.startsWith("change_me")) {
      throw new Error(`[env-check] AUTH_SECRET is set to a placeholder value. Generate a real secret.`);
    }
  }

  // ── Optional var warnings ───────────────────────────────────────────────────
  for (const { key, desc } of OPTIONAL_VARS) {
    if (!process.env[key]?.trim()) {
      console.warn(`[env-check] ⚠️  ${key} not set — ${desc} will not work`);
    }
  }

  // Print any non-fatal security warnings
  for (const w of warnings) {
    console.warn(`[env-check] ⚠️  ${w}`);
  }
}
