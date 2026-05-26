"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Play, Pause, SkipForward, SkipBack, Search, Plus, Trash2, ListMusic, Loader2, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── YouTube IFrame API types ───────────────────────────────────────────────────
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  nextVideo(): void;
  previousVideo(): void;
  getPlayerState(): number;
  getVideoData(): { title: string; author: string };
  getCurrentTime(): number;
  getDuration(): number;
  loadVideoById(id: string): void;
  loadPlaylist(opts: { list: string; listType: string }): void;
  destroy(): void;
}

declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: object) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface SearchResult {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
}

interface PlaylistItem {
  videoId: string;
  title: string;
  thumbnail: string;
}

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

function ytThumb(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/default.jpg`;
}

function fmtTime(sec: number) {
  const s = Math.floor(sec);
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

// ── Component ─────────────────────────────────────────────────────────────────
type Tab  = "presets" | "search" | "playlist";
type Props = { isOpen: boolean; onClose: () => void; onOpen: () => void; onPlayingChange?: (playing: boolean) => void };

export function SpotifyPlayer({ isOpen, onClose, onOpen, onPlayingChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef    = useRef<YTPlayer | null>(null);
  const readyRef     = useRef(false);
  const plCtxRef     = useRef<{ items: PlaylistItem[]; index: number } | null>(null);

  // Player state
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [trackTitle,  setTrackTitle]  = useState("");
  const [thumbnail,   setThumbnail]   = useState<string | null>(null);
  const [apiReady,    setApiReady]    = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);

  // UI state
  const [tab,          setTab]          = useState<Tab>("presets");
  const [activePreset, setActivePreset] = useState("Lofi Girl");
  const [plIdx,        setPlIdx]        = useState(-1);

  // Search state
  const [query,      setQuery]      = useState("");
  const [results,    setResults]    = useState<SearchResult[]>([]);
  const [searching,  setSearching]  = useState(false);
  const [searchErr,  setSearchErr]  = useState("");

  // Custom playlist
  const [playlist, setPlaylist] = useState<PlaylistItem[]>(() => {
    try { return JSON.parse(localStorage.getItem(PLAYLIST_KEY) ?? "[]") as PlaylistItem[]; } catch { return []; }
  });

  const savePlaylist = (items: PlaylistItem[]) => {
    setPlaylist(items);
    try { localStorage.setItem(PLAYLIST_KEY, JSON.stringify(items)); } catch {}
  };

  // ── Init YouTube IFrame API ──────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const initPlayer = () => {
      if (!containerRef.current || playerRef.current) return;

      let videoId = DEFAULT_VIDEO;
      try {
        const saved = localStorage.getItem(YT_STORAGE_KEY);
        if (saved) videoId = saved;
      } catch {}

      playerRef.current = new window.YT!.Player(containerRef.current, {
        width: 320, height: 180,
        videoId,
        playerVars: { autoplay: 0, controls: 0, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => { readyRef.current = true; setApiReady(true); },
          onStateChange: (e: { data: number; target: YTPlayer }) => {
            const playing = e.data === 1;
            setIsPlaying(playing);
            onPlayingChange?.(playing);
            setIsBuffering(e.data === 3);
            if (e.data === 1) {
              setTimeout(() => {
                try {
                  const d = e.target.getVideoData();
                  if (d?.title) setTrackTitle(d.title);
                } catch {}
              }, 600);
            }
            // Auto-advance custom playlist on ENDED
            if (e.data === 0 && plCtxRef.current) {
              const { items, index } = plCtxRef.current;
              if (index < items.length - 1) {
                const next = index + 1;
                plCtxRef.current = { items, index: next };
                setPlIdx(next);
                setThumbnail(items[next].thumbnail);
                setTrackTitle(items[next].title);
                e.target.loadVideoById(items[next].videoId);
              } else {
                plCtxRef.current = null;
                setPlIdx(-1);
              }
            }
          },
        },
      });
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
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

  // ── Poll current time & duration while playing ────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      if (!playerRef.current || !readyRef.current) return;
      try {
        setCurrentTime(playerRef.current.getCurrentTime());
        setDuration(playerRef.current.getDuration());
      } catch {}
    }, 1000);
    return () => clearInterval(id);
  }, [isPlaying]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const playVideo = useCallback((videoId: string, title: string, thumb: string) => {
    if (!playerRef.current || !readyRef.current) return;
    playerRef.current.loadVideoById(videoId);
    setTrackTitle(title);
    setThumbnail(thumb);
    setActivePreset("");
    plCtxRef.current = null;
    setPlIdx(-1);
    try { localStorage.setItem(YT_STORAGE_KEY, videoId); } catch {}
  }, []);

  const playFromPlaylist = useCallback((items: PlaylistItem[], index: number) => {
    if (!playerRef.current || !readyRef.current) return;
    const item = items[index];
    plCtxRef.current = { items, index };
    setPlIdx(index);
    setThumbnail(item.thumbnail);
    setTrackTitle(item.title);
    setActivePreset("");
    playerRef.current.loadVideoById(item.videoId);
  }, []);

  const handlePreset = (p: (typeof YT_PRESETS)[number]) => {
    setActivePreset(p.label);
    plCtxRef.current = null;
    setPlIdx(-1);
    setThumbnail(ytThumb(p.videoId));
    if (playerRef.current && readyRef.current) {
      playerRef.current.loadVideoById(p.videoId);
      setTrackTitle(p.label);
    }
    try { localStorage.setItem(YT_STORAGE_KEY, p.videoId); } catch {}
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchErr("");
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("vl_meet_addon_token") : null;
      const res   = await fetch(`/api/youtube/search?q=${encodeURIComponent(query.trim())}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data  = await res.json() as { results?: SearchResult[]; error?: string };
      if (!res.ok) { setSearchErr(data.error ?? "Search failed"); setResults([]); }
      else          { setResults(data.results ?? []); }
    } catch {
      setSearchErr("Network error. Dobara try karo.");
    } finally {
      setSearching(false);
    }
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
    if (plCtxRef.current) {
      plCtxRef.current = { ...plCtxRef.current, items: playlist.filter(p => p.videoId !== videoId) };
    }
  };

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) playerRef.current.pauseVideo();
    else           playerRef.current.playVideo();
  };

  const displayName = trackTitle || activePreset || "Study Music";
  const isLive      = isPlaying && duration === 0;
  const progress    = duration > 0 ? currentTime / duration : 0;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Hidden YT player — always mounted so audio continues when popup closes.
          2×2 clip at corner: gives Chrome a non-zero viewport intersection so it
          doesn't suspend the nested iframe (off-screen + zIndex:-1 caused silent
          audio suspension inside Google Meet's sandboxed iframe context). */}
      <div style={{ position: "fixed", bottom: 0, left: 0, width: 2, height: 2, overflow: "hidden", pointerEvents: "none", zIndex: 1 }}>
        <div ref={containerRef} style={{ width: 320, height: 180 }} />
      </div>

      {/* ── Full player popup ───────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: -10 }}
            animate={{ opacity: 1, scale: 1,    y: 0   }}
            exit={{    opacity: 0, scale: 0.85, y: -10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed top-4 right-16 z-[8999] w-[340px] rounded-2xl overflow-hidden flex flex-col"
            style={{ background: "#0F0F0F", boxShadow: "0 8px 40px rgba(255,0,0,0.18), 0 2px 8px rgba(0,0,0,0.6)", maxHeight: "90dvh" }}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 flex-shrink-0" style={{ background: "#1a1a1a" }}>
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

            {/* ── Now Playing ── */}
            <div className="px-3 py-3 flex items-center gap-3 flex-shrink-0" style={{ background: "#111" }}>
              {thumbnail
                ? <img src={thumbnail} alt="" className="w-12 h-9 rounded-md object-cover shrink-0 border border-white/10" />
                : (
                  <div className="flex items-end gap-[3px] h-7 w-12 shrink-0">
                    {[0, 1, 2, 3].map((i) => (
                      <motion.div key={i} className="flex-1 rounded-full bg-red-500"
                        animate={isPlaying ? { height: ["30%","100%","55%","85%","30%"] } : { height: "12%" }}
                        transition={isPlaying ? { duration: 0.75, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" } : { duration: 0.3 }}
                        style={{ minHeight: 3 }}
                      />
                    ))}
                  </div>
                )}
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-0.5">
                  {isBuffering ? "Loading..." : isPlaying ? "Now Playing" : apiReady ? "Paused" : "Starting..."}
                </p>
                <p className="text-xs font-semibold text-white/90 truncate leading-tight">{displayName}</p>
              </div>
              {thumbnail && isPlaying && (
                <div className="flex items-end gap-[2px] h-5 shrink-0">
                  {[0, 1, 2].map((i) => (
                    <motion.div key={i} className="w-1 rounded-full bg-red-500"
                      animate={{ height: ["30%","100%","50%","30%"] }}
                      transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                      style={{ minHeight: 3 }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Progress bar (inside popup) ── */}
            {(isPlaying || currentTime > 0) && (
              <div className="flex-shrink-0" style={{ background: "#111" }}>
                <div className="flex items-center gap-2 px-3 pb-2">
                  <span className="text-[9px] font-mono text-white/30 w-8 text-right shrink-0">{fmtTime(currentTime)}</span>
                  <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                    {isLive
                      ? <motion.div className="h-full bg-red-500 rounded-full" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ width: "100%" }} />
                      : <div className="h-full bg-red-500 rounded-full transition-all duration-1000" style={{ width: `${progress * 100}%` }} />
                    }
                  </div>
                  <span className="text-[9px] font-mono text-white/30 w-8 shrink-0">
                    {isLive ? <span className="text-red-400 font-bold tracking-wide">LIVE</span> : fmtTime(duration)}
                  </span>
                </div>
              </div>
            )}

            {/* ── Controls ── */}
            <div className="flex items-center justify-center gap-5 py-2.5 border-t border-b border-white/5 flex-shrink-0" style={{ background: "#111" }}>
              <button onClick={() => {
                if (plCtxRef.current && plCtxRef.current.index > 0) {
                  playFromPlaylist(plCtxRef.current.items, plCtxRef.current.index - 1);
                } else {
                  playerRef.current?.previousVideo();
                }
              }} disabled={!apiReady} className="p-2 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20">
                <SkipBack className="w-4 h-4" />
              </button>
              <button onClick={togglePlay} disabled={!apiReady}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 text-white transition-all disabled:opacity-40 shadow-lg shadow-red-500/30 active:scale-95">
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <button onClick={() => {
                if (plCtxRef.current && plCtxRef.current.index < plCtxRef.current.items.length - 1) {
                  playFromPlaylist(plCtxRef.current.items, plCtxRef.current.index + 1);
                } else {
                  playerRef.current?.nextVideo();
                }
              }} disabled={!apiReady} className="p-2 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20">
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* ── Tabs ── */}
            <div className="flex border-b border-white/10 flex-shrink-0" style={{ background: "#1a1a1a" }}>
              {(["presets", "search", "playlist"] as Tab[]).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 ${
                    tab === t ? "text-red-400 border-b-2 border-red-500" : "text-white/30 hover:text-white/60"
                  }`}>
                  {t === "presets" && "Presets"}
                  {t === "search"  && <><Search className="w-3 h-3" /> Search</>}
                  {t === "playlist" && <><ListMusic className="w-3 h-3" /> Playlist {playlist.length > 0 && <span className="bg-red-500 text-white rounded-full text-[8px] w-3.5 h-3.5 flex items-center justify-center">{playlist.length}</span>}</>}
                </button>
              ))}
            </div>

            {/* ── Tab content ── */}
            <div className="overflow-y-auto flex-1" style={{ background: "#111" }}>

              {/* Presets tab */}
              {tab === "presets" && (
                <div className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {YT_PRESETS.map((p) => (
                      <button key={p.label} onClick={() => handlePreset(p)} title={p.desc}
                        className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all ${
                          activePreset === p.label
                            ? "border-red-500/50 bg-red-500/15 text-red-400"
                            : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white hover:border-white/20"
                        }`}>
                        {p.emoji} {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search tab */}
              {tab === "search" && (
                <div className="flex flex-col">
                  <form onSubmit={handleSearch} className="flex gap-1.5 px-3 pt-2.5 pb-2">
                    <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                      placeholder="Lofi study, jazz, piano..."
                      className="flex-1 min-w-0 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder:text-white/25 outline-none focus:border-red-500/50 transition-colors"
                    />
                    <button type="submit" disabled={searching || !query.trim()}
                      className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-opacity disabled:opacity-40 flex items-center gap-1"
                      style={{ background: "#FF0000" }}>
                      {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    </button>
                  </form>
                  {searchErr && <p className="px-3 pb-2 text-[10px] text-red-400">{searchErr}</p>}
                  {results.length === 0 && !searching && !searchErr && (
                    <p className="px-3 pb-3 text-[10px] text-white/20 text-center">Search karo — results yahan aayenge</p>
                  )}
                  <div className="divide-y divide-white/5">
                    {results.map((r) => (
                      <div key={r.videoId} className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors group">
                        <img src={r.thumbnail} alt="" className="w-12 h-9 rounded object-cover shrink-0 border border-white/10" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white/90 truncate leading-tight">{r.title}</p>
                          <p className="text-[10px] text-white/30 truncate">{r.channel}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => playVideo(r.videoId, r.title, r.thumbnail)} disabled={!apiReady}
                            title="Play" className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30">
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => addToPlaylist(r)} title="Playlist mein add karo"
                            disabled={playlist.some(p => p.videoId === r.videoId)}
                            className="p-1.5 rounded-lg text-white/40 hover:text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Playlist tab */}
              {tab === "playlist" && (
                <div className="flex flex-col">
                  {playlist.length === 0 ? (
                    <div className="py-8 text-center text-white/20 text-xs px-4">
                      <ListMusic className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Search mein koi bhi song ko <strong>+</strong> se add karo
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between px-3 pt-2 pb-1">
                        <button onClick={() => playFromPlaylist(playlist, 0)} disabled={!apiReady}
                          className="flex items-center gap-1.5 text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors disabled:opacity-30">
                          <Play className="w-3 h-3" /> Play All
                        </button>
                        <button onClick={() => { savePlaylist([]); plCtxRef.current = null; setPlIdx(-1); }}
                          className="text-[10px] text-white/20 hover:text-red-400 transition-colors flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> Clear All
                        </button>
                      </div>
                      <div className="divide-y divide-white/5">
                        {playlist.map((item, i) => (
                          <div key={item.videoId}
                            className={`flex items-center gap-2.5 px-3 py-2 transition-colors group ${plIdx === i ? "bg-red-500/10" : "hover:bg-white/5"}`}>
                            <div className="relative shrink-0">
                              <img src={item.thumbnail} alt="" className="w-12 h-9 rounded object-cover border border-white/10" />
                              {plIdx === i && isPlaying && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                                  <div className="flex items-end gap-[2px] h-4">
                                    {[0,1,2].map(j => (
                                      <motion.div key={j} className="w-0.5 rounded-full bg-red-400"
                                        animate={{ height: ["30%","100%","50%","30%"] }}
                                        transition={{ duration: 0.6, repeat: Infinity, delay: j * 0.15, ease: "easeInOut" }}
                                        style={{ minHeight: 2 }}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold truncate leading-tight ${plIdx === i ? "text-red-400" : "text-white/80"}`}>{item.title}</p>
                              <p className="text-[10px] text-white/25">{i + 1} / {playlist.length}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => playFromPlaylist(playlist, i)} disabled={!apiReady}
                                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30">
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
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating mini-player — visible when playing & popup is closed ── */}
      <AnimatePresence>
        {(isPlaying || isBuffering) && !isOpen && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0,  opacity: 1 }}
            exit={{    y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed bottom-0 left-0 right-0 z-[8998] select-none"
            style={{ background: "#0d0d0d", borderTop: "1px solid rgba(239,68,68,0.3)", boxShadow: "0 -4px 24px rgba(0,0,0,0.5)" }}
          >
            {/* Progress bar — top edge */}
            <div className="h-[3px] w-full bg-white/[0.06]">
              {isLive
                ? <motion.div className="h-full bg-red-500" animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.4, repeat: Infinity }} style={{ width: "100%" }} />
                : <div className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-1000 ease-linear" style={{ width: `${progress * 100}%` }} />
              }
            </div>

            {/* Main row */}
            <div
              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
              onClick={onOpen}
            >
              {/* Thumbnail or equaliser bars */}
              {thumbnail
                ? (
                  <div className="relative shrink-0">
                    <img src={thumbnail} alt="" className="w-10 h-7 rounded object-cover border border-white/10" />
                    {isPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                        <div className="flex items-end gap-[2px] h-4">
                          {[0,1,2].map(i => (
                            <motion.div key={i} className="w-[3px] rounded-full bg-red-400"
                              animate={{ height: ["20%","100%","45%","20%"] }}
                              transition={{ duration: 0.65, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
                              style={{ minHeight: 2 }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
                : (
                  <div className="flex items-end gap-[3px] h-7 w-10 shrink-0">
                    {[0,1,2,3].map(i => (
                      <motion.div key={i} className="flex-1 rounded-full bg-red-500"
                        animate={isPlaying ? { height: ["25%","100%","55%","80%","25%"] } : { height: "15%" }}
                        transition={isPlaying ? { duration: 0.7, repeat: Infinity, delay: i * 0.17, ease: "easeInOut" } : { duration: 0.3 }}
                        style={{ minHeight: 2 }}
                      />
                    ))}
                  </div>
                )
              }

              {/* Track info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white/90 truncate leading-tight">{displayName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {isBuffering
                    ? <p className="text-[9px] text-white/30 font-mono">Loading...</p>
                    : isLive
                      ? <span className="text-[8px] font-black tracking-widest text-red-400 bg-red-500/15 border border-red-500/30 px-1.5 py-0.5 rounded-full">● LIVE</span>
                      : (
                        <p className="text-[9px] text-white/35 font-mono">
                          {fmtTime(currentTime)}
                          <span className="text-white/15 mx-0.5">/</span>
                          {fmtTime(duration)}
                        </p>
                      )
                  }
                </div>
              </div>

              {/* Play / Pause */}
              <button
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                disabled={!apiReady}
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 active:scale-95 text-white transition-all disabled:opacity-40 shadow-md shadow-red-500/30"
              >
                {isBuffering
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : isPlaying
                    ? <Pause className="w-3.5 h-3.5" />
                    : <Play className="w-3.5 h-3.5 ml-0.5" />
                }
              </button>

              {/* Expand chevron */}
              <ChevronUp className="w-3.5 h-3.5 text-white/20 shrink-0" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
