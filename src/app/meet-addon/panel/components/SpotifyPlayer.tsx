"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Play, Pause, SkipForward, SkipBack,
  Search, Plus, Trash2, ListMusic, Loader2, ChevronUp, Music2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── YouTube IFrame API types ───────────────────────────────────────────────────
declare global {
  interface Window {
    YT: {
      Player: new (el: string | HTMLElement, opts: YTOpts) => YTPlayer;
      PlayerState: { ENDED: 0; PLAYING: 1; PAUSED: 2; BUFFERING: 3; CUED: 5 };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}
interface YTOpts {
  height?: string | number; width?: string | number; videoId?: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (e: { target: YTPlayer }) => void;
    onStateChange?: (e: { data: number }) => void;
    onError?: (e: { data: number }) => void;
  };
}
interface YTPlayer {
  loadVideoById(videoId: string): void;
  playVideo(): void; pauseVideo(): void;
  seekTo(sec: number, allowSeek: boolean): void;
  getCurrentTime(): number; getDuration(): number; getPlayerState(): number;
  getVideoData(): { title: string; author: string };
  destroy(): void;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface SearchResult { videoId: string; title: string; channel: string; thumbnail: string }
interface PlaylistItem { videoId: string; title: string; thumbnail: string }

// ── Constants ─────────────────────────────────────────────────────────────────
const YT_STORAGE_KEY = "vl_yt_music_url";
const PLAYLIST_KEY   = "vl_custom_music_playlist";
const DEFAULT_VIDEO  = "5qap5aO4i9A";

const YT_PRESETS = [
  { label: "Lofi Girl",    emoji: "🎵", desc: "Beats to relax/study to",  videoId: "5qap5aO4i9A" },
  { label: "Slow+Reverb",  emoji: "🌊", desc: "Slowed reverb chill mix",   videoId: "iq4DlfEk0ys" },
  { label: "Study Beats",  emoji: "📚", desc: "3h instrumental focus",     videoId: "DWcJFNfaw9c" },
  { label: "Piano Focus",  emoji: "🎹", desc: "Peaceful piano study",      videoId: "HoU8gfVd3Qo" },
  { label: "Jazz Cafe",    emoji: "🎷", desc: "Jazz & bossa nova",         videoId: "Dx5qFachd3A" },
  { label: "Deep Ambient", emoji: "🌌", desc: "Space ambient for focus",   videoId: "77ZozI0rw7w" },
];

function ytThumb(id: string) { return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`; }
function fmtTime(sec: number) {
  const s = Math.floor(Math.max(0, sec));
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

// ── Equalizer bars ────────────────────────────────────────────────────────────
function EqBars({ playing, count = 4, color = "#ef4444", size = "sm" }: {
  playing: boolean; count?: number; color?: string; size?: "sm" | "md" | "lg";
}) {
  const h = size === "lg" ? "h-10" : size === "md" ? "h-6" : "h-5";
  return (
    <div className={`flex items-end gap-[3px] ${h}`}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div key={i}
          style={{ background: color, minHeight: 3, borderRadius: 99, flex: 1 }}
          animate={playing ? { height: ["20%","100%","45%","80%","20%"] } : { height: "15%" }}
          transition={playing ? { duration: 0.65, repeat: Infinity, delay: i * 0.16, ease: "easeInOut" } : { duration: 0.3 }}
        />
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
type Tab   = "presets" | "search" | "playlist";
type Props = { isOpen: boolean; onClose: () => void; onOpen: () => void; onPlayingChange?: (playing: boolean) => void };

export function SpotifyPlayer({ isOpen, onClose, onOpen, onPlayingChange }: Props) {
  const ytPlayerRef     = useRef<YTPlayer | null>(null);
  const plCtxRef        = useRef<{ items: PlaylistItem[]; index: number } | null>(null);
  const progressRef     = useRef<HTMLDivElement>(null);
  const currentVideoRef = useRef<string>(DEFAULT_VIDEO);

  const [isPlaying,   setIsPlaying]   = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isReady,     setIsReady]     = useState(false);
  const [trackTitle,  setTrackTitle]  = useState("");
  const [channel,     setChannel]     = useState("");
  const [thumbnail,   setThumbnail]   = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [streamError, setStreamError] = useState("");

  const [tab,          setTab]          = useState<Tab>("presets");
  const [activePreset, setActivePreset] = useState("Lofi Girl");
  const [plIdx,        setPlIdx]        = useState(-1);

  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState("");

  const [playlist, setPlaylist] = useState<PlaylistItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(PLAYLIST_KEY) ?? "[]") as PlaylistItem[]; } catch { return []; }
  });
  const savePlaylist = (items: PlaylistItem[]) => {
    setPlaylist(items);
    try { localStorage.setItem(PLAYLIST_KEY, JSON.stringify(items)); } catch {}
  };

  // ── Poll currentTime while playing ────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      const t = ytPlayerRef.current?.getCurrentTime() ?? 0;
      setCurrentTime(t);
    }, 500);
    return () => clearInterval(id);
  }, [isPlaying]);

  // ── Load video into IFrame player ─────────────────────────────────────────
  const loadVideo = useCallback((videoId: string, knownTitle?: string, knownThumb?: string) => {
    currentVideoRef.current = videoId;
    setStreamError("");
    setCurrentTime(0);
    setDuration(0);
    setIsBuffering(true);
    setThumbnail(knownThumb ?? ytThumb(videoId));
    if (knownTitle) setTrackTitle(knownTitle);
    setChannel("");
    ytPlayerRef.current?.loadVideoById(videoId);
    try { localStorage.setItem(YT_STORAGE_KEY, videoId); } catch {}
  }, []);

  const loadVideoRef = useRef(loadVideo);
  useEffect(() => { loadVideoRef.current = loadVideo; }, [loadVideo]);

  // ── IFrame player state change handler ────────────────────────────────────
  const onStateChangeRef = useRef<(e: { data: number }) => void>(() => {});
  useEffect(() => {
    onStateChangeRef.current = (e: { data: number }) => {
      const S = window.YT?.PlayerState;
      if (!S) return;
      if (e.data === S.PLAYING) {
        setIsPlaying(true); setIsBuffering(false); setStreamError("");
        onPlayingChange?.(true);
        // Grab metadata from player after playback starts
        const d = ytPlayerRef.current?.getVideoData();
        if (d?.title) setTrackTitle(d.title);
        if (d?.author) setChannel(d.author);
        const dur = ytPlayerRef.current?.getDuration() ?? 0;
        if (dur > 0 && isFinite(dur)) setDuration(dur);
      } else if (e.data === S.PAUSED) {
        setIsPlaying(false); onPlayingChange?.(false);
      } else if (e.data === S.BUFFERING) {
        setIsBuffering(true);
      } else if (e.data === S.ENDED) {
        setIsPlaying(false); onPlayingChange?.(false);
        if (plCtxRef.current) {
          const { items, index } = plCtxRef.current;
          if (index < items.length - 1) {
            const next = index + 1;
            plCtxRef.current = { items, index: next };
            setPlIdx(next);
            loadVideoRef.current(items[next].videoId, items[next].title, items[next].thumbnail);
          } else { plCtxRef.current = null; setPlIdx(-1); }
        }
      }
    };
  }, [onPlayingChange]);

  // ── Mount: load YouTube IFrame API & create player ────────────────────────
  useEffect(() => {
    let destroyed = false;

    const createPlayer = () => {
      if (destroyed || ytPlayerRef.current) return;
      ytPlayerRef.current = new window.YT.Player("yt-iframe-host", {
        height: "1", width: "1",
        playerVars: { autoplay: 1, controls: 0, playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3 },
        events: {
          onReady: () => {
            if (destroyed) return;
            setIsReady(true);
            let vid = DEFAULT_VIDEO;
            try { const s = localStorage.getItem(YT_STORAGE_KEY); if (s) vid = s; } catch {}
            loadVideoRef.current(vid);
          },
          onStateChange: (e) => onStateChangeRef.current(e),
          onError: () => {
            setIsBuffering(false); setIsPlaying(false); onPlayingChange?.(false);
            setStreamError("Video unavailable — dobara try karo");
          },
        },
      });
    };

    if (window.YT?.Player) {
      createPlayer();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); createPlayer(); };
      if (!document.getElementById("yt-api-script")) {
        const s = document.createElement("script");
        s.id  = "yt-api-script";
        s.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(s);
      }
    }

    return () => {
      destroyed = true;
      ytPlayerRef.current?.destroy();
      ytPlayerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Controls ──────────────────────────────────────────────────────────────
  const togglePlay = () => {
    const p = ytPlayerRef.current; if (!p) return;
    isPlaying ? p.pauseVideo() : p.playVideo();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const p = ytPlayerRef.current; if (!p || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    p.seekTo(pct * duration, true);
    setCurrentTime(pct * duration);
  };

  const playVideo = useCallback((videoId: string, title: string, thumb: string) => {
    setActivePreset(""); plCtxRef.current = null; setPlIdx(-1);
    loadVideo(videoId, title, thumb);
  }, [loadVideo]);

  const playFromPlaylist = useCallback((items: PlaylistItem[], index: number) => {
    const item = items[index];
    plCtxRef.current = { items, index };
    setPlIdx(index); setActivePreset("");
    loadVideo(item.videoId, item.title, item.thumbnail);
  }, [loadVideo]);

  const handlePreset = (p: typeof YT_PRESETS[number]) => {
    setActivePreset(p.label); plCtxRef.current = null; setPlIdx(-1);
    loadVideo(p.videoId, p.label, ytThumb(p.videoId));
  };

  const skipPrev = () => {
    if (plCtxRef.current && plCtxRef.current.index > 0)
      playFromPlaylist(plCtxRef.current.items, plCtxRef.current.index - 1);
    else { ytPlayerRef.current?.seekTo(0, true); setCurrentTime(0); }
  };

  const skipNext = () => {
    if (plCtxRef.current && plCtxRef.current.index < plCtxRef.current.items.length - 1)
      playFromPlaylist(plCtxRef.current.items, plCtxRef.current.index + 1);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault(); if (!query.trim()) return;
    setSearching(true); setSearchErr("");
    try {
      const res  = await fetch(`/api/youtube/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json() as { results?: SearchResult[]; error?: string };
      if (!res.ok) { setSearchErr(data.error ?? "Search failed"); setResults([]); }
      else         { setResults(data.results ?? []); }
    } catch { setSearchErr("Network error. Dobara try karo."); }
    finally  { setSearching(false); }
  };

  const addToPlaylist = (item: SearchResult) => {
    setPlaylist(prev => {
      if (prev.some(p => p.videoId === item.videoId)) return prev;
      const updated = [...prev, { videoId: item.videoId, title: item.title, thumbnail: item.thumbnail }];
      try { localStorage.setItem(PLAYLIST_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const removeFromPlaylist = (videoId: string) => {
    savePlaylist(playlist.filter(p => p.videoId !== videoId));
    if (plCtxRef.current) plCtxRef.current = { ...plCtxRef.current, items: playlist.filter(p => p.videoId !== videoId) };
  };

  const displayName = trackTitle || activePreset || "Study Music";
  const isLive      = isPlaying && duration === 0;
  const progress    = duration > 0 ? currentTime / duration : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Hidden YouTube IFrame — audio plays here, UI is our custom one */}
      <div style={{ position: "fixed", left: -9999, top: -9999, width: 1, height: 1, overflow: "hidden" }} aria-hidden>
        <div id="yt-iframe-host" />
      </div>

      {/* ── Full player popup ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -12 }}
            animate={{ opacity: 1, scale: 1,   y: 0    }}
            exit={{    opacity: 0, scale: 0.9,  y: -12  }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed top-4 right-16 z-[8999] w-[320px] rounded-2xl overflow-hidden flex flex-col"
            style={{ background: "#0a0a0a", boxShadow: "0 12px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07)", maxHeight: "92dvh" }}
          >
            {/* ── NOW PLAYING CARD ── */}
            <div className="relative flex-shrink-0 overflow-hidden" style={{ minHeight: 200 }}>
              {thumbnail && (
                <div className="absolute inset-0 scale-110"
                  style={{ backgroundImage: `url(${thumbnail})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(18px) brightness(0.35)" }}
                />
              )}
              <div className="absolute inset-0"
                style={{ background: thumbnail
                  ? "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.65) 100%)"
                  : "linear-gradient(135deg,#1a0a0a 0%,#0a0a1a 100%)" }}
              />
              <div className="relative z-10 flex items-center justify-between px-4 pt-3 pb-1">
                <div className="flex items-center gap-2">
                  <Music2 className="w-3.5 h-3.5 text-white/50" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Study Music</span>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="relative z-10 flex justify-center pt-3 pb-4">
                <div className="relative">
                  {thumbnail
                    ? (
                      <motion.div
                        animate={isPlaying ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="w-28 h-28 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
                        style={{ boxShadow: isPlaying ? "0 8px 32px rgba(239,68,68,0.4)" : "0 8px 32px rgba(0,0,0,0.6)" }}
                      >
                        <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                      </motion.div>
                    ) : (
                      <div className="w-28 h-28 rounded-2xl flex items-center justify-center border border-white/10"
                        style={{ background: "linear-gradient(135deg,#1f1f1f,#0f0f0f)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
                        <EqBars playing={isPlaying} count={5} color="#ef4444" size="lg" />
                      </div>
                    )
                  }
                  {isPlaying && thumbnail && (
                    <motion.div className="absolute inset-0 rounded-2xl border-2 border-red-500/40 pointer-events-none"
                      animate={{ scale: [1, 1.08], opacity: [0.5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                </div>
              </div>
              <div className="relative z-10 px-4 pb-4 text-center">
                <p className="text-sm font-bold text-white leading-tight truncate mb-0.5">{displayName}</p>
                {channel && <p className="text-[10px] text-white/40 truncate">{channel}</p>}
                {streamError && (
                  <div className="mt-2 mx-1 rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-left">
                    <p className="text-[10px] text-orange-300 leading-snug">{streamError}</p>
                    <button onClick={() => loadVideo(currentVideoRef.current)}
                      className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-orange-400 hover:text-orange-300 transition-colors">
                      ↺ Dobara try karo
                    </button>
                  </div>
                )}
                <div className="flex justify-center mt-2">
                  {streamError ? null : isBuffering
                    ? <span className="flex items-center gap-1 text-[9px] font-bold text-white/30 bg-white/5 px-2 py-0.5 rounded-full">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" /> Loading
                      </span>
                    : isLive
                      ? <span className="flex items-center gap-1 text-[9px] font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-2.5 py-0.5 rounded-full">
                          <motion.span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" animate={{ opacity: [1,0.2,1] }} transition={{ duration: 1.2, repeat: Infinity }} />
                          LIVE
                        </span>
                      : isPlaying
                        ? <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                            <EqBars playing count={3} color="#34d399" size="sm" /> Now Playing
                          </span>
                        : isReady
                          ? <span className="text-[9px] font-bold text-white/20 bg-white/5 px-2 py-0.5 rounded-full">Paused</span>
                          : <span className="text-[9px] font-bold text-white/20 bg-white/5 px-2 py-0.5 rounded-full">Starting…</span>
                  }
                </div>
              </div>
            </div>

            {/* ── PROGRESS BAR ── */}
            <div className="px-4 pt-3 pb-1 flex-shrink-0" style={{ background: "#0f0f0f" }}>
              <div ref={progressRef} onClick={handleSeek}
                className={`relative h-1.5 rounded-full bg-white/[0.08] overflow-hidden mb-1.5 ${duration > 0 ? "cursor-pointer hover:opacity-80" : ""}`}>
                {isLive
                  ? <motion.div className="h-full bg-red-500 rounded-full" animate={{ opacity: [1,0.4,1] }} transition={{ duration: 1.4, repeat: Infinity }} style={{ width: "100%" }} />
                  : <motion.div className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full" style={{ width: `${progress * 100}%` }} transition={{ duration: 0.8, ease: "linear" }} />
                }
                {duration > 0 && !isLive && (
                  <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md border border-white/20 pointer-events-none"
                    style={{ left: `calc(${progress * 100}% - 6px)` }} />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-white/30">{fmtTime(currentTime)}</span>
                <span className="text-[9px] font-mono text-white/30">{isLive ? "LIVE" : fmtTime(duration)}</span>
              </div>
            </div>

            {/* ── CONTROLS ── */}
            <div className="flex items-center justify-center gap-6 py-3 flex-shrink-0" style={{ background: "#0f0f0f" }}>
              <button onClick={skipPrev} disabled={!isReady}
                className="p-2 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-all disabled:opacity-20 active:scale-90">
                <SkipBack className="w-5 h-5" />
              </button>
              <button onClick={togglePlay} disabled={!isReady}
                className="w-14 h-14 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-40 active:scale-90"
                style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)", boxShadow: isPlaying ? "0 0 24px rgba(239,68,68,0.6), 0 4px 16px rgba(0,0,0,0.4)" : "0 4px 16px rgba(0,0,0,0.4)" }}>
                {isBuffering ? <Loader2 className="w-6 h-6 animate-spin" /> : isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>
              <button onClick={skipNext} disabled={!isReady}
                className="p-2 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-all disabled:opacity-20 active:scale-90">
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            {/* ── TABS ── */}
            <div className="flex border-t border-white/[0.06] flex-shrink-0" style={{ background: "#0a0a0a" }}>
              {(["presets","search","playlist"] as Tab[]).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 ${
                    tab === t ? "text-red-400 border-b-2 border-red-500 bg-red-500/5" : "text-white/25 hover:text-white/50"
                  }`}>
                  {t === "presets"  && "Presets"}
                  {t === "search"   && <><Search className="w-3 h-3" />Search</>}
                  {t === "playlist" && <><ListMusic className="w-3 h-3" />List{playlist.length > 0 && <span className="ml-0.5 bg-red-500 text-white rounded-full text-[7px] w-3.5 h-3.5 flex items-center justify-center shrink-0">{playlist.length}</span>}</>}
                </button>
              ))}
            </div>

            {/* ── TAB CONTENT ── */}
            <div className="overflow-y-auto flex-1 scrollbar-hide" style={{ background: "#0a0a0a", maxHeight: 220 }}>
              {tab === "presets" && (
                <div className="px-3 py-3 flex flex-wrap gap-2">
                  {YT_PRESETS.map(p => (
                    <button key={p.label} onClick={() => handlePreset(p)} title={p.desc}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold transition-all ${
                        activePreset === p.label
                          ? "border-red-500/60 bg-red-500/20 text-red-400 shadow-sm shadow-red-500/20"
                          : "border-white/[0.08] bg-white/[0.03] text-white/40 hover:bg-white/[0.08] hover:text-white/70 hover:border-white/15"
                      }`}>
                      <span className="text-sm">{p.emoji}</span> {p.label}
                    </button>
                  ))}
                </div>
              )}

              {tab === "search" && (
                <div className="flex flex-col">
                  <form onSubmit={handleSearch} className="flex gap-1.5 px-3 pt-3 pb-2">
                    <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                      placeholder="Lofi, jazz, piano, ambient..."
                      className="flex-1 min-w-0 rounded-xl bg-white/[0.05] border border-white/[0.08] px-3 py-1.5 text-xs text-white placeholder:text-white/20 outline-none focus:border-red-500/40 transition-colors"
                    />
                    <button type="submit" disabled={searching || !query.trim()}
                      className="shrink-0 rounded-xl px-3 py-1.5 bg-red-500 hover:bg-red-600 text-xs font-bold text-white transition-all disabled:opacity-40 flex items-center gap-1">
                      {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    </button>
                  </form>
                  {searchErr && <p className="px-3 pb-2 text-[10px] text-red-400">{searchErr}</p>}
                  {results.length === 0 && !searching && !searchErr && (
                    <p className="px-3 pb-3 text-[10px] text-white/15 text-center">Koi bhi music search karo</p>
                  )}
                  <div className="divide-y divide-white/[0.04]">
                    {results.map(r => (
                      <div key={r.videoId} className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] transition-colors group">
                        <img src={r.thumbnail} alt="" className="w-11 h-8 rounded-lg object-cover shrink-0 border border-white/[0.08]" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white/80 truncate leading-tight">{r.title}</p>
                          <p className="text-[9px] text-white/25 truncate">{r.channel}</p>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button onClick={() => playVideo(r.videoId, r.title, r.thumbnail)} disabled={!isReady}
                            className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20">
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => addToPlaylist(r)} disabled={playlist.some(p => p.videoId === r.videoId)}
                            className="p-1.5 rounded-lg text-white/30 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tab === "playlist" && (
                <div className="flex flex-col">
                  {playlist.length === 0
                    ? (
                      <div className="py-8 text-center text-white/15 text-xs px-4">
                        <ListMusic className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        Search mein + se songs add karo
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                          <button onClick={() => playFromPlaylist(playlist, 0)} disabled={!isReady}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors disabled:opacity-30">
                            <Play className="w-3 h-3" /> Play All
                          </button>
                          <button onClick={() => { savePlaylist([]); plCtxRef.current = null; setPlIdx(-1); }}
                            className="text-[10px] text-white/20 hover:text-red-400 transition-colors flex items-center gap-1">
                            <Trash2 className="w-3 h-3" /> Clear
                          </button>
                        </div>
                        <div className="divide-y divide-white/[0.04]">
                          {playlist.map((item, i) => (
                            <div key={item.videoId}
                              className={`flex items-center gap-2.5 px-3 py-2 transition-colors group ${plIdx === i ? "bg-red-500/[0.08]" : "hover:bg-white/[0.03]"}`}>
                              <div className="relative shrink-0">
                                <img src={item.thumbnail} alt="" className="w-11 h-8 rounded-lg object-cover border border-white/[0.08]" />
                                {plIdx === i && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
                                    <EqBars playing={isPlaying} count={3} color="#f87171" size="sm" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-semibold truncate leading-tight ${plIdx === i ? "text-red-400" : "text-white/70"}`}>{item.title}</p>
                                <p className="text-[9px] text-white/20">{i + 1} / {playlist.length}</p>
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button onClick={() => playFromPlaylist(playlist, i)} disabled={!isReady}
                                  className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20">
                                  <Play className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => removeFromPlaylist(item.videoId)}
                                  className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )
                  }
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating mini-player ──────────────────────────────────────────── */}
      <AnimatePresence>
        {(isPlaying || isBuffering) && !isOpen && (
          <motion.div
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed bottom-0 left-0 right-0 z-[8998]"
            style={{ background: "#0a0a0a", borderTop: "1px solid rgba(239,68,68,0.2)", boxShadow: "0 -4px 24px rgba(0,0,0,0.6)" }}>
            <div className="h-[2px] bg-white/[0.04]">
              {isLive
                ? <motion.div className="h-full bg-red-500" animate={{ opacity: [1,0.3,1] }} transition={{ duration: 1.4, repeat: Infinity }} style={{ width: "100%" }} />
                : <div className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-1000 ease-linear" style={{ width: `${progress * 100}%` }} />
              }
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer" onClick={onOpen}>
              {thumbnail
                ? (
                  <div className="relative shrink-0 w-10 h-10 rounded-xl overflow-hidden border border-white/10">
                    <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <EqBars playing={isPlaying} count={3} color="#f87171" size="sm" />
                    </div>
                  </div>
                ) : (
                  <div className="shrink-0 w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#1f0a0a,#0a0a1f)" }}>
                    <EqBars playing={isPlaying} count={3} color="#ef4444" size="sm" />
                  </div>
                )
              }
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white/90 truncate leading-tight">{displayName}</p>
                <p className="text-[9px] font-mono text-white/30 mt-0.5">
                  {isBuffering ? "Loading..." : isLive
                    ? <span className="text-red-400 font-bold not-italic">● LIVE</span>
                    : `${fmtTime(currentTime)} / ${fmtTime(duration)}`
                  }
                </p>
              </div>
              <button onClick={e => { e.stopPropagation(); togglePlay(); }} disabled={!isReady}
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white transition-all disabled:opacity-40 active:scale-90"
                style={{ background: "linear-gradient(135deg,#ef4444,#dc2626)", boxShadow: "0 2px 12px rgba(239,68,68,0.4)" }}>
                {isBuffering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
              </button>
              <ChevronUp className="w-3.5 h-3.5 text-white/15 shrink-0" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
