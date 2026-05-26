import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { verifyMeetAddonToken } from "@/lib/meet-addon-token";
import { getAppSetting } from "@/lib/app-settings";
import { getYTStreamInfo } from "@/lib/youtube-innertube";

export const dynamic = "force-dynamic";
export const runtime  = "nodejs";

export async function GET(request: NextRequest) {
  const authHeader  = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const addonUser   = bearerToken ? verifyMeetAddonToken(bearerToken) : null;

  if (!addonUser) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId")?.trim();

  if (!videoId || !/^[a-zA-Z0-9_-]{8,15}$/.test(videoId)) {
    return NextResponse.json({ error: "Invalid videoId" }, { status: 400 });
  }

  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), 15_000);

  try {
    const cookies = await getAppSetting("YOUTUBE_COOKIES");
    const info    = await getYTStreamInfo(videoId, cookies, controller.signal);

    if (info.isLive) {
      if (!info.hlsUrl) return NextResponse.json({ error: "Live stream format not available" }, { status: 404 });
      return NextResponse.json({
        isLive: true,
        hlsUrl: info.hlsUrl,
        title:  info.title,
        author: info.author,
        thumbnail: info.thumbnail,
        duration:  0,
      });
    }

    return NextResponse.json({
      isLive:    false,
      url:       info.url,
      mimeType:  info.mimeType ?? "audio/webm",
      title:     info.title,
      author:    info.author,
      thumbnail: info.thumbnail,
      duration:  info.durationSeconds,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get track info";
    console.error("[youtube/audio] Error for", videoId, ":", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    clearTimeout(timer);
  }
}
