import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { verifyMeetAddonToken } from "@/lib/meet-addon-token";
import ytdl from "@distube/ytdl-core";

export const dynamic = "force-dynamic";
export const runtime  = "nodejs";

// Module-level cache — persists across requests in the same PM2 process.
// YouTube audio URLs are valid ~6h; we cache for 4h to stay safe.
const streamCache = new Map<string, {
  url:           string;
  mimeType:      string;
  contentLength: string | null;
  expiresAt:     number;
}>();

async function resolveStreamUrl(videoId: string, force = false) {
  const hit = streamCache.get(videoId);
  if (!force && hit && Date.now() < hit.expiresAt) return hit;

  const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
  const formats = ytdl.filterFormats(info.formats, "audioonly");
  if (!formats.length) throw new Error("No audio-only format found");

  const sorted = formats.sort((a, b) => (b.audioBitrate ?? 0) - (a.audioBitrate ?? 0));
  // Prefer webm/opus; fall back to highest-bitrate format
  const best = sorted.find(f => f.mimeType?.includes("webm")) ?? sorted[0];

  const entry = {
    url:           best.url,
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

  // Auth via header OR ?token= query param.
  // <audio src="..."> cannot set request headers, so token goes in query string.
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

  const fetchWithRange = async (url: string) =>
    fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        ...(rangeHeader ? { Range: rangeHeader } : {}),
      },
    });

  try {
    let { url, mimeType } = await resolveStreamUrl(videoId);
    let upstream = await fetchWithRange(url);

    // If URL is stale (403/410), clear cache and retry once with a fresh URL
    if (upstream.status === 403 || upstream.status === 410) {
      streamCache.delete(videoId);
      ({ url, mimeType } = await resolveStreamUrl(videoId, true));
      upstream = await fetchWithRange(url);
    }

    if (!upstream.ok && upstream.status !== 206) {
      return new Response("Stream unavailable", { status: 502 });
    }

    return buildProxyResponse(upstream, mimeType);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Stream failed";
    return new Response(msg, { status: 500 });
  }
}
