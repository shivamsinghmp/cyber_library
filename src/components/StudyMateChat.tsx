"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Paperclip, X, Coins, Sparkles, RefreshCw, ShoppingCart } from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
type ModelId =
  | "gemini-2.5-flash" | "gemini-2.0-flash" | "gemini-1.5-pro" | "gemini-2.5-pro"
  | "claude-haiku"     | "claude-sonnet"     | "claude-opus"
  | "gpt-4o-mini"      | "gpt-4.1-mini"      | "gpt-4.1" | "gpt-4o"
  | "gpt-o1-mini"      | "gpt-o1";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  hasImage?: boolean;
  modelUsed?: ModelId;
  coinsUsed?: number;
  tokensUsed?: number;
}

interface Stats {
  totalCoins: number;
  studentName: string | null;
  targetExam: string | null;
  currentStreak: number;
  profileComplete: boolean;
  configuredProviders?: { gemini: boolean; anthropic: boolean; openai: boolean };
}

const MODEL_META: Record<ModelId, { label: string; emoji: string; color: string; rate: number }> = {
  "gemini-2.5-flash": { label: "Gemini 2.5 Flash", emoji: "⚡", color: "text-blue-500",   rate: 1  },
  "gemini-2.0-flash": { label: "Gemini 2.0 Flash", emoji: "⚡", color: "text-blue-400",   rate: 1  },
  "gemini-1.5-pro":   { label: "Gemini 1.5 Pro",   emoji: "🔵", color: "text-blue-600",   rate: 4  },
  "gemini-2.5-pro":   { label: "Gemini 2.5 Pro",   emoji: "💎", color: "text-blue-700",   rate: 6  },
  "claude-haiku":     { label: "Claude Haiku",      emoji: "🧠", color: "text-violet-500", rate: 3  },
  "claude-sonnet":    { label: "Claude Sonnet",     emoji: "🧠", color: "text-violet-600", rate: 10 },
  "claude-opus":      { label: "Claude Opus",       emoji: "👑", color: "text-violet-700", rate: 50 },
  "gpt-4o-mini":      { label: "GPT-4o Mini",       emoji: "🤖", color: "text-emerald-500",rate: 1  },
  "gpt-4.1-mini":     { label: "GPT-4.1 Mini",      emoji: "🤖", color: "text-emerald-500",rate: 2  },
  "gpt-4.1":          { label: "GPT-4.1",           emoji: "🤖", color: "text-emerald-600",rate: 6  },
  "gpt-4o":           { label: "GPT-4o",            emoji: "🤖", color: "text-emerald-700",rate: 7  },
  "gpt-o1-mini":      { label: "GPT o1 Mini",       emoji: "🔬", color: "text-orange-500", rate: 9  },
  "gpt-o1":           { label: "GPT o1",            emoji: "🔬", color: "text-orange-600", rate: 42 },
};

// ─── Quick prompts ────────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { label: "📅 Study plan",     prompt: "Mera target exam aur date batata hoon — personalized plan banao" },
  { label: "⚡ Shortcut batao", prompt: "Mere exam ke liye sabse useful shortcuts aur tricks kaunsi hain?" },
  { label: "🎯 80/20 topics",   prompt: "Mere exam mein kaunse 20% topics se 80% marks aate hain?" },
  { label: "😰 Stressed hoon",  prompt: "Bahut stressed hoon exam ki wajah se, help karo" },
  { label: "📸 Photo se solve", prompt: "Main question ki photo upload karna chahta hoon" },
  { label: "📊 Weak topic fix", prompt: "Mera ek subject bahut weak hai, kahan se aur kaise start karun?" },
];

function genId() { return Math.random().toString(36).slice(2, 9); }
function fmtTime(d: Date) { return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); }

// ─── Component ────────────────────────────────────────────────────────────────
export default function StudyMateChat() {
  const [stats, setStats] = useState<Stats>({ totalCoins: 0, studentName: null, targetExam: null, currentStreak: 0, profileComplete: true });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showQuick, setShowQuick] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coinsError, setCoinsError] = useState<{ message: string; coinsNeeded: number; currentCoins: number } | null>(null);
  const [qualityWarning, setQualityWarning] = useState<{
    preferredModel: ModelId; preferredModelCoins: number;
    fallbackModel: ModelId; fallbackModelCoins: number;
    currentCoins: number;
  } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Fetch initial stats ──────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/ai/studymate")
      .then((r) => r.ok ? r.json() : null)
      .then((d: Stats | null) => {
        if (d) {
          setStats(d);
          let greeting: string;
          if (!d.profileComplete) {
            // Onboarding: AI will ask for details — just show a warm welcome
            greeting = "Namaste! 👋 Main hoon StudyMate AI — Cyber Library ka tumhara personal study buddy!\n\nPehle tumse thoda jaanna chahta hoon taaki main tumhari padhai mein sahi help kar sakoon. Batao...";
          } else {
            const name = d.studentName ? ` ${d.studentName.split(" ")[0]}` : "";
            const examStr = d.targetExam ? ` ${d.targetExam}` : "";
            const examLine = examStr
              ? ` Main tumhara personal ${examStr} buddy hoon!`
              : " Main tumhara AI study buddy hoon — JEE, NEET, UPSC, GATE, CAT, SSC — kisi bhi exam ke liye!";
            const streakStr = d.currentStreak > 1 ? `\n\n🔥 ${d.currentStreak} din ki streak chal rahi hai — wah!` : "";
            greeting = `Namaste${name}! 👋${examLine}\n\nBatao aaj kya padhna hai? Study plan chahiye, koi doubt hai, ya bas motivation chahiye — main hoon yahan! 📚✨${streakStr}`;
          }
          setMessages([{ id: genId(), role: "assistant", content: greeting, timestamp: new Date() }]);
        }
      })
      .catch(() => {
        setMessages([{
          id: genId(),
          role: "assistant",
          content: "Namaste! 👋 Main StudyMate AI hoon. Kaunsi class ho aur kab exam hai? Batao toh study plan banate hain! 📚",
          timestamp: new Date(),
        }]);
      })
      .finally(() => setLoadingStats(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // ── Image handling ───────────────────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Image 5MB se chhoti honi chahiye"); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if ((!trimmed && !imageFile) || isLoading) return;

    setError(null);
    setCoinsError(null);
    setQualityWarning(null);
    setShowQuick(false);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    let imageBase64: string | undefined;
    let mediaType: string | undefined;
    if (imageFile && imagePreview) {
      const [header, data] = imagePreview.split(",");
      imageBase64 = data;
      mediaType = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
    }

    const userMsg: Message = {
      id: genId(),
      role: "user",
      content: trimmed || "Yeh question dekho:",
      timestamp: new Date(),
      hasImage: !!imageFile,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    removeImage();

    // Send last 20 messages only — older context costs coins without adding much value
    const allMsgs = [...messages, userMsg];
    const history = allMsgs.slice(-20).map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/ai/studymate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, imageBase64, mediaType }),
      });

      const data = await res.json().catch(() => ({ error: "Response parse error" }));

      if (!res.ok) {
        if (data.error === "coins_required") {
          setCoinsError({
            message: data.message ?? "Coins khatam ho gaye!",
            coinsNeeded: data.coinsNeeded ?? 1,
            currentCoins: data.currentCoins ?? 0,
          });
          return;
        }

        if (data.error === "quality_warning") {
          setQualityWarning({
            preferredModel: data.preferredModel,
            preferredModelCoins: data.preferredModelCoins,
            fallbackModel: data.fallbackModel,
            fallbackModelCoins: data.fallbackModelCoins,
            currentCoins: data.currentCoins,
          });
          return;
        }

        // Show actual API error as assistant message — never a generic "Oops!"
        const errMsg = (() => {
          if (res.status === 401 || res.status === 403)
            return "Session expire ho gayi. Page refresh karo aur dobara login karo.";
          if (res.status === 503 || data.error === "AI not configured")
            return "StudyMate AI abhi setup nahi hai. Admin se Vertex AI configure karwao.";
          if (res.status === 504 || data.error?.includes("timed out"))
            return "AI response timeout ho gayi. Network check karo ya thodi der baad try karo.";
          // For 502 and other errors, show the actual error from the API
          return data.error || `Server error (${res.status}). Dobara try karo.`;
        })();

        setMessages((prev) => [...prev, {
          id: genId(), role: "assistant",
          content: errMsg,
          timestamp: new Date(),
        }]);
        return;
      }

      setMessages((prev) => [...prev, {
        id: genId(),
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
        modelUsed: data.modelUsed as ModelId | undefined,
        coinsUsed: data.coinsUsed,
        tokensUsed: data.tokensUsed,
      }]);
      setCoinsError(null);
      setStats((prev) => ({
        ...prev,
        totalCoins: prev.totalCoins - (data.coinsUsed ?? 0),
        profileComplete: data.profileComplete ?? prev.profileComplete,
      }));
    } catch {
      // Only real network errors reach here (fetch itself failed)
      setMessages((prev) => [...prev, {
        id: genId(),
        role: "assistant",
        content: "Network error. Internet connection check karo aur dobara try karo.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, imageFile, imagePreview]);

  const handleAcceptLowerQuality = async () => {
    if (!qualityWarning) return;
    setQualityWarning(null);
    setIsLoading(true);
    const history = messages.slice(-20).map(m => ({ role: m.role, content: m.content }));
    try {
      const res = await fetch("/api/ai/studymate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, acceptLowerQuality: true }),
      });
      const data = await res.json().catch(() => ({ error: "Parse error" }));
      if (res.ok) {
        setMessages(prev => [...prev, {
          id: genId(), role: "assistant", content: data.reply,
          timestamp: new Date(), modelUsed: data.modelUsed as ModelId | undefined,
          coinsUsed: data.coinsUsed, tokensUsed: data.tokensUsed,
        }]);
        setCoinsError(null);
        setStats(prev => ({
          ...prev,
          totalCoins: prev.totalCoins - (data.coinsUsed ?? 0),
          profileComplete: data.profileComplete ?? prev.profileComplete,
        }));
      } else if (data.error === "coins_required") {
        setCoinsError({ message: data.message, coinsNeeded: data.coinsNeeded, currentCoins: data.currentCoins });
      }
    } catch {
      setError("Network error. Dobara try karo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = textareaRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 120) + "px"; }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-[#C9BEFF] overflow-hidden shadow-[0_4px_24px_rgba(99,103,255,0.10)]">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#F5F4FF] border-b border-[#C9BEFF] flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#6367FF] to-[#8494FF] flex items-center justify-center text-lg flex-shrink-0">
          📚
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[#1A1447] font-semibold text-sm font-heading">StudyMate AI</p>
          <p className="text-[#6367FF] text-[11px]">
            {stats.targetExam ? `${stats.targetExam} buddy` : "Har exam ka buddy"}
            {stats.currentStreak > 0 && ` • 🔥 ${stats.currentStreak} day streak`}
          </p>
        </div>
        {/* Provider availability pills */}
        {stats.configuredProviders && (
          <div className="hidden sm:flex items-center gap-1">
            {[
              { key: "gemini" as const,    label: "G",  title: "Gemini"    },
              { key: "anthropic" as const, label: "C",  title: "Claude"    },
              { key: "openai" as const,    label: "G4", title: "GPT"       },
            ].map(({ key, label, title }) => (
              <span
                key={key}
                title={stats.configuredProviders![key] ? `${title} ready` : `${title} not configured`}
                className={`text-[9px] font-black rounded-full px-1.5 py-0.5 border ${
                  stats.configuredProviders![key]
                    ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                    : "bg-gray-50 border-gray-200 text-gray-300 line-through"
                }`}
              >
                {label}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1 bg-white rounded-full px-2.5 py-1 border border-[#C9BEFF]">
          <Coins className="w-3 h-3 text-amber-500" />
          <span className="text-[#1A1447] text-xs font-semibold">{stats.totalCoins}</span>
        </div>
        <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)] animate-pulse flex-shrink-0" />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {loadingStats && (
          <div className="flex justify-center pt-8">
            <RefreshCw className="w-5 h-5 text-[#6367FF] animate-spin" />
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2.5 items-end ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${msg.role === "assistant" ? "bg-gradient-to-br from-[#6367FF] to-[#8494FF]" : "bg-[#C9BEFF]"}`}>
              {msg.role === "assistant" ? "📚" : "👤"}
            </div>
            <div className={`flex flex-col gap-1 max-w-[80%] ${msg.role === "user" ? "items-end" : ""}`}>
              <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === "assistant" ? "bg-[#F5F4FF] text-[#1A1447] rounded-bl-sm border border-[#C9BEFF]" : "bg-[#6367FF] text-white rounded-br-sm font-medium"}`}>
                {msg.hasImage && (
                  <div className="flex items-center gap-1 mb-1 opacity-70 text-xs">
                    <Paperclip className="w-3 h-3" /><span>Image attached</span>
                  </div>
                )}
                {msg.content.split("\n").map((line, i, arr) => (
                  <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                ))}
              </div>
              <div className="flex items-center gap-1.5 px-1 flex-wrap">
                <time className="text-[10px] text-[#6367FF]/60">{fmtTime(msg.timestamp)}</time>
                {msg.role === "assistant" && msg.modelUsed && MODEL_META[msg.modelUsed] && (
                  <span className={`text-[10px] font-semibold ${MODEL_META[msg.modelUsed].color}`}>
                    {MODEL_META[msg.modelUsed].emoji} {MODEL_META[msg.modelUsed].label}
                  </span>
                )}
                {msg.role === "assistant" && msg.tokensUsed != null && (
                  <span className="text-[10px] text-[#6367FF]/50">{msg.tokensUsed.toLocaleString("en-IN")}t</span>
                )}
                {msg.role === "assistant" && msg.coinsUsed != null && msg.coinsUsed > 0 && (
                  <span className="text-[10px] font-bold text-amber-600">• {msg.coinsUsed} 🪙</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Typing dots */}
        {isLoading && (
          <div className="flex gap-2.5 items-end">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6367FF] to-[#8494FF] flex items-center justify-center text-sm flex-shrink-0">📚</div>
            <div className="bg-[#F5F4FF] border border-[#C9BEFF] rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
              {[0, 150, 300].map((d) => (
                <span key={d} className="w-1.5 h-1.5 rounded-full bg-[#6367FF] animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}

        {/* Coins exhausted card */}
        {coinsError && (
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 text-lg">
                🪙
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-900">Coins Khatam!</p>
                <p className="text-xs text-amber-700 mt-0.5">{coinsError.message}</p>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <span className="font-semibold text-amber-800">
                    Chahiye: <strong>{coinsError.coinsNeeded} 🪙</strong>
                  </span>
                  <span className="text-amber-600">
                    Paas mein: <strong>{coinsError.currentCoins} 🪙</strong>
                  </span>
                  <span className="text-red-600 font-bold">
                    Shortfall: {coinsError.coinsNeeded - coinsError.currentCoins} 🪙
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href="/dashboard/wallet/buy-coins"
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-500 px-4 py-2.5 text-sm font-bold text-amber-900 transition-colors shadow-sm"
              >
                <ShoppingCart className="h-4 w-4" />
                Coins Kharido
              </Link>
              <Link
                href="/dashboard/wallet"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-colors"
              >
                <Coins className="h-3.5 w-3.5" />
                Wallet
              </Link>
            </div>
            <p className="text-[10px] text-amber-600/70 text-center">
              Coins top-up ke baad wapas aao aur message dobara bhejo 🚀
            </p>
          </div>
        )}

        {/* Quality warning — premium model needed but not affordable */}
        {qualityWarning && MODEL_META[qualityWarning.preferredModel] && MODEL_META[qualityWarning.fallbackModel] && (
          <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0 text-lg">
                {MODEL_META[qualityWarning.preferredModel].emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-violet-900">
                  Yeh question {MODEL_META[qualityWarning.preferredModel].label} maangta hai
                </p>
                <p className="text-xs text-violet-700 mt-0.5">
                  Best quality ke liye <strong>{qualityWarning.preferredModelCoins} coins</strong> chahiye,
                  {" "}tumhare paas sirf <strong>{qualityWarning.currentCoins} coins</strong> hain.
                </p>
                <p className="text-[10px] text-violet-500 mt-1">
                  Quality mein compromise mat karo — coins buy karo aur premium answer pao.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href="/dashboard/wallet/buy-coins"
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 px-4 py-2.5 text-sm font-bold text-white transition-colors shadow-sm"
              >
                <ShoppingCart className="h-4 w-4" />
                Coins Kharido
              </Link>
              <button
                onClick={handleAcceptLowerQuality}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-xs font-semibold text-violet-600 hover:bg-violet-50 transition-colors disabled:opacity-50"
              >
                <span>{MODEL_META[qualityWarning.fallbackModel].emoji}</span>
                {MODEL_META[qualityWarning.fallbackModel].label} se lo
                <span className="text-[10px] text-violet-400">({qualityWarning.fallbackModelCoins}🪙)</span>
              </button>
            </div>
          </div>
        )}

        {/* Generic error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {showQuick && messages.length <= 1 && (
        <div className="px-4 py-2 flex gap-2 flex-wrap border-t border-[#C9BEFF] bg-[#F5F4FF] flex-shrink-0">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q.prompt}
              onClick={() => sendMessage(q.prompt)}
              disabled={isLoading}
              className="bg-white border border-[#C9BEFF] hover:border-[#6367FF] hover:bg-[#F5F4FF] text-[#1A1447] text-xs rounded-full px-3 py-1.5 transition-all disabled:opacity-40 whitespace-nowrap"
            >
              {q.label}
            </button>
          ))}
        </div>
      )}

      {/* Image preview */}
      {imagePreview && (
        <div className="px-4 py-2 border-t border-[#C9BEFF] bg-[#F5F4FF] flex-shrink-0">
          <div className="relative inline-block">
            <img src={imagePreview} alt="Upload" className="h-14 w-auto rounded-lg border border-[#C9BEFF] object-cover" />
            <button onClick={removeImage} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600">
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-[10px] text-[#6367FF]/60 mt-1">Image ready — message bhejo</p>
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-3 bg-[#F5F4FF] border-t border-[#C9BEFF] flex items-end gap-2 flex-shrink-0">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={isLoading}
          title="Question ki photo upload karo"
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-white border border-[#C9BEFF] hover:border-[#6367FF] text-[#6367FF] transition-all disabled:opacity-40"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Sawaal puchho ya photo upload karo... (Enter to send)"
          className="flex-1 bg-white border border-[#C9BEFF] focus:border-[#6367FF] focus:ring-2 focus:ring-[#6367FF]/20 rounded-xl px-3 py-2 text-sm text-[#1A1447] placeholder-[#6367FF]/40 resize-none outline-none transition-colors min-h-[36px] max-h-[120px]"
        />

        <button
          onClick={() => sendMessage(input)}
          disabled={isLoading || (!input.trim() && !imageFile)}
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#6367FF] to-[#8494FF] text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_2px_8px_rgba(99,103,255,0.3)]"
        >
          {isLoading ? <Sparkles className="w-4 h-4 animate-pulse" /> : <Send className="w-4 h-4" />}
        </button>
      </div>

      {/* Footer */}
      <p className="px-4 py-1.5 bg-[#F5F4FF] text-[10px] text-[#6367FF]/50 text-center flex-shrink-0">
        ⚡ Gemini=1🪙 • 🤖 GPT=1–2🪙 • 🧠 Claude Haiku=3🪙 • 👑 Opus=50🪙 per 1000 tokens • 1🪙 = ₹0.10
      </p>
    </div>
  );
}
