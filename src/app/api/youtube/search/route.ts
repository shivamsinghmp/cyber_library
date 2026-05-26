import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { verifyMeetAddonToken } from "@/lib/meet-addon-token";
import { getAppSetting } from "@/lib/app-settings";

export async function GET(request: NextRequest) {
  // Accept both session cookies (dashboard) and Bearer tokens (Meet Add-on panel)
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const addonUser = bearerToken ? verifyMeetAddonToken(bearerToken) : null;

  if (!addonUser) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ error: "Query too short" }, { status: 400 });

  const apiKey = await getAppSetting("YOUTUBE_API_KEY");
  if (!apiKey) return NextResponse.json({ error: "YouTube API not configured" }, { status: 503 });

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(q)}&key=${apiKey}&maxResults=10&relevanceLanguage=hi`,
      {
        next: { revalidate: 300 },
        // Server-side fetches have no Referer by default, which causes YouTube to
        // reject requests when the API key has HTTP-referrer restrictions configured.
        headers: { Referer: "https://cyberlib.in/" },
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err as { error?: { message?: string } }).error?.message ?? "YouTube API error";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const data = await res.json() as {
      items?: Array<{
        id: { videoId?: string };
        snippet: { title: string; channelTitle: string; thumbnails: { default: { url: string } } };
      }>;
    };

    const results = (data.items ?? [])
      .filter(item => item.id?.videoId)
      .map(item => ({
        videoId:   item.id.videoId!,
        title:     item.snippet.title,
        channel:   item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.default.url,
      }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
