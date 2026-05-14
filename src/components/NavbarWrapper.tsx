import { Navbar } from "./Navbar";
import { batchGetAppSettings } from "@/lib/app-settings";

/**
 * Server component wrapper for Navbar.
 * Fetches branding server-side so Navbar doesn't need a client-side fetch.
 */
export async function NavbarWrapper() {
  try {
    const settings = await batchGetAppSettings([
      "SITE_LOGO_URL",
      "SITE_TITLE",
      "SITE_TAGLINE",
    ]);
    return (
      <Navbar
        initialLogoUrl={settings.SITE_LOGO_URL}
        initialTitle={settings.SITE_TITLE}
        initialTagline={settings.SITE_TAGLINE}
      />
    );
  } catch {
    return <Navbar />;
  }
}
