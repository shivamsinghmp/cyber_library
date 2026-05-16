"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Paperclip, X, Coins, MessageCircle, Sparkles, RefreshCw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  hasImage?: boolean;
}

interface Stats {
  freeMessagesLeft: number;
  totalCoins: number;
  studentName: string | null;
  targetExam: string | null;
  currentStreak: number;
}

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
  const [stats, setStats] = useState<Stats>({ freeMessagesLeft: 5, totalCoins: 0, studentName: null, targetExam: null, currentStreak: 0 });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);
  const [showQuick, setShowQuick] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          // Personalized greeting
          const name = d.studentName ? ` ${d.studentName.split(" ")[0]}` : "";
          const examStr = d.targetExam ? ` ${d.targetExam}` : "";
          const examLine = examStr ? ` Main tumhara personal${examStr} AI buddy hoon!` : " Main tumhara AI study buddy hoon — UPSC, JEE, NEET, GATE, CAT, SSC — kisi bhi exam ke liye!";
          const streakStr = d.currentStreak > 1 ? ` Aur ${d.currentStreak} din ki streak chal rahi hai — wah! 🔥` : "";
          setMessages([{
            id: genId(),
            role: "assistant",
            content: `Namaste${name}! 👋${examLine}\n\nBatao aaj kya padhna hai? Study plan chahiye, koi doubt hai, ya bas baat karni hai — main hoon yahan!${streakStr} 📚✨`,
            timestamp: new Date(),
          }]);
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

    const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/ai/studymate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, imageBase64, mediaType }),
      });

      const data = await res.json().catch(() => ({ error: "Response parse error" }));

      if (!res.ok) {
        if (data.error === "coins_required") {
          setError(data.message);
          setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
          return;
        }

        // Show actual API error as assistant message — never a generic "Oops!"
        const errMsg = (() => {
          if (res.status === 401 || res.status === 403)
            return "Session expire ho gayi. Page refresh karo aur dobara login karo.";
          if (res.status === 503 || data.error === "AI not configured")
            return "StudyMate AI abhi setup nahi hai. Admin se GEMINI_API_KEY configure karwao.";
          if (res.status === 502 || data.error === "AI service unavailable")
            return "AI service temporarily down hai. 1-2 minute baad dobara try karo.";
          if (res.status === 504 || data.error?.includes("timed out"))
            return "AI response timeout ho gayi. Network check karo ya thodi der baad try karo.";
          return data.error || `Server error (${res.status}). Dobara try karo.`;
        })();

        setMessages((prev) => [...prev, {
          id: genId(), role: "assistant",
          content: errMsg,
          timestamp: new Date(),
        }]);
        return;
      }

      setMessages((prev) => [...prev, { id: genId(), role: "assistant", content: data.reply, timestamp: new Date() }]);
      setStats((prev) => ({
        ...prev,
        freeMessagesLeft: data.freeMessagesLeft ?? prev.freeMessagesLeft,
        totalCoins: prev.totalCoins - (data.coinsUsed ?? 0),
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
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white rounded-full px-2.5 py-1 border border-[#C9BEFF]">
            <MessageCircle className="w-3 h-3 text-[#6367FF]" />
            <span className="text-[#1A1447] text-xs">{stats.freeMessagesLeft} free</span>
          </div>
          <div className="flex items-center gap-1 bg-white rounded-full px-2.5 py-1 border border-[#C9BEFF]">
            <Coins className="w-3 h-3 text-amber-500" />
            <span className="text-[#1A1447] text-xs">{stats.totalCoins}</span>
          </div>
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
              <time className="text-[10px] text-[#6367FF]/60 px-1">{fmtTime(msg.timestamp)}</time>
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

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
            {error}
            {error.includes("coins") && (
              <a href="/dashboard" className="block mt-1.5 text-amber-600 hover:text-amber-700 text-xs font-medium">
                → Study room mein jaao coins kamao 🪙
              </a>
            )}
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
        {stats.freeMessagesLeft > 0
          ? `${stats.freeMessagesLeft} free messages aaj ke baaki • ${stats.totalCoins} coins`
          : `Free messages khatam • 5 coins = 10 messages • Study room mein coins kamao`}
      </p>
    </div>
  );
}
