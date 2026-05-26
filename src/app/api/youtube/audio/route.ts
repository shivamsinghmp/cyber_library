import { NextRequest, NextResponse } from "next/server";
import { getAppSetting } from "@/lib/app-settings";
import { getYTStreamInfo } from "@/lib/youtube-innertube";

export const dynamic = "force-dynamic";
export const runtime  = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId")?.trim();

  if (!videoId || !/^[a-zA-Z0-9_-]{8,15}$/.test(videoId)) {
    return NextResponse.json({ error: "Invalid videoId" }, { status: 400 });
  }

  try {
    const cookies = await getAppSetting("YOUTUBE_COOKIES");
    const info = await getYTStreamInfo(videoId, cookies);

    if (info.isLive) {
      return NextResponse.json({
        isLive: true,
        hlsUrl: info.hlsUrl,
        title:  info.title,
        author: info.author,
        thumbnail: info.thumbnail,
        duration: 0,
      });
    }

    return NextResponse.json({
      isLive:   false,
      url:      info.url,
      mimeType: info.mimeType,
      title:    info.title,
      author:   info.author,
      thumbnail: info.thumbnail,
      duration: info.durationSeconds,
    });
  } catch (err) {
    const raw = err instanceof Error ? err.message : "Unknown error";
    console.error("[youtube/audio] videoId:", videoId, "→", raw);

    const msg = raw.toLowerCase().includes("sign in") || raw.toLowerCase().includes("age")
      ? "Age-restricted video — YouTube Cookies configure karo Admin → AI Settings mein."
      : raw.includes("timeout") || raw.includes("Timeout")
        ? "YouTube response timeout. Dobara try karo."
        : raw.slice(0, 200);

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
