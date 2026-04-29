import { NextResponse } from "next/server";
import { getAppSetting } from "@/lib/app-settings";
import { fetchWithCache } from "@/lib/redis";

/** GET: Public. Returns current announcement message. Cached 5 min. */
export async function GET() {
  try {
    const message = await fetchWithCache(
      "public:announcement",
      async () => {
        const val = await getAppSetting("ANNOUNCEMENT");
        return val && val.trim() ? val.trim() : null;
      },
      300 // 5 min
    );
    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ message: null });
  }
}
