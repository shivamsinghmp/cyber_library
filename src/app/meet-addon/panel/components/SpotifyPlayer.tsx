"use client";

import { useState, useEffect } from "react";
import { X, Music2, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── YouTube ────────────────────────────────────────────────────────────────────
const YT_STORAGE_KEY  = "vl_yt_music_url";
const YT_DEFAULT_URL  = "https://www.youtube.com/watch?v=5qap5aO4i9A";

const YT_PRESETS = [
  { label: "Lofi Girl",     emoji: "🎵", desc: "Beats to relax/study to",  url: "https://www.youtube.com/watch?v=5qap5aO4i9A" },
  { label: "Slow+Reverb",   emoji: "🌊", desc: "Slowed reverb chill mix",   url: "https://www.youtube.com/watch?v=iq4DlfEk0ys" },
  { label: "Study Beats",   emoji: "📚", desc: "3h instrumental focus",     url: "https://www.youtube.com/watch?v=DWcJFNfaw9c" },
  { label: "Piano Focus",   emoji: "🎹", desc: "Peaceful piano study",      url: "https://www.youtube.com/watch?v=HoU8gfVd3Qo" },
  { label: "Jazz Cafe",     emoji: "🎷", desc: "Jazz & bossa nova",         url: "https://www.youtube.com/watch?v=Dx5qFachd3A" },
  { label: "Deep Ambient",  emoji: "🌌", desc: "Space ambient for focus",   url: "https://www.youtube.com/watch?v=77ZozI0rw7w" },
];

function toYouTubeEmbed(url: string): string | null {
  try {
    const u = new URL(url.trim());
    let videoId: string | null = null;
    let listId:  string | null = null;

    if (u.hostname === "youtu.be") {
      videoId = u.pathname.slice(1).split("?")[0] || null;
    } else if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return url;
      videoId = u.searchParams.get("v");
      listId  = u.searchParams.get("list");
    }

    const p = "autoplay=1&rel=0&modestbranding=1";
    if (videoId && listId) return `https://www.youtube.com/embed/${videoId}?${p}&list=${listId}`;
    if (listId)            return `https://www.youtube.com/embed?listType=playlist&list=${listId}&${p}`;
    if (videoId)           return `https://www.youtube.com/embed/${videoId}?${p}`;
    return null;
  } catch { return null; }
}

// ── Spotify ────────────────────────────────────────────────────────────────────
const SP_STORAGE_KEY  = "vl_spotify_url";
const SP_DEFAULT_URL  = "https://open.spotify.com/playlist/0vvXsWCC9xrXsKd4euo2UI";

const SP_PRESETS = [
  { label: "Lo-fi Study",        emoji: "🎵", url: "https://open.spotify.com/playlist/0vvXsWCC9xrXsKd4euo2UI" },
  { label: "Deep Focus",         emoji: "🧠", url: "https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ" },
  { label: "Productive Morning", emoji: "🌅", url: "https://open.spotify.com/playlist/37i9dQZF1DX9sIqqvKsjEJ" },
  { label: "Coding Music",       emoji: "💻", url: "https://open.spotify.com/playlist/37i9dQZF1DX5trt9i14X7j" },
  { label: "Peaceful Piano",     emoji: "🎹", url: "https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO" },
  { label: "Focus Flow",         emoji: "🔥", url: "https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ" },
];

function toSpotifyEmbed(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.pathname.startsWith("/embed/")) return url;
    const match = u.pathname.match(/^\/(playlist|track|album|artist|episode|show)\//);
    if (!match) return null;
    const embedPath = u.pathname.replace(`/${match[1]}/`, `/embed/${match[1]}/`);
    return `https://open.spotify.com${embedPath}?utm_source=generator&theme=0`;
  } catch { return null; }
}

// ── Component ─────────────────────────────────────────────────────────────────
type Tab = "youtube" | "spotify";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function SpotifyPlayer({ isOpen, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("youtube");

  // YouTube state
  const [ytInput,  setYtInput]  = useState("");
  const [ytEmbed,  setYtEmbed]  = useState<string | null>(null);
  const [ytError,  setYtError]  = useState("");

  // Spotify state
  const [spInput,  setSpInput]  = useState("");
  const [spEmbed,  setSpEmbed]  = useState<string | null>(null);
  const [spError,  setSpError]  = useState("");

  const [compact, setCompact] = useState(false);

  // Restore saved URLs
  useEffect(() => {
    try {
      const savedYt = localStorage.getItem(YT_STORAGE_KEY) || YT_DEFAULT_URL;
      const embedYt = toYouTubeEmbed(savedYt);
      if (embedYt) { setYtEmbed(embedYt); setYtInput(savedYt); }

      const savedSp = localStorage.getItem(SP_STORAGE_KEY) || SP_DEFAULT_URL;
      const embedSp = toSpotifyEmbed(savedSp);
      if (embedSp) { setSpEmbed(embedSp); setSpInput(savedSp); }
    } catch {}
  }, []);

  function applyYt(url: string) {
    setYtError("");
    const embed = toYouTubeEmbed(url);
    if (!embed) { setYtError("Valid YouTube URL daalo (video ya playlist)"); return; }
    setYtEmbed(embed); setYtInput(url);
    try { localStorage.setItem(YT_STORAGE_KEY, url); } catch {}
  }

  function applySp(url: string) {
    setSpError("");
    const embed = toSpotifyEmbed(url);
    if (!embed) { setSpError("Valid Spotify URL daalo (playlist, track, album...)"); return; }
    setSpEmbed(embed); setSpInput(url);
    try { localStorage.setItem(SP_STORAGE_KEY, url); } catch {}
  }

  const isYt = tab === "youtube";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: -10 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed top-4 right-16 z-[8999] w-[340px] rounded-2xl overflow-hidden"
          style={{
            background: "#0F0F0F",
            boxShadow: isYt
              ? "0 8px 40px rgba(255,0,0,0.22), 0 2px 8px rgba(0,0,0,0.6)"
              : "0 8px 40px rgba(29,185,84,0.22), 0 2px 8px rgba(0,0,0,0.6)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10" style={{ background: "#1a1a1a" }}>
            {/* Tab switcher */}
            <div className="flex gap-1 p-0.5 rounded-lg bg-white/5 border border-white/10">
              <button
                onClick={() => setTab("youtube")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                  isYt ? "bg-[#FF0000] text-white" : "text-white/40 hover:text-white/70"
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                YouTube
              </button>
              <button
                onClick={() => setTab("spotify")}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                  !isYt ? "bg-[#1DB954] text-white" : "text-white/40 hover:text-white/70"
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
                Spotify
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCompact((c) => !c)}
                title={compact ? "Expand" : "Compact"}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Music2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── YouTube tab ── */}
          {isYt && (
            <>
              {ytEmbed && (
                <iframe
                  key={ytEmbed}
                  src={ytEmbed}
                  width="340"
                  height={compact ? 80 : 200}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  allowFullScreen
                  className="block w-full border-0"
                  title="YouTube Study Music"
                />
              )}
              {!compact && (
                <div className="px-3 pt-2 pb-1.5" style={{ background: "#111" }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5">Study Playlists</p>
                  <div className="flex flex-wrap gap-1.5">
                    {YT_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => applyYt(p.url)}
                        title={p.desc}
                        className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/60 hover:bg-white/10 hover:text-white hover:border-white/25 transition-all"
                      >
                        {p.emoji} {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {!compact && (
                <form
                  onSubmit={(e) => { e.preventDefault(); applyYt(ytInput); }}
                  className="px-3 pb-3 pt-2 border-t border-white/5"
                  style={{ background: "#111" }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5">Custom URL</p>
                  <div className="flex gap-1.5">
                    <input
                      type="url"
                      value={ytInput}
                      onChange={(e) => setYtInput(e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                      className="flex-1 min-w-0 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder:text-white/20 outline-none focus:border-red-500/50 transition-colors"
                    />
                    <button type="submit" className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white hover:opacity-80 transition-opacity" style={{ background: "#FF0000" }}>
                      Go
                    </button>
                    <button type="button" onClick={() => applyYt(YT_DEFAULT_URL)} title="Reset" className="shrink-0 rounded-lg bg-white/5 border border-white/10 p-1.5 text-white/30 hover:text-white/60 transition-colors">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {ytError && <p className="mt-1 text-[10px] text-red-400">{ytError}</p>}
                  <p className="mt-1.5 text-[9px] text-white/20">Koi bhi YouTube video ya playlist URL — no login required</p>
                </form>
              )}
            </>
          )}

          {/* ── Spotify tab ── */}
          {!isYt && (
            <>
              {spEmbed && (
                <iframe
                  key={spEmbed}
                  src={spEmbed}
                  width="340"
                  height={compact ? 80 : 152}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="block w-full border-0"
                  title="Spotify Player"
                  style={{ background: "#121212" }}
                />
              )}
              {!compact && (
                <div className="px-3 pt-2 pb-1.5" style={{ background: "#111" }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5">Quick Playlists</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SP_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => applySp(p.url)}
                        className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/60 hover:bg-[#1DB954]/20 hover:text-[#1DB954] hover:border-[#1DB954]/40 transition-all"
                      >
                        {p.emoji} {p.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[9px] text-white/20">💡 Full songs ke liye browser mein Spotify login karo</p>
                </div>
              )}
              {!compact && (
                <form
                  onSubmit={(e) => { e.preventDefault(); applySp(spInput); }}
                  className="px-3 pb-3 pt-2 border-t border-white/5"
                  style={{ background: "#111" }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-1.5">Custom URL</p>
                  <div className="flex gap-1.5">
                    <input
                      type="url"
                      value={spInput}
                      onChange={(e) => setSpInput(e.target.value)}
                      placeholder="https://open.spotify.com/playlist/..."
                      className="flex-1 min-w-0 rounded-lg bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder:text-white/20 outline-none focus:border-[#1DB954]/50 transition-colors"
                    />
                    <button type="submit" className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white hover:opacity-80 transition-opacity" style={{ background: "#1DB954" }}>
                      Go
                    </button>
                    <button type="button" onClick={() => applySp(SP_DEFAULT_URL)} title="Reset" className="shrink-0 rounded-lg bg-white/5 border border-white/10 p-1.5 text-white/30 hover:text-white/60 transition-colors">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {spError && <p className="mt-1 text-[10px] text-red-400">{spError}</p>}
                  <p className="mt-1.5 text-[9px] text-white/20">Paste any Spotify playlist, album, or track URL</p>
                </form>
              )}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
