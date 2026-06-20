import { AnnouncementBanner } from "./AnnouncementBanner";
import { getAppSetting } from "@/lib/app-settings";
import { unstable_cache } from "next/cache";

const getCachedAnnouncement = unstable_cache(
  async () => {
    const val = await getAppSetting("ANNOUNCEMENT");
    return val && val.trim() ? val.trim() : null;
  },
  ["public-announcement"],
  { revalidate: 300 }
);

export async function AnnouncementBannerWrapper() {
  try {
    const message = await getCachedAnnouncement();
    return <AnnouncementBanner initialMessage={message} />;
  } catch {
    return <AnnouncementBanner />;
  }
}
