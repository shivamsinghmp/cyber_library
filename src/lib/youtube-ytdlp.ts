import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const IS_WIN = process.platform === "win32";

function buildArgs(videoId: string, cookies?: string | null): { bin: string; args: string[] } {
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const cookieArgs = cookies?.trim()
    ? ["--add-header", `Cookie:${cookies.trim()}`]
    : [];

  if (IS_WIN) {
    return {
      bin:  "python",
      args: ["-m", "yt_dlp", "--dump-json", "--no-playlist", "--no-warnings", ...cookieArgs, ytUrl],
    };
  }

  const nodeBin = process.execPath;
  return {
    bin:  "/usr/local/bin/yt-dlp",
    args: [
      "--dump-json", "--no-playlist", "--no-warnings",
      "--js-runtimes", `nodejs:${nodeBin}`,
      ...cookieArgs,
      ytUrl,
    ],
  };
}

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

export async function getYTStreamInfoViaYtDlp(
  videoId: string,
  cookies?: string | null,
): Promise<YtDlpStreamInfo> {
  const { bin, args } = buildArgs(videoId, cookies);

  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(bin, args, { timeout: 30_000 }));
  } catch (e: unknown) {
    const stderr = (e as { stderr?: string }).stderr ?? (e as Error).message;
    throw new Error(stderr.trim().slice(0, 300));
  }

  const jsonLine = stdout.split("\n").find(l => l.trim().startsWith("{"));
  if (!jsonLine) throw new Error("yt-dlp returned no JSON output");

  const info: YtDlpInfo = JSON.parse(jsonLine);

  const title           = info.title     ?? "Unknown Track";
  const author          = info.uploader  ?? info.channel ?? "Unknown";
  const thumbnail       = info.thumbnail ?? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const durationSeconds = info.duration  ?? 0;
  const isLive          = !!info.is_live;

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
