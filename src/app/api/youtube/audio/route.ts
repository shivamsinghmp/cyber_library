import { NextRequest, NextResponse } from "next/server";
import { getAppSetting } from "@/lib/app-settings";
import { getYTStreamInfoViaYtDlp } from "@/lib/youtube-ytdlp";
import { getYTStreamInfo } from "@/lib/youtube-innertube";

export const dynamic = "force-dynamic";
export const runtime  = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId")?.trim();

  if (!videoId || !/^[a-zA-Z0-9_-]{8,15}$/.test(videoId)) {
    return NextResponse.json({ error: "Invalid videoId" }, { status: 400 });
  }

  const cookies = await getAppSetting("YOUTUBE_COOKIES");

  let info;
  try {
    info = await getYTStreamInfoViaYtDlp(videoId, cookies);
  } catch (e1) {
    const ytdlpErr = (e1 as Error).message;
    console.error("[youtube/audio] yt-dlp failed:", ytdlpErr);
    try {
      info = await getYTStreamInfo(videoId, cookies);
    } catch (e2) {
      const raw = (e2 as Error).message;
      console.error("[youtube/audio] InnerTube failed:", raw);
      // Show yt-dlp error to surface real issue (e.g. binary not found)
      return NextResponse.json({ error: `yt-dlp: ${ytdlpErr.slice(0, 150)} | fallback: ${raw.slice(0, 100)}` }, { status: 500 });
    }
  }

  if (info.isLive) {
    return NextResponse.json({
      isLive: true, hlsUrl: info.hlsUrl,
      title: info.title, author: info.author, thumbnail: info.thumbnail, duration: 0,
    });
  }

  return NextResponse.json({
    isLive: false, url: info.url, mimeType: info.mimeType,
    title: info.title, author: info.author, thumbnail: info.thumbnail,
    duration: info.durationSeconds,
  });
}
