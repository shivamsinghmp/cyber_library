"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Play, Pause, SkipForward, SkipBack, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── YouTube IFrame API types ───────────────────────────────────────────────────
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  nextVideo(): void;
  previousVideo(): void;
  getPlayerState(): number;
  getVideoData(): { title: string; author: string };
  loadVideoById(id: string): void;
  loadPlaylist(opts: { list: string; listType: string }): void;
  destroy(): void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, opts: object) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

// ── Data ──────────────────────────────────────────────────────────────────────
const YT_STORAGE_KEY  = "vl_yt_music_url";
const DEFAULT_VIDEO   = "5qap5aO4i9A";

const YT_PRESETS = [
  { label: "Lofi Girl",    emoji: "🎵", desc: "Beats to relax/study to",  videoId: "5qap5aO4i9A" },
  { label: "Slow+Reverb",  emoji: "🌊", desc: "Slowed reverb chill mix",   videoId: "iq4DlfEk0ys" },
  { label: "Study Beats",  emoji: "📚", desc: "3h instrumental focus",     videoId: "DWcJFNfaw9c" },
  { label: "Piano Focus",  emoji: "🎹", desc: "Peaceful piano study",      videoId: "HoU8gfVd3Qo" },
  { label: "Jazz Cafe",    emoji: "🎷", desc: "Jazz & bossa nova",         videoId: "Dx5qFachd3A" },
  { label: "Deep Ambient", emoji: "🌌", desc: "Space ambient for focus",   videoId: "77ZozI0rw7w" },
];

function parseYouTubeUrl(url: string): { videoId?: string; listId?: string } | null {
  try {
    const u = new URL(url.trim());
    let videoId: string | undefined;
    let listId:  string | undefined;
    if (u.hostname === "youtu.be") {
      videoId = u.pathname.slice(1).split("?")[0] || undefined;
    } else if (u.hostname.includes("youtube.com")) {
      videoId = u.searchParams.get("v")    || undefined;
      listId  = u.searchParams.get("list") || undefined;
    }
    if (!videoId && !listId) return null;
    return { videoId, listId };
  } catch { return null; }
}

// ── Component ─────────────────────────────────────────────────────────────────
type Props = { isOpen: boolean; onClose: () => void };

export function SpotifyPlayer({ isOpen, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef    = useRef<YTPlayer | null>(null);
  const readyRef     = useRef(false);

  const [isPlaying,   setIsPlaying]   = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [trackTitle,  setTrackTitle]  = useState("");
  const [activePreset,setActivePreset]= useState("Lofi Girl");
  const [apiReady,    setApiReady]    = useState(false);
  const [urlInput,    setUrlInput]    = useState("");
  const [urlError,    setUrlError]    = useState("");

  // ── Init YouTube IFrame API ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initPlayer = () => {
      if (!containerRef.current || playerRef.current) return;

      // Restore saved URL or fall back to default
      let videoId = DEFAULT_VIDEO;
      let listId: string | undefined;
      try {
        const saved = localStorage.getItem(YT_STORAGE_KEY);
        if (saved) {
          const p = parseYouTubeUrl(saved);
          if (p?.videoId) videoId = p.videoId;
          if (p?.listId)  listId  = p.listId;
        }
      } catch {}

      playerRef.current = new window.YT!.Player(containerRef.current, {
        width: 320,
        height: 180,
        videoId: listId ? undefined : videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          ...(listId ? { list: listId, listType: "playlist" } : {}),
        },
        events: {
          onReady: () => {
            readyRef.current = true;
            setApiReady(true);
          },
          onStateChange: (e: { data: number; target: YTPlayer }) => {
            setIsPlaying(e.data === 1);   // PLAYING
            setIsBuffering(e.data === 3); // BUFFERING
            if (e.data === 1) {
              // Title may not be available immediately — small delay
              setTimeout(() => {
                try {
                  const d = e.target.getVideoData();
                  if (d?.title) setTrackTitle(d.title);
                } catch {}
              }, 600);
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      // Chain onto any existing callback (e.g. if two players on same page)
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); initPlayer(); };
      if (!document.getElementById("yt-api-script")) {
        const s = document.createElement("script");
        s.id  = "yt-api-script";
        s.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(s);
      }
    }

    return () => {
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
      readyRef.current  = false;
    };
  }, []);

  const loadContent = useCallback((videoId?: string, listId?: string) => {
    if (!playerRef.current || !readyRef.current) return;
    if (listId)       playerRef.current.loadPlaylist({ list: listId, listType: "playlist" });
    else if (videoId) playerRef.current.loadVideoById(videoId);
  }, []);

  const handlePreset = (preset: (typeof YT_PRESETS)[number]) => {
    setActivePreset(preset.label);
    setUrlInput(`https://youtube.com/watch?v=${preset.videoId}`);
    setUrlError("");
    loadContent(preset.videoId);
    try { localStorage.setItem(YT_STORAGE_KEY, `https://youtube.com/watch?v=${preset.videoId}`); } catch {}
  };

  const handleCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseYouTubeUrl(urlInput);
    if (!parsed) { setUrlError("Valid YouTube URL daalo (video ya playlist)"); return; }
    setUrlError("");
    setActivePreset("");
    loadContent(parsed.videoId, parsed.listId);
    try { localStorage.setItem(YT_STORAGE_KEY, urlInput); } catch {}
  };

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) playerRef.current.pauseVideo();
    else           playerRef.current.playVideo();
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Hidden YT player — always mounted so audio continues when popup closes */}
      <div
        ref={containerRef}
        style={{ position: "fixed", top: -9999, left: -9999, width: 320, height: 180, pointerEvents: "none", zIndex: -1 }}
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: -10 }}
            animate={{ opacity: 1, scale: 1,    y: 0   }}
            exit={{    opacity: 0, scale: 0.85, y: -10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed top-4 right-16 z-[8999] w-[310px] rounded-2xl overflow-hidden"
            style={{ background: "#0F0F0F", boxShadow: "0 8px 40px rgba(255,0,0,0.18), 0 2px 8px rgba(0,0,0,0.6)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10" style={{ background: "#1a1a1a" }}>
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="#FF0000">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                <span className="text-xs font-bold text-white">Study Music</span>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Now Playing */}
            <div className="px-4 py-3 flex items-center gap-3" style={{ background: "#111" }}>
              {/* Animated bars */}
              <div className="flex items-end gap-[3px] h-7 w-7 shrink-0">
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="flex-1 rounded-full bg-red-500"
                    animate={isPlaying
                      ? { height: ["30%", "100%", "55%", "85%", "30%"] }
                      : { height: "12%" }}
                    transition={isPlaying
                      ? { duration: 0.75, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }
                      : { duration: 0.3 }}
                    style={{ minHeight: 3 }}
                  />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-0.5">
                  {isBuffering ? "Loading..." : isPlaying ? "Now Playing" : apiReady ? "Paused" : "Starting..."}
                </p>
                <p className="text-sm font-semibold text-white/90 truncate leading-tight">
                  {trackTitle || activePreset || "Study Music"}
                </p>
              </div>
            </div>

            {/* Playback controls */}
            <div className="flex items-center justify-center gap-5 py-3 border-t border-b border-white/5" style={{ background: "#111" }}>
              <button
                onClick={() => playerRef.current?.previousVideo()}
                disabled={!apiReady}
                className="p-2 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20"
                title="Previous"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={togglePlay}
                disabled={!apiReady}
                className="w-11 h-11 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 text-white transition-all disabled:opacity-40 shadow-lg shadow-red-500/30 active:scale-95"
              >
                {isPlaying
                  ? <Pause className="w-5 h-5" />
                  : <Play  className="w-5 h-5 ml-0.5" />}
              </button>
              <button
                onClick={() => playerRef.current?.nextVideo()}
                disabled={!apiReady}
                className="p-2 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20"
                title="Next"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Presets */}
            <div className="px-3 pt-2.5 pb-2" style={{ background: "#111" }}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/25 mb-1.5">Study Playlists</p>
              <div className="flex flex-wrap gap-1.5">
                {YT_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => handlePreset(p)}
                    title={p.desc}
                    className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all ${
                      activePreset === p.label
                        ? "border-red-500/50 bg-red-500/15 text-red-400"
                        : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white hover:border-white/20"
                    }`}
                  >
                    {p.emoji} {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom URL */}
            <form onSubmit={handleCustomUrl} className="px-3 pb-3 pt-2 border-t border-white/5" style={{ background: "#111" }}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/25 mb-1.5">Custom URL</p>
              <div className="flex gap-1.5">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="flex-1 min-w-0 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder:text-white/20 outline-none focus:border-red-500/50 transition-colors"
                />
                <button type="submit" className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white hover:opacity-80 transition-opacity" style={{ background: "#FF0000" }}>
                  Go
                </button>
                <button type="button" onClick={() => handlePreset(YT_PRESETS[0])} title="Reset to default" className="shrink-0 rounded-lg bg-white/5 border border-white/10 p-1.5 text-white/30 hover:text-white/60 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
              {urlError && <p className="mt-1 text-[10px] text-red-400">{urlError}</p>}
              <p className="mt-1.5 text-[9px] text-white/15">Koi bhi YouTube video ya playlist URL paste karo</p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
