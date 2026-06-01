/**
 * Environment variable validation — called once at startup.
 * Fails loudly (throws) if critical env vars are missing,
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

  const missing: string[] = [];

  for (const { key, desc } of REQUIRED_VARS) {
    if (!process.env[key]?.trim()) {
      missing.push(`  ❌ ${key} — ${desc}`);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[env-check] Missing REQUIRED environment variables:\n${missing.join("\n")}\n\nAdd them to .env.local and restart.`
    );
  }

  // Warn about optional but important vars
  for (const { key, desc } of OPTIONAL_VARS) {
    if (!process.env[key]?.trim()) {
      console.warn(`[env-check] ⚠️  ${key} not set — ${desc} will not work`);
    }
  }
}
