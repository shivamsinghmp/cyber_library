import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { APP_SETTING_KEYS, getAppSetting, setAppSetting } from "@/lib/app-settings";
import { invalidateCache } from "@/lib/redis";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/api-helpers";

/** GET: List all supported keys with current value (masked for secrets). */
export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    // auth verified (user identity confirmed by requireSuperAdmin/requireAdmin)

    const keys = Object.keys(APP_SETTING_KEYS) as (keyof typeof APP_SETTING_KEYS)[];
    const result: Record<string, { label: string; secret: boolean; value: string | null; hasValue: boolean }> = {};

    for (const key of keys) {
      const meta = APP_SETTING_KEYS[key];
      const value = await getAppSetting(key);
      result[key] = {
        label: meta.label,
        secret: meta.secret,
        value: meta.secret ? null : value,
        hasValue: value != null && value.length > 0,
      };
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error("GET /api/admin/settings:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

const postSchema = z.object({
  key: z.string(),
  value: z.string().nullable(),
});

/** POST: Save one setting. Body: { key, value }. */
export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdmin();
    if (auth.error) return auth.error;
    // auth verified (user identity confirmed by requireSuperAdmin/requireAdmin)

    const body = await request.json();
    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    const { key, value } = parsed.data;

    if (!(key in APP_SETTING_KEYS)) {
      return NextResponse.json({ error: "Unknown key" }, { status: 400 });
    }

    try {
      await setAppSetting(key as keyof typeof APP_SETTING_KEYS, value);
    } catch (err) {
      console.error("setAppSetting error:", err);
      return NextResponse.json(
        { error: "ENCRYPTION_KEY or AUTH_SECRET required in .env for storing secrets" },
        { status: 500 }
      );
    }

    // Invalidate relevant public caches when settings change
    const siteBrandingKeys = ["SITE_LOGO_URL","SITE_FAVICON_URL","SITE_TITLE","SITE_TAGLINE","SITE_HEADLINE"];
    if (siteBrandingKeys.includes(key)) await invalidateCache("public:site-branding");
    if (key === "ANNOUNCEMENT") await invalidateCache("public:announcement");

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/admin/settings:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
