import { NextRequest } from "next/server";
import { getAppSetting } from "@/lib/app-settings";
import ytdl from "@distube/ytdl-core";

export const dynamic = "force-dynamic";
export const runtime  = "nodejs";

// Module-level cache — YouTube CDN URLs (with decoded `n` param) are valid ~6h; cache 4h.
const streamCache = new Map<string, {
  url:           string;
  mimeType:      string;
  contentLength: string | null;
  expiresAt:     number;
}>();

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

// ytdl.getInfo() decodes the YouTube `n` challenge parameter inside the CDN URL.
// Without this decoding the CDN returns 403. Raw InnerTube API calls don't do this.
async function resolveStreamUrl(videoId: string, cookies?: string | null, force = false) {
  const hit = streamCache.get(videoId);
  if (!force && hit && Date.now() < hit.expiresAt) return hit;

  const infoPromise = ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`, buildOpts(cookies));
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("ytdl timeout")), 15_000)
  );
  const info = await Promise.race([infoPromise, timeout]);

  const formats = ytdl.filterFormats(info.formats, "audioonly");
  if (!formats.length) throw new Error("No audio-only format found");

  const sorted = formats.sort((a, b) => (b.audioBitrate ?? 0) - (a.audioBitrate ?? 0));
  const best   = sorted.find(f => f.mimeType?.includes("webm")) ?? sorted[0];

  const entry = {
    url:           best.url,           // n-param already decoded by ytdl
    mimeType:      best.mimeType ?? "audio/webm",
    contentLength: best.contentLength ?? null,
    expiresAt:     Date.now() + 4 * 60 * 60 * 1000,
  };
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

    // CDN URL expired → clear cache, re-resolve, retry once
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

    const msg = raw.toLowerCase().includes("sign in") || raw.toLowerCase().includes("bot")
      ? "YouTube bot-detection active hai. Admin → AI Settings mein YouTube Cookies configure karo."
      : raw;
    return new Response(msg, { status: 500 });
  }
}
