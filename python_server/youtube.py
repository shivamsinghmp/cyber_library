"""
YouTube stream extraction via yt-dlp Python library.
Replaces the Node.js subprocess approach — no shell spawning, no PATH issues.
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any

log = logging.getLogger(__name__)

# Thread pool for blocking yt-dlp calls (yt-dlp is sync-only)
_pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix="ytdlp")


def _run_ytdlp(video_id: str, cookies: str | None) -> dict[str, Any]:
    try:
        import yt_dlp  # lazy import so server starts even if not installed
    except ImportError:
        raise RuntimeError("yt-dlp not installed — run: pip install yt-dlp")

    url = f"https://www.youtube.com/watch?v={video_id}"

    ydl_opts: dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "format": "bestaudio/best",
        "extractor_args": {"youtube": {"skip": ["dash", "hls"]}},
    }
    if cookies and cookies.strip():
        ydl_opts["http_headers"] = {
            "Cookie": cookies.strip(),
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)

    if not info:
        raise RuntimeError("yt-dlp returned no info")

    title     = info.get("title")     or "Unknown Track"
    author    = info.get("uploader")  or info.get("channel") or "Unknown"
    thumbnail = info.get("thumbnail") or f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
    duration  = info.get("duration")  or 0
    is_live   = bool(info.get("is_live"))

    if is_live:
        return {
            "title": title, "author": author, "thumbnail": thumbnail,
            "durationSeconds": 0, "isLive": True,
            "hlsUrl": info.get("manifest_url"),
        }

    # Pick best audio-only format (no video stream)
    formats = info.get("formats") or []
    audio_fmts = [
        f for f in formats
        if f.get("vcodec") == "none"
        and f.get("acodec") not in (None, "none")
        and f.get("url")
    ]
    audio_fmts.sort(key=lambda f: (f.get("abr") or f.get("tbr") or 0), reverse=True)

    if not audio_fmts:
        # Fallback: use top-level url if present
        if info.get("url"):
            return {
                "title": title, "author": author, "thumbnail": thumbnail,
                "durationSeconds": duration, "isLive": False,
                "url": info["url"], "mimeType": "audio/webm",
            }
        raise RuntimeError("No audio-only format found for this video")

    best = next((f for f in audio_fmts if f.get("ext") == "webm"), audio_fmts[0])
    ext  = best.get("ext", "mp4")
    mime = "audio/webm" if ext == "webm" else f"audio/{ext}"

    return {
        "title": title, "author": author, "thumbnail": thumbnail,
        "durationSeconds": duration, "isLive": False,
        "url": best["url"], "mimeType": mime,
    }


async def get_stream_info(video_id: str, cookies: str | None = None) -> dict[str, Any]:
    """Async wrapper — runs blocking yt-dlp in a thread pool."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_pool, _run_ytdlp, video_id, cookies)
