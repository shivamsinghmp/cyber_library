import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { verifyMeetAddonToken } from "@/lib/meet-addon-token";
import ytdl from "@distube/ytdl-core";

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

  const YTDL_OPTS = {
    requestOptions: {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    },
  };

  try {
    const infoPromise = ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`, YTDL_OPTS);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("YouTube ne respond nahi kiya. Dobara try karo.")), 15_000)
    );
    const info    = await Promise.race([infoPromise, timeout]);
    const details = info.videoDetails;

    const title     = details.title;
    const author    = details.author.name;
    const thumbnail =
      details.thumbnails.at(-1)?.url ??
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    const isLiveNow = (details as { liveBroadcastDetails?: { isLiveNow?: boolean } })
      .liveBroadcastDetails?.isLiveNow === true;

    if (isLiveNow) {
      const hlsFormat = info.formats.find(f => f.isHLS && f.url);
      if (!hlsFormat?.url) {
        return NextResponse.json({ error: "Live stream format not available" }, { status: 404 });
      }
      return NextResponse.json({ isLive: true, hlsUrl: hlsFormat.url, title, author, thumbnail, duration: 0 });
    }

    // VOD: pick best audio-only format
    const audioFormats = ytdl.filterFormats(info.formats, "audioonly");
    if (audioFormats.length === 0) {
      return NextResponse.json({ error: "No audio format found" }, { status: 404 });
    }

    const sorted = audioFormats.sort((a, b) => (b.audioBitrate ?? 0) - (a.audioBitrate ?? 0));
    // Prefer webm/opus (better compression); fall back to whatever is highest bitrate
    const best = sorted.find(f => f.mimeType?.includes("webm")) ?? sorted[0];

    return NextResponse.json({
      isLive:   false,
      url:      best.url,
      mimeType: best.mimeType ?? "audio/webm",
      title,
      author,
      thumbnail,
      duration: parseInt(details.lengthSeconds, 10),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get stream";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
