"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Sparkles, RotateCcw, Bot, Coins, ShoppingCart, ImagePlus, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  modelUsed?: string;
  coinsUsed?: number;
  isStreaming?: boolean;
};

type CoinsError = { message: string; coinsNeeded: number; currentCoins: number };
type QualityWarning = {
  preferredModel: string; preferredModelCoins: number;
  fallbackModel: string; fallbackModelCoins: number; currentCoins: number;
};

function getToken(): string {
  try { return localStorage.getItem("vl_meet_addon_token") ?? ""; } catch { return ""; }
}

function genId() { return Math.random().toString(36).slice(2, 9); }

const QUICK_PROMPTS = [
  "Create a study plan for today",
  "I need some motivation",
  "Share a shortcut trick",
  "Tomorrow's revision plan",
];

const MODEL_EMOJI: Record<string, string> = {
  "gemini-2.5-flash": "⚡", "gemini-2.0-flash": "⚡",
  "gemini-1.5-pro": "🔵", "gemini-2.5-pro": "💎",
  "claude-haiku": "🧠", "claude-sonnet": "🧠", "claude-opus": "👑",
  "gpt-4o-mini": "🤖", "gpt-4.1-mini": "🤖", "gpt-4.1": "🤖", "gpt-4o": "🤖",
  "gpt-o1-mini": "🔬", "gpt-o1": "🔬",
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string | null;
  onPromptConsumed?: () => void;
};

export function AIChatBot({ isOpen, onClose, initialPrompt, onPromptConsumed }: Props) {
  const [messages,       setMessages]       = useState<Message[]>([]);
  const [input,          setInput]          = useState("");
  const [loading,        setLoading]        = useState(false);
  const [totalCoins,     setTotalCoins]     = useState<number | null>(null);
  const [coinsError,     setCoinsError]     = useState<CoinsError | null>(null);
  const [qualityWarning, setQualityWarning] = useState<QualityWarning | null>(null);
  const [imageBase64,    setImageBase64]    = useState<string | null>(null);
  const [imageMediaType, setImageMediaType] = useState<"image/jpeg" | "image/png" | "image/webp" | "image/gif">("image/jpeg");
  const imageInputRef = useRef<HTMLInputElement>(null);

  const pendingQualityMsgs = useRef<Message[] | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const scrollRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const sendRef    = useRef(send);
  const isAtBottom = useRef(true);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    isAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  useEffect(() => { sendRef.current = send; });

  // Fetch initial coin balance via bearer token
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch("/api/ai/studymate", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then((d: { totalCoins?: number } | null) => { if (d?.totalCoins != null) setTotalCoins(d.totalCoins); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isAtBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, coinsError, qualityWarning]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  useEffect(() => {
    if (!initialPrompt) return;
    onPromptConsumed?.();
    const t = setTimeout(() => sendRef.current(initialPrompt), 200);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialPrompt]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
    const mime = file.type as typeof validTypes[number];
    if (!validTypes.includes(mime)) { alert("Only JPG, PNG, WebP, GIF supported"); return; }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX_DIM = 1024;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      setImageBase64(dataUrl.split(",")[1] ?? "");
      setImageMediaType("image/jpeg");
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); alert("Image load failed"); };
    img.src = objectUrl;
    e.target.value = "";
  };

  // SSE stream consumer — accumulates chunks then replaces with final stripped text
  const consumeStream = useCallback(async (res: Response, streamMsgId: string) => {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const ev = JSON.parse(jsonStr) as Record<string, unknown>;
            if (ev.t === "c") {
              const chunk = (ev.d as string) ?? "";
              setMessages(prev => prev.map(m =>
                m.id === streamMsgId ? { ...m, content: m.content + chunk } : m
              ));
            } else if (ev.t === "done") {
              const coinsUsed = ev.coins as number | undefined;
              setMessages(prev => prev.map(m => m.id === streamMsgId ? {
                ...m,
                content:     (ev.full as string) ?? m.content,
                isStreaming: false,
                modelUsed:   (ev.model as string) ?? undefined,
                coinsUsed,
              } : m));
              if (coinsUsed != null)
                setTotalCoins(prev => prev != null ? Math.max(0, prev - coinsUsed) : null);
              break outer;
            } else if (ev.t === "err") {
              setMessages(prev => prev.map(m => m.id === streamMsgId
                ? { ...m, content: (ev.msg as string) ?? "AI service error. Please try again.", isStreaming: false }
                : m));
              break outer;
            }
          } catch { /* skip malformed event */ }
        }
      }
    } catch { /* reader cancelled or network error */ }
    finally {
      setMessages(prev => prev.map(m => m.id === streamMsgId ? { ...m, isStreaming: false } : m));
      setLoading(false);
    }
  }, []);

  const callApi = useCallback(async (msgs: Message[], acceptLower = false, img?: string | null, imgMime?: string) => {
    setLoading(true);
    setCoinsError(null);
    setQualityWarning(null);
    const body: Record<string, unknown> = {
      messages: msgs.map(m => ({ role: m.role, content: m.content })),
      acceptLowerQuality: acceptLower,
    };
    if (img) { body.imageBase64 = img; body.mediaType = imgMime ?? "image/jpeg"; }

    try {
      const res = await fetch("/api/ai/studymate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body),
      });

      // Pre-stream errors come back as JSON on non-200
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Response parse error" }));
        if (data.error === "coins_required") {
          setCoinsError({ message: data.message ?? "Out of coins!", coinsNeeded: data.coinsNeeded ?? 1, currentCoins: data.currentCoins ?? 0 });
          if (data.currentCoins != null) setTotalCoins(data.currentCoins);
          setLoading(false); return;
        }
        if (data.error === "quality_warning") {
          pendingQualityMsgs.current = msgs;
          setQualityWarning({
            preferredModel:      data.preferredModel,
            preferredModelCoins: data.preferredModelCoins,
            fallbackModel:       data.fallbackModel,
            fallbackModelCoins:  data.fallbackModelCoins,
            currentCoins:        data.currentCoins,
          });
          if (data.currentCoins != null) setTotalCoins(data.currentCoins);
          setLoading(false); return;
        }
        const errMsg = res.status === 401
          ? "Session expired. Please log out of the panel and log in again."
          : res.status === 503 || data.error === "AI not configured"
            ? "StudyMate AI is not available right now. Please contact the admin."
            : res.status === 504 || data.error?.includes("timed out")
              ? "AI timed out. Please try again in a moment."
              : data.error || `Error ${res.status}. Please try again.`;
        setMessages(prev => [...prev, { id: genId(), role: "assistant", content: errMsg }]);
        setLoading(false); return;
      }

      // 200 = SSE stream — add placeholder and start consuming
      const streamMsgId = genId();
      setMessages(prev => [...prev, { id: streamMsgId, role: "assistant", content: "", isStreaming: true }]);
      await consumeStream(res, streamMsgId);

    } catch {
      setMessages(prev => [...prev, { id: genId(), role: "assistant", content: "Network error. Please check your internet connection." }]);
      setLoading(false);
    }
  }, [consumeStream]);

  const handleAcceptLowerQuality = async () => {
    const msgs = pendingQualityMsgs.current;
    if (!msgs) return;
    pendingQualityMsgs.current = null;
    setQualityWarning(null);
    await callApi(msgs, true);
  };

  async function send(text: string) {
    const trimmed = text.trim();
    if ((!trimmed && !imageBase64) || loading) return;

    setCoinsError(null);
    setQualityWarning(null);
    setInput("");

    const content = trimmed || (imageBase64 ? "📸 Please solve this question" : "");
    const capturedImage = imageBase64;
    const capturedMime  = imageMediaType;
    setImageBase64(null);

    const newMessages: Message[] = [...messages, { id: genId(), role: "user", content }];
    setMessages(newMessages);
    await callApi(newMessages, false, capturedImage, capturedMime);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  }

  function clearChat() {
    setMessages([]);
    setCoinsError(null);
    setQualityWarning(null);
    pendingQualityMsgs.current = null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 10 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="fixed bottom-6 right-6 z-[8998] w-[340px] h-[540px] rounded-2xl flex flex-col overflow-hidden border border-white/10"
          style={{
            background: "linear-gradient(180deg, #0f0f1a 0%, #0d0d14 100%)",
            boxShadow: "0 8px 40px rgba(99,102,241,0.28), 0 2px 8px rgba(0,0,0,0.7)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b border-white/10"
            style={{ background: "linear-gradient(135deg, #1e1b4b, #1a1a2e)" }}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-white leading-none">StudyMate AI</p>
                <p className="text-[9px] text-white/40 mt-0.5">AI study buddy</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {totalCoins != null && (
                <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                  <Coins className="w-2.5 h-2.5 text-amber-400" />
                  <span className="text-[10px] font-bold text-amber-400 tabular-nums">{totalCoins}</span>
                </div>
              )}
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  title="Clear chat"
                  className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(99,102,241,0.3) transparent", overscrollBehavior: "contain" }}
          >
            {messages.length === 0 && !coinsError && !qualityWarning ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 pb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #6366F133, #8B5CF633)" }}>
                  <Bot className="w-7 h-7 text-[#8B5CF6]" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-white/80">Ask me anything!</p>
                  <p className="text-[10px] text-white/30 mt-1">Study plan, doubt, motivation — anything goes</p>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center w-full px-2">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-medium text-white/50 hover:text-white/80 hover:bg-white/10 hover:border-white/20 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <motion.div
                    key={m.id ?? i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-2`}
                  >
                    {m.role === "assistant" && (
                      <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
                        style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <div className={`flex flex-col gap-0.5 max-w-[82%] ${m.role === "user" ? "items-end" : "items-start"}`}>
                      <div
                        className={`rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                          m.role === "user"
                            ? "text-white rounded-tr-sm"
                            : "text-white/85 rounded-tl-sm"
                        }`}
                        style={
                          m.role === "user"
                            ? { background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }
                            : { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }
                        }
                      >
                        {m.content}
                        {m.isStreaming && (
                          <span className="inline-block w-0.5 h-3 bg-white/60 animate-pulse ml-0.5 align-middle" />
                        )}
                      </div>
                      {m.role === "assistant" && !m.isStreaming && (m.modelUsed || (m.coinsUsed != null && m.coinsUsed > 0)) && (
                        <div className="flex items-center gap-1.5 px-1">
                          {m.modelUsed && (
                            <span className="text-[9px] text-white/25">
                              {MODEL_EMOJI[m.modelUsed] ?? "🤖"} {m.modelUsed}
                            </span>
                          )}
                          {m.coinsUsed != null && m.coinsUsed > 0 && (
                            <span className="text-[9px] font-bold text-amber-400/50">• {m.coinsUsed}🪙</span>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </>
            )}

            {/* Typing indicator — only before first streaming chunk arrives */}
            {loading && !messages.some(m => m.isStreaming) && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2"
              >
                <div className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <div className="rounded-2xl rounded-tl-sm px-3 py-2.5 flex items-center gap-1"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {[0, 0.15, 0.3].map((d, idx) => (
                    <motion.span
                      key={idx}
                      className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]"
                      animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                      transition={{ duration: 0.9, repeat: Infinity, delay: d }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Coins exhausted card */}
            {coinsError && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-amber-500/30 bg-amber-500/[0.08] p-3 flex flex-col gap-2.5"
              >
                <div className="flex items-start gap-2">
                  <span className="text-base mt-0.5">🪙</span>
                  <div>
                    <p className="text-xs font-bold text-amber-300">Out of Coins!</p>
                    <p className="text-[10px] text-amber-400/70 mt-0.5 leading-relaxed">{coinsError.message}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                      <span className="text-amber-400">Need: <b>{coinsError.coinsNeeded}🪙</b></span>
                      <span className="text-amber-400/60">Have: <b>{coinsError.currentCoins}🪙</b></span>
                    </div>
                  </div>
                </div>
                <a
                  href="/dashboard/wallet/buy-coins"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 px-3 py-2 text-[10px] font-bold text-amber-300 hover:bg-amber-500/30 transition-colors"
                >
                  <ShoppingCart className="w-3 h-3" /> Buy Coins
                </a>
              </motion.div>
            )}

            {/* Quality warning card */}
            {qualityWarning && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-violet-500/30 bg-violet-500/[0.08] p-3 flex flex-col gap-2.5"
              >
                <div>
                  <p className="text-xs font-bold text-violet-300">Premium model required</p>
                  <p className="text-[10px] text-violet-400/70 mt-0.5 leading-relaxed">
                    {qualityWarning.preferredModel} needs <b>{qualityWarning.preferredModelCoins}🪙</b>,
                    but you only have <b>{qualityWarning.currentCoins}🪙</b>.
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <a
                    href="/dashboard/wallet/buy-coins"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-violet-500/20 border border-violet-500/30 px-2 py-2 text-[10px] font-bold text-violet-300 hover:bg-violet-500/30 transition-colors"
                  >
                    <ShoppingCart className="w-2.5 h-2.5" /> Buy Coins
                  </a>
                  <button
                    onClick={handleAcceptLowerQuality}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-white/5 border border-white/10 px-2 py-2 text-[10px] font-semibold text-white/50 hover:text-white/70 hover:bg-white/10 transition-colors disabled:opacity-40"
                  >
                    {MODEL_EMOJI[qualityWarning.fallbackModel] ?? "🤖"} {qualityWarning.fallbackModel}
                    <span className="text-white/30 ml-1">({qualityWarning.fallbackModelCoins}🪙)</span>
                  </button>
                </div>
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 flex-shrink-0 border-t border-white/5">
            {imageBase64 && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-2 py-1.5">
                <img
                  src={`data:${imageMediaType};base64,${imageBase64}`}
                  alt="upload preview"
                  className="h-8 w-8 object-cover rounded"
                />
                <span className="flex-1 text-[10px] text-white/50 truncate">Image attached</span>
                <button onClick={() => setImageBase64(null)} className="text-white/30 hover:text-rose-400 transition-colors">
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 focus-within:border-[#6366F1]/50 transition-colors">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImageSelect}
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={loading}
                title="Attach a photo of your question"
                className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-white/30 hover:text-violet-400 transition-colors disabled:opacity-30"
              >
                <ImagePlus className="w-4 h-4" />
              </button>
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 80) + "px";
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything... (Enter to send)"
                disabled={loading}
                className="flex-1 bg-transparent text-xs text-white placeholder:text-white/25 outline-none resize-none leading-relaxed disabled:opacity-50"
                style={{ minHeight: "20px", maxHeight: "80px" }}
              />
              <button
                onClick={() => send(input)}
                disabled={(!input.trim() && !imageBase64) || loading}
                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}
              >
                {loading
                  ? <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                  : <Send className="w-3.5 h-3.5 text-white" />
                }
              </button>
            </div>
            <p className="mt-1.5 text-[9px] text-white/20 text-center">
              Enter = send • Shift+Enter = new line • 📷 = photo of question
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
