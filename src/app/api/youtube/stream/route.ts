import { NextRequest } from "next/server";
import { getAppSetting } from "@/lib/app-settings";
import { getYTStreamInfoViaYtDlp } from "@/lib/youtube-ytdlp";
import { getYTStreamInfo } from "@/lib/youtube-innertube";

export const dynamic = "force-dynamic";
export const runtime  = "nodejs";

const streamCache = new Map<string, {
  url:           string;
  mimeType:      string;
  contentLength: string | null;
  expiresAt:     number;
}>();

async function resolveStreamUrl(videoId: string, cookies?: string | null, force = false) {
  const hit = streamCache.get(videoId);
  if (!force && hit && Date.now() < hit.expiresAt) return hit;

  let url: string;
  let mimeType: string;
  let contentLength: string | null = null;

  try {
    // yt-dlp primary — ANDROID_VR client, no bot-detection
    const info = await getYTStreamInfoViaYtDlp(videoId);
    if (!info.url) throw new Error("yt-dlp returned no URL");
    url       = info.url;
    mimeType  = info.mimeType ?? "audio/webm";
  } catch (e1) {
    console.warn("[youtube/stream] yt-dlp failed, trying InnerTube:", (e1 as Error).message);
    // InnerTube fallback
    const info = await getYTStreamInfo(videoId, cookies);
    if (!info.url) throw new Error("InnerTube returned no URL");
    url           = info.url;
    mimeType      = info.mimeType ?? "audio/webm";
    contentLength = info.contentLength ?? null;
  }

  const entry = { url, mimeType, contentLength, expiresAt: Date.now() + 4 * 60 * 60 * 1000 };
  streamCache.set(videoId, entry);
  return entry;
}

function buildProxyResponse(upstream: Response, mimeType: string): Response {
  const headers: Record<string, string> = {
    "Content-Type":  mimeType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-cache",
  };
  const cl = upstream.headers.get("Content-Length");
  const cr = upstream.headers.get("Content-Range");
  if (cl) headers["Content-Length"] = cl;
  if (cr) headers["Content-Range"]  = cr;
  return new Response(upstream.body, { status: upstream.status, headers });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get("videoId")?.trim();
  if (!videoId || !/^[a-zA-Z0-9_-]{8,15}$/.test(videoId)) {
    return new Response("Invalid videoId", { status: 400 });
  }

  const rangeHeader = request.headers.get("range");

  const fetchWithRange = (url: string) =>
    fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Referer":    "https://www.youtube.com/",
        "Origin":     "https://www.youtube.com",
        ...(rangeHeader ? { Range: rangeHeader } : {}),
      },
    });

  try {
    const cookies = await getAppSetting("YOUTUBE_COOKIES");

    let { url, mimeType } = await resolveStreamUrl(videoId, cookies);
    let upstream = await fetchWithRange(url);

    if (upstream.status === 403 || upstream.status === 410) {
      streamCache.delete(videoId);
      ({ url, mimeType } = await resolveStreamUrl(videoId, cookies, true));
      upstream = await fetchWithRange(url);
    }

    if (!upstream.ok && upstream.status !== 206) {
      console.error("[youtube/stream] CDN", upstream.status, "for", videoId);
      return new Response(`Stream unavailable (CDN ${upstream.status})`, { status: 502 });
    }

    return buildProxyResponse(upstream, mimeType);
  } catch (err) {
    const raw = err instanceof Error ? err.message : "Stream failed";
    console.error("[youtube/stream] videoId:", videoId, "→", raw);
    return new Response(raw.slice(0, 200), { status: 500 });
  }
}
