import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const PYTHON = process.platform === "win32" ? "python" : "python3";

interface YtDlpFormat {
  url:     string;
  ext:     string;
  acodec?: string;
  vcodec?: string;
  abr?:    number;
  tbr?:    number;
}

interface YtDlpInfo {
  title:        string;
  uploader?:    string;
  channel?:     string;
  duration?:    number;
  thumbnail?:   string;
  is_live?:     boolean;
  formats?:     YtDlpFormat[];
  manifest_url?: string;
}

export type YtDlpStreamInfo = {
  title:          string;
  author:         string;
  thumbnail:      string;
  durationSeconds: number;
  isLive:         boolean;
  url?:           string;
  mimeType?:      string;
  hlsUrl?:        string;
};

export async function getYTStreamInfoViaYtDlp(videoId: string): Promise<YtDlpStreamInfo> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const cmd = `${PYTHON} -m yt_dlp --dump-json --no-playlist --no-warnings "${url}"`;

  const { stdout } = await execAsync(cmd, { timeout: 25_000 });

  // yt-dlp may print warnings before the JSON line
  const jsonLine = stdout.split("\n").find(l => l.trim().startsWith("{"));
  if (!jsonLine) throw new Error("yt-dlp returned no JSON");

  const info: YtDlpInfo = JSON.parse(jsonLine);

  const title          = info.title          ?? "Unknown Track";
  const author         = info.uploader       ?? info.channel ?? "Unknown";
  const thumbnail      = info.thumbnail      ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const durationSeconds = info.duration      ?? 0;
  const isLive         = !!info.is_live;

  if (isLive) {
    return { title, author, thumbnail, durationSeconds: 0, isLive: true, hlsUrl: info.manifest_url };
  }

  const audioFormats = (info.formats ?? [])
    .filter(f => f.vcodec === "none" && f.acodec && f.acodec !== "none" && f.url)
    .sort((a, b) => (b.abr ?? b.tbr ?? 0) - (a.abr ?? a.tbr ?? 0));

  if (!audioFormats.length) throw new Error("No audio format found via yt-dlp");

  const best     = audioFormats.find(f => f.ext === "webm") ?? audioFormats[0];
  const mimeType = best.ext === "webm" ? "audio/webm" : `audio/${best.ext}`;

  return { title, author, thumbnail, durationSeconds, isLive: false, url: best.url, mimeType };
}
