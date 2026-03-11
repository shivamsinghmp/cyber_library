import { prisma } from "./prisma";
import { decrypt, encrypt } from "./encrypt";

export const APP_SETTING_KEYS = {
  WHATSAPP_PHONE_NUMBER_ID: { label: "WhatsApp Phone Number ID", secret: false },
  WHATSAPP_ACCESS_TOKEN: { label: "WhatsApp Access Token", secret: true },
  CRON_SECRET: { label: "Cron Secret (for /api/cron/*)", secret: true },
  GOOGLE_SERVICE_ACCOUNT_EMAIL: { label: "Google Service Account Email", secret: false },
  GOOGLE_PRIVATE_KEY: { label: "Google Private Key (PEM)", secret: true },
  GOOGLE_CALENDAR_ID: { label: "Google Calendar ID", secret: false },
  AUTH_GOOGLE_ID: { label: "Google OAuth Client ID", secret: false },
  AUTH_GOOGLE_SECRET: { label: "Google OAuth Client Secret", secret: true },
  NEXTAUTH_URL: { label: "NextAuth URL (optional)", secret: false },
  ANNOUNCEMENT: { label: "Announcement banner (site-wide)", secret: false },
  SUPPORT_WHATSAPP_NUMBER: { label: "Support WhatsApp number (e.g. 919876543210)", secret: false },
  SUPPORT_EMAIL: { label: "Support email", secret: false },
  WHATSAPP_GROUP_LINK: { label: "WhatsApp group join link (students can join via this link)", secret: false },
  SITE_LOGO_URL: { label: "Site logo URL (leave empty for default /logo.svg)", secret: false },
  SITE_FAVICON_URL: { label: "Favicon URL (browser tab icon)", secret: false },
  SITE_TITLE: { label: "Site title (browser tab, SEO)", secret: false },
  SITE_TAGLINE: { label: "Site tagline (e.g. The Focus Hub – shown under logo in navbar)", secret: false },
  SITE_HEADLINE: { label: "Main headline (homepage hero text)", secret: false },
} as const;

const SECRET_KEYS = new Set(
  Object.entries(APP_SETTING_KEYS).filter(([, v]) => v.secret).map(([k]) => k)
);

/** Get value for a key: env first, then DB. Secrets are decrypted from DB. */
export async function getAppSetting(key: keyof typeof APP_SETTING_KEYS): Promise<string | null> {
  const envVal = process.env[key];
  if (envVal != null && envVal.trim() !== "") return envVal.trim();

  try {
    const row = await prisma.appSetting.findUnique({
      where: { key },
      select: { valueEncrypted: true, iv: true },
    });
    if (!row?.valueEncrypted) return null;
    if (row.iv) {
      return decrypt(row.valueEncrypted, row.iv);
    }
    return row.valueEncrypted;
  } catch {
    return null;
  }
}

/** Sync get for use in non-async contexts (e.g. cron). Reads env only or returns null; for DB use getAppSetting. */
export function getAppSettingSync(key: keyof typeof APP_SETTING_KEYS): string | null {
  const v = process.env[key];
  return v != null && v.trim() !== "" ? v.trim() : null;
}

/** Save setting to DB. Secret keys are encrypted. */
export async function setAppSetting(
  key: keyof typeof APP_SETTING_KEYS,
  value: string | null
): Promise<void> {
  const trimmed = value?.trim() || null;
  if (trimmed === null) {
    await prisma.appSetting.deleteMany({ where: { key } });
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
}
