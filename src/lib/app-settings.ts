import { prisma } from "./prisma";
import { decrypt, encrypt } from "./encrypt";

export const APP_SETTING_KEYS = {
  WHATSAPP_PHONE_NUMBER_ID:       { label: "WhatsApp Phone Number ID",                          secret: false },
  WHATSAPP_ACCESS_TOKEN:          { label: "WhatsApp Access Token",                              secret: true  },
  CRON_SECRET:                    { label: "Cron Secret (for /api/cron/*)",                      secret: true  },
  GOOGLE_SERVICE_ACCOUNT_EMAIL:   { label: "Google Service Account Email",                       secret: false },
  GOOGLE_PRIVATE_KEY:             { label: "Google Private Key (PEM)",                           secret: true  },
  GOOGLE_CALENDAR_ID:             { label: "Google Calendar ID",                                 secret: false },
  AUTH_GOOGLE_ID:                 { label: "Google OAuth Client ID",                             secret: false },
  AUTH_GOOGLE_SECRET:             { label: "Google OAuth Client Secret",                         secret: true  },
  NEXTAUTH_URL:                   { label: "NextAuth URL (optional)",                            secret: false },
  ANNOUNCEMENT:                   { label: "Announcement banner (site-wide)",                    secret: false },
  SUPPORT_WHATSAPP_NUMBER:        { label: "Support WhatsApp number (e.g. 919876543210)",        secret: false },
  SUPPORT_EMAIL:                  { label: "Support email",                                      secret: false },
  WHATSAPP_GROUP_LINK:            { label: "WhatsApp group join link",                           secret: false },
  SITE_LOGO_URL:                  { label: "Site logo URL (leave empty for default /logo.svg)",  secret: false },
  SITE_FAVICON_URL:               { label: "Favicon URL (browser tab icon)",                     secret: false },
  SITE_TITLE:                     { label: "Site title (browser tab, SEO)",                      secret: false },
  SITE_TAGLINE:                   { label: "Site tagline",                                       secret: false },
  SITE_HEADLINE:                  { label: "Main headline (homepage hero text)",                 secret: false },
  FOOTER_TEXT:                    { label: "Footer text",                                        secret: false },
  MEET_ADDON_REALTIME_ENABLED:    { label: "Enable Meet add-on realtime messaging features",     secret: false },
  MEET_ADDON_FOCUS_GUARD_ENABLED: { label: "Enable Meet add-on focus guard alerts",              secret: false },
  MEET_ADDON_GAMIFICATION_ENABLED:{ label: "Enable Meet add-on coins and leaderboard",           secret: false },
  GOOGLE_ANALYTICS_ID:            { label: "Google Analytics ID (e.g. G-XXXXXXX)",              secret: false },
  GOOGLE_TAG_MANAGER_ID:          { label: "Google Tag Manager ID (e.g. GTM-XXXXXX)",           secret: false },
  GOOGLE_ADSENSE_ID:              { label: "Google AdSense ID (e.g. pub-XXXXXXX)",              secret: false },
  FB_PIXEL_ID:                    { label: "Facebook Pixel ID",                                  secret: false },
  CUSTOM_HEAD_HTML:               { label: "Custom Head HTML (Scripts, tags, etc.)",             secret: false },
  FOOTER_CONFIG_JSON:             { label: "Structured JSON for Footer",                         secret: false },
} as const;

const SECRET_KEYS = new Set(
  Object.entries(APP_SETTING_KEYS).filter(([, v]) => v.secret).map(([k]) => k)
);

// ── In-process cache (TTL: 5 minutes) ────────────────────────────────────────
// Prevents DB hit on every WhatsApp send, layout render, etc.
const _cache = new Map<string, { value: string | null; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function cacheGet(key: string): string | null | undefined {
  const entry = _cache.get(key);
  if (!entry) return undefined;           // cache miss
  if (Date.now() > entry.expiresAt) { _cache.delete(key); return undefined; }
  return entry.value;                     // cache hit
}

function cacheSet(key: string, value: string | null) {
  _cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function invalidateAppSettingCache(key?: keyof typeof APP_SETTING_KEYS) {
  if (key) _cache.delete(key);
  else _cache.clear();
}

/** Get value for a key: env first, then in-process cache, then DB. */
export async function getAppSetting(key: keyof typeof APP_SETTING_KEYS): Promise<string | null> {
  // 1. Env always wins (no cache needed — env never changes at runtime)
  const envVal = process.env[key];
  if (envVal != null && envVal.trim() !== "") return envVal.trim();

  // 2. In-process cache
  const cached = cacheGet(key);
  if (cached !== undefined) return cached;

  // 3. DB
  try {
    const row = await prisma.appSetting.findUnique({
      where: { key },
      select: { valueEncrypted: true, iv: true },
    });
    if (!row?.valueEncrypted) { cacheSet(key, null); return null; }
    const value = row.iv ? decrypt(row.valueEncrypted, row.iv) : row.valueEncrypted;
    cacheSet(key, value);
    return value;
  } catch {
    return null;
  }
}

/** Sync get — reads env only. For non-async contexts. */
export function getAppSettingSync(key: keyof typeof APP_SETTING_KEYS): string | null {
  const v = process.env[key];
  return v != null && v.trim() !== "" ? v.trim() : null;
}

/** Save setting to DB and invalidate cache. */
export async function setAppSetting(
  key: keyof typeof APP_SETTING_KEYS,
  value: string | null
): Promise<void> {
  const trimmed = value?.trim() || null;

  if (trimmed === null) {
    await prisma.appSetting.deleteMany({ where: { key } });
    invalidateAppSettingCache(key);
    return;
  }

  const isSecret = SECRET_KEYS.has(key);
  let valueEncrypted: string;
  let iv: string | null = null;

  if (isSecret) {
    const { encrypted, iv: newIv } = encrypt(trimmed);
    valueEncrypted = encrypted;
    iv = newIv;
  } else {
    valueEncrypted = trimmed;
  }

  await prisma.appSetting.upsert({
    where: { key },
    create: { key, valueEncrypted, iv },
    update: { valueEncrypted, iv },
  });

  invalidateAppSettingCache(key);
}
