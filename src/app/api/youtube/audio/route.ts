import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { verifyMeetAddonToken } from "@/lib/meet-addon-token";
import { getAppSetting } from "@/lib/app-settings";
import ytdl from "@distube/ytdl-core";

export const dynamic = "force-dynamic";
export const runtime  = "nodejs";

function buildOpts(cookies?: string | null) {
  return {
    requestOptions: {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        ...(cookies ? { cookie: cookies } : {}),
      },
    },
  };
}

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

  try {
    const cookies = await getAppSetting("YOUTUBE_COOKIES");

    const infoPromise = ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`, buildOpts(cookies));
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("YouTube response timeout. Dobara try karo.")), 15_000)
    );
    const info    = await Promise.race([infoPromise, timeout]);
    const details = info.videoDetails;

    const title     = details.title;
    const author    = details.author.name;
    const thumbnail = details.thumbnails.at(-1)?.url
      ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    const isLiveNow = (details as { liveBroadcastDetails?: { isLiveNow?: boolean } })
      .liveBroadcastDetails?.isLiveNow === true;

    if (isLiveNow) {
      const hlsFormat = info.formats.find(f => f.isHLS && f.url);
      if (!hlsFormat?.url) {
        return NextResponse.json({ error: "Live stream format not available" }, { status: 404 });
      }
      return NextResponse.json({ isLive: true, hlsUrl: hlsFormat.url, title, author, thumbnail, duration: 0 });
    }

    const audioFormats = ytdl.filterFormats(info.formats, "audioonly");
    if (!audioFormats.length) {
      return NextResponse.json({ error: "No audio format found" }, { status: 404 });
    }

    const sorted = audioFormats.sort((a, b) => (b.audioBitrate ?? 0) - (a.audioBitrate ?? 0));
    const best   = sorted.find(f => f.mimeType?.includes("webm")) ?? sorted[0];

    return NextResponse.json({
      isLive:   false,
      url:      best.url,
      mimeType: best.mimeType ?? "audio/webm",
      title, author, thumbnail,
      duration: parseInt(details.lengthSeconds, 10),
    });
  } catch (err) {
    const raw = err instanceof Error ? err.message : "Unknown error";
    console.error("[youtube/audio] videoId:", videoId, "→", raw);

    const msg = raw.toLowerCase().includes("sign in") || raw.toLowerCase().includes("bot")
      ? "YouTube bot-detection active hai. Admin → AI Settings mein YouTube Cookies configure karo."
      : raw.includes("timeout") || raw.includes("Timeout")
        ? "YouTube response timeout. Dobara try karo."
        : raw.slice(0, 200);

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
