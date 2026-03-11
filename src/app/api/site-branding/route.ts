import { NextResponse } from "next/server";
import { getAppSetting } from "@/lib/app-settings";

/** GET: Public. Returns logo, favicon, title, tagline, headline for site branding. */
export async function GET() {
  try {
    const [logoUrl, faviconUrl, title, tagline, headline] = await Promise.all([
      getAppSetting("SITE_LOGO_URL"),
      getAppSetting("SITE_FAVICON_URL"),
      getAppSetting("SITE_TITLE"),
      getAppSetting("SITE_TAGLINE"),
      getAppSetting("SITE_HEADLINE"),
    ]);
    return NextResponse.json({
      logoUrl: logoUrl?.trim() || null,
      faviconUrl: faviconUrl?.trim() || null,
      title: title?.trim() || null,
      tagline: tagline?.trim() || null,
      headline: headline?.trim() || null,
    });
  } catch {
    return NextResponse.json({
      logoUrl: null,
      faviconUrl: null,
      title: null,
      tagline: null,
      headline: null,
    });
  }
}
