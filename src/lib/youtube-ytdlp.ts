/**
 * YouTube stream info via Python server's /youtube/info endpoint.
 * Previously spawned yt-dlp as a subprocess; now delegates to Python
 * where yt-dlp runs as a native library (faster, no PATH issues, no shell injection).
 */

const PYTHON_URL    = process.env.PYTHON_SERVER_URL    ?? "http://localhost:8001";
const PYTHON_SECRET = process.env.PYTHON_SERVER_SECRET ?? "";

export type YtDlpStreamInfo = {
  title:           string;
  author:          string;
  thumbnail:       string;
  durationSeconds: number;
  isLive:          boolean;
  url?:            string;
  mimeType?:       string;
  hlsUrl?:         string;
};

export async function getYTStreamInfoViaYtDlp(
  videoId: string,
  cookies?: string | null,
): Promise<YtDlpStreamInfo> {
  const res = await fetch(`${PYTHON_URL}/youtube/info`, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${PYTHON_SECRET}`,
      "Content-Type":  "application/json",
    },
    body:   JSON.stringify({ videoId, cookies: cookies ?? null }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "extraction failed");
    throw new Error(text.slice(0, 300));
  }

  return res.json() as Promise<YtDlpStreamInfo>;
}
