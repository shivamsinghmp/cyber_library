import { AnnouncementBanner } from "./AnnouncementBanner";
import { getAppSetting } from "@/lib/app-settings";
import { fetchWithCache } from "@/lib/redis";

/**
 * Server component wrapper for AnnouncementBanner.
 * Reads the announcement message server-side (Redis-cached) so the
 * client component doesn't need its own fetch.
 */
export async function AnnouncementBannerWrapper() {
  try {
    const message = await fetchWithCache(
      "public:announcement",
      async () => {
        const val = await getAppSetting("ANNOUNCEMENT");
        return val && val.trim() ? val.trim() : null;
      },
      300
    );
    return <AnnouncementBanner initialMessage={message} />;
  } catch {
    return <AnnouncementBanner />;
  }
}
