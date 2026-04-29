import { NextResponse } from "next/server";
import { getAppSetting } from "@/lib/app-settings";
import { fetchWithCache } from "@/lib/redis";

/** GET: Public. Site branding — logo, title, headline. Cached 10 min. */
export async function GET() {
  try {
    const branding = await fetchWithCache(
      "public:site-branding",
      async () => {
        const [logoUrl, faviconUrl, title, tagline, headline] = await Promise.all([
          getAppSetting("SITE_LOGO_URL"),
          getAppSetting("SITE_FAVICON_URL"),
          getAppSetting("SITE_TITLE"),
          getAppSetting("SITE_TAGLINE"),
          getAppSetting("SITE_HEADLINE"),
        ]);
        return {
          logoUrl: logoUrl?.trim() || null,
          faviconUrl: faviconUrl?.trim() || null,
          title: title?.trim() || null,
          tagline: tagline?.trim() || null,
          headline: headline?.trim() || null,
        };
      },
      600 // 10 min
    );
    return NextResponse.json(branding);
  } catch {
    return NextResponse.json({ logoUrl: null, faviconUrl: null, title: null, tagline: null, headline: null });
  }
}
