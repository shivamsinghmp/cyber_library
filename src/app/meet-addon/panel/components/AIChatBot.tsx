"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Sparkles, RotateCcw, Bot, Coins, ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Message = {
  role: "user" | "assistant";
  content: string;
  modelUsed?: string;
  coinsUsed?: number;
};

type CoinsError = { message: string; coinsNeeded: number; currentCoins: number };
type QualityWarning = {
  preferredModel: string; preferredModelCoins: number;
  fallbackModel: string; fallbackModelCoins: number; currentCoins: number;
};

function getToken(): string {
  try { return localStorage.getItem("vl_meet_addon_token") ?? ""; } catch { return ""; }
}

const QUICK_PROMPTS = [
  "Aaj study plan bana do",
  "Motivation chahiye",
  "Shortcut trick batao",
  "Kal ka revision plan",
];

const RETRY_SECONDS = 30;

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
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [totalCoins,     setTotalCoins]     = useState<number | null>(null);
  const [coinsError,     setCoinsError]     = useState<CoinsError | null>(null);
  const [qualityWarning, setQualityWarning] = useState<QualityWarning | null>(null);

  const pendingRetryMsgs   = useRef<Message[] | null>(null);
  const pendingQualityMsgs = useRef<Message[] | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const sendRef    = useRef(send);

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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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

  // Countdown ticker — auto-retry when reaches 0
  useEffect(() => {
    if (retryCountdown === null) return;
    if (retryCountdown <= 0) {
      const msgs = pendingRetryMsgs.current;
      pendingRetryMsgs.current = null;
      setRetryCountdown(null);
      if (msgs) {
        setMessages((prev) => prev.slice(0, -1));
        callApi(msgs);
      }
      return;
    }
    const t = setTimeout(() => setRetryCountdown((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCountdown]);

  const callApi = useCallback(async (msgs: Message[], acceptLower = false) => {
    setLoading(true);
    setCoinsError(null);
    setQualityWarning(null);
    try {
      const res = await fetch("/api/ai/studymate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          messages: msgs.map(m => ({ role: m.role, content: m.content })),
          acceptLowerQuality: acceptLower,
        }),
      });

      const data = await res.json().catch(() => ({ error: "Response parse error" }));

      if (!res.ok) {
        if (data.error === "coins_required") {
          setCoinsError({
            message: data.message ?? "Coins khatam ho gaye!",
            coinsNeeded: data.coinsNeeded ?? 1,
            currentCoins: data.currentCoins ?? 0,
          });
          if (data.currentCoins != null) setTotalCoins(data.currentCoins);
          return;
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
          return;
        }

        if (data.retryable) {
          // Silently retry with lower quality before showing busy banner
          try {
            const r2 = await fetch("/api/ai/studymate", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
              body: JSON.stringify({ messages: msgs.map(m => ({ role: m.role, content: m.content })), acceptLowerQuality: true }),
            });
            const d2 = await r2.json().catch(() => ({ error: "Parse error" }));
            if (r2.ok) {
              setMessages((prev) => [...prev, { role: "assistant", content: d2.reply, modelUsed: d2.modelUsed, coinsUsed: d2.coinsUsed }]);
              if (d2.coinsUsed != null) setTotalCoins(prev => prev != null ? Math.max(0, prev - d2.coinsUsed) : null);
              return;
            }
          } catch { /* fall through to countdown */ }

          pendingRetryMsgs.current = msgs;
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Abhi AI bahut busy hai 🙏 — ${RETRY_SECONDS}s mein auto-retry hoga.` },
          ]);
          setRetryCountdown(RETRY_SECONDS);
          return;
        }

        const errMsg =
          res.status === 401
            ? "Session expire ho gayi. Panel se logout karke dobara login karo."
            : res.status === 503 || data.error === "AI not configured"
              ? "StudyMate AI abhi available nahi hai. Admin se contact karo."
              : res.status === 504 || data.error?.includes("timed out")
                ? "AI timeout ho gayi. Thodi der baad try karo."
                : data.error || `Error ${res.status}. Dobara try karo.`;

        setMessages((prev) => [...prev, { role: "assistant", content: errMsg }]);
      } else {
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: data.reply,
          modelUsed: data.modelUsed,
          coinsUsed: data.coinsUsed,
        }]);
        if (data.coinsUsed != null) {
          setTotalCoins(prev => prev != null ? Math.max(0, prev - data.coinsUsed) : null);
        }
      }
    } catch {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Network error. Internet connection check karo.",
      }]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAcceptLowerQuality = async () => {
    const msgs = pendingQualityMsgs.current;
    if (!msgs) return;
    pendingQualityMsgs.current = null;
    setQualityWarning(null);
    await callApi(msgs, true);
  };

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setRetryCountdown(null);
    pendingRetryMsgs.current = null;
    setCoinsError(null);
    setQualityWarning(null);
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages);
    await callApi(newMessages);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  function clearChat() {
    setMessages([]);
    setRetryCountdown(null);
    setCoinsError(null);
    setQualityWarning(null);
    pendingRetryMsgs.current = null;
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
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
            {messages.length === 0 && !coinsError && !qualityWarning ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 pb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #6366F133, #8B5CF633)" }}>
                  <Bot className="w-7 h-7 text-[#8B5CF6]" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-white/80">Kuch bhi poochho!</p>
                  <p className="text-[10px] text-white/30 mt-1">Study plan, doubt, motivation — sab chalega</p>
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
                    key={i}
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
                      </div>
                      {m.role === "assistant" && (m.modelUsed || (m.coinsUsed != null && m.coinsUsed > 0)) && (
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

            {/* Typing indicator */}
            {loading && (
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
                  {[0, 0.15, 0.3].map((d, i) => (
                    <motion.span
                      key={i}
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
                    <p className="text-xs font-bold text-amber-300">Coins Khatam!</p>
                    <p className="text-[10px] text-amber-400/70 mt-0.5 leading-relaxed">{coinsError.message}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px]">
                      <span className="text-amber-400">Chahiye: <b>{coinsError.coinsNeeded}🪙</b></span>
                      <span className="text-amber-400/60">Paas: <b>{coinsError.currentCoins}🪙</b></span>
                    </div>
                  </div>
                </div>
                <a
                  href="/dashboard/wallet/buy-coins"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 px-3 py-2 text-[10px] font-bold text-amber-300 hover:bg-amber-500/30 transition-colors"
                >
                  <ShoppingCart className="w-3 h-3" /> Coins Kharido
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
                  <p className="text-xs font-bold text-violet-300">Premium model chahiye</p>
                  <p className="text-[10px] text-violet-400/70 mt-0.5 leading-relaxed">
                    {qualityWarning.preferredModel} ke liye <b>{qualityWarning.preferredModelCoins}🪙</b> chahiye,
                    tumhare paas sirf <b>{qualityWarning.currentCoins}🪙</b> hain.
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <a
                    href="/dashboard/wallet/buy-coins"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-violet-500/20 border border-violet-500/30 px-2 py-2 text-[10px] font-bold text-violet-300 hover:bg-violet-500/30 transition-colors"
                  >
                    <ShoppingCart className="w-2.5 h-2.5" /> Coins Kharido
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

            {/* Auto-retry countdown */}
            {retryCountdown !== null && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 py-1"
              >
                <span className="text-[10px] text-amber-400/70">
                  🔄 Auto-retry in {retryCountdown}s
                </span>
                <button
                  onClick={() => { setRetryCountdown(null); pendingRetryMsgs.current = null; }}
                  className="text-[10px] text-white/30 hover:text-white/60 underline transition-colors"
                >
                  cancel
                </button>
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 flex-shrink-0 border-t border-white/5">
            <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 focus-within:border-[#6366F1]/50 transition-colors">
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
                placeholder="Kuch bhi poochho... (Enter to send)"
                disabled={loading}
                className="flex-1 bg-transparent text-xs text-white placeholder:text-white/25 outline-none resize-none leading-relaxed disabled:opacity-50"
                style={{ minHeight: "20px", maxHeight: "80px" }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
            <p className="mt-1.5 text-[9px] text-white/20 text-center">
              Enter = send • Shift+Enter = new line
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
