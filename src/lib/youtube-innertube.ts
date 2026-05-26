/**
 * YouTube InnerTube API — ANDROID client context.
 * Uses the same internal API as yt-dlp to bypass YouTube's bot-detection.
 * Works without cookies for non-restricted content (study music, lofi, etc.).
 */

const ANDROID_VERSION = "17.36.4";
const INNERTUBE_URL   = "https://www.youtube.com/youtubei/v1/player?prettyPrint=false";

type ITFormat = {
  itag?: number;
  url?: string;
  mimeType?: string;
  bitrate?: number;
  contentLength?: string;
  approxDurationMs?: string;
};

type ITResponse = {
  playabilityStatus?: { status: string; reason?: string };
  streamingData?: {
    adaptiveFormats?: ITFormat[];
    formats?: ITFormat[];
    hlsManifestUrl?: string;
  };
  videoDetails?: {
    title?: string;
    author?: string;
    lengthSeconds?: string;
    isLive?: boolean;
    isLiveContent?: boolean;
    liveBroadcastDetails?: { isLiveNow?: boolean };
    thumbnail?: { thumbnails?: { url: string; width: number; height: number }[] };
  };
};

export type YTStreamInfo = {
  title: string;
  author: string;
  thumbnail: string;
  durationSeconds: number;
  isLive: boolean;
  hlsUrl?: string;
  url?: string;
  mimeType?: string;
  contentLength?: string | null;
};

export async function getYTStreamInfo(
  videoId: string,
  cookies?: string | null,
  signal?: AbortSignal,
): Promise<YTStreamInfo> {
  const headers: Record<string, string> = {
    "Content-Type":            "application/json",
    "User-Agent":              `com.google.android.youtube/${ANDROID_VERSION} (Linux; U; Android 11) gzip`,
    "X-YouTube-Client-Name":   "3",
    "X-YouTube-Client-Version": ANDROID_VERSION,
    "Accept-Language":         "en-US,en;q=0.9",
    ...(cookies ? { Cookie: cookies } : {}),
  };

  const res = await fetch(INNERTUBE_URL, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({
      videoId,
      context: {
        client: {
          clientName:        "ANDROID",
          clientVersion:     ANDROID_VERSION,
          androidSdkVersion: 30,
          hl:                "en",
          gl:                "US",
          utcOffsetMinutes:  0,
        },
      },
    }),
  });

  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);

  const data = await res.json() as ITResponse;
  const ps   = data.playabilityStatus;

  if (ps?.status === "LOGIN_REQUIRED") {
    throw new Error("Age-restricted video — configure YOUTUBE_COOKIES in Admin → AI Settings.");
  }
  if (ps?.status === "ERROR" || ps?.status === "UNPLAYABLE") {
    throw new Error(ps.reason ?? `Video ${ps.status}`);
  }
  if (ps?.status !== "OK") {
    throw new Error(`YouTube status: ${ps?.status ?? "unknown"}`);
  }

  const d         = data.videoDetails ?? {};
  const title     = d.title  ?? "Unknown Track";
  const author    = d.author ?? "Unknown";
  const thumbnail = d.thumbnail?.thumbnails?.at(-1)?.url
    ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const durationSeconds = parseInt(d.lengthSeconds ?? "0", 10);
  const isLive = !!(d.isLive || d.isLiveContent || d.liveBroadcastDetails?.isLiveNow);

  if (isLive) {
    return {
      title, author, thumbnail,
      durationSeconds: 0,
      isLive:  true,
      hlsUrl: data.streamingData?.hlsManifestUrl,
    };
  }

  const all = [
    ...(data.streamingData?.adaptiveFormats ?? []),
    ...(data.streamingData?.formats ?? []),
  ].filter(f => f.url && f.mimeType?.startsWith("audio/"))
   .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0));

  if (!all.length) throw new Error("No audio format found for this video");

  const best = all.find(f => f.mimeType?.includes("webm")) ?? all[0];

  return {
    title, author, thumbnail, durationSeconds, isLive: false,
    url:           best.url!,
    mimeType:      best.mimeType!,
    contentLength: best.contentLength ?? null,
  };
}
