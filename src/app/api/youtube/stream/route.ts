import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { verifyMeetAddonToken } from "@/lib/meet-addon-token";
import { getAppSetting } from "@/lib/app-settings";
import { getYTStreamInfo } from "@/lib/youtube-innertube";

export const dynamic = "force-dynamic";
export const runtime  = "nodejs";

// Module-level URL cache — YouTube CDN URLs are valid ~6h; cache for 4h.
const streamCache = new Map<string, {
  url:           string;
  mimeType:      string;
  contentLength: string | null;
  expiresAt:     number;
}>();

async function resolveStreamUrl(videoId: string, cookies?: string | null, force = false) {
  const hit = streamCache.get(videoId);
  if (!force && hit && Date.now() < hit.expiresAt) return hit;

  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), 15_000);

  try {
    const info = await getYTStreamInfo(videoId, cookies, controller.signal);
    if (!info.url) throw new Error("No stream URL returned");

    const entry = {
      url:           info.url,
      mimeType:      info.mimeType ?? "audio/webm",
      contentLength: info.contentLength ?? null,
      expiresAt:     Date.now() + 4 * 60 * 60 * 1000,
    };
    streamCache.set(videoId, entry);
    return entry;
  } finally {
    clearTimeout(timer);
  }
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

  // Auth: header OR ?token= (audio element src can't set headers).
  const authHeader  = request.headers.get("authorization");
  const bearerToken =
    (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null) ??
    searchParams.get("token") ??
    null;

  const addonUser = bearerToken ? verifyMeetAddonToken(bearerToken) : null;
  if (!addonUser) {
    const session = await auth();
    if (!session?.user) return new Response("Unauthorized", { status: 401 });
  }

  const videoId = searchParams.get("videoId")?.trim();
  if (!videoId || !/^[a-zA-Z0-9_-]{8,15}$/.test(videoId)) {
    return new Response("Invalid videoId", { status: 400 });
  }

  const rangeHeader = request.headers.get("range");

  const fetchWithRange = (url: string) =>
    fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 11; Pixel 4 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Mobile Safari/537.36",
        "Referer":    "https://www.youtube.com/",
        "Origin":     "https://www.youtube.com",
        ...(rangeHeader ? { Range: rangeHeader } : {}),
      },
    });

  try {
    const cookies = await getAppSetting("YOUTUBE_COOKIES");

    let { url, mimeType } = await resolveStreamUrl(videoId, cookies);
    let upstream = await fetchWithRange(url);

    // CDN URL expired (403/410) → flush cache and re-resolve once
    if (upstream.status === 403 || upstream.status === 410) {
      streamCache.delete(videoId);
      ({ url, mimeType } = await resolveStreamUrl(videoId, cookies, true));
      upstream = await fetchWithRange(url);
    }

    if (!upstream.ok && upstream.status !== 206) {
      console.error("[youtube/stream] CDN error", upstream.status, "for", videoId);
      return new Response(`Stream unavailable (CDN ${upstream.status})`, { status: 502 });
    }

    return buildProxyResponse(upstream, mimeType);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Stream failed";
    console.error("[youtube/stream] Error for", videoId, ":", msg);
    return new Response(msg, { status: 500 });
  }
}
