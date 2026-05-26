"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Sparkles, RotateCcw, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Message = { role: "user" | "assistant"; content: string };

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
  const [freeLeft,       setFreeLeft]       = useState<number | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const pendingRetryMsgs = useRef<Message[] | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const sendRef    = useRef(send);

  useEffect(() => { sendRef.current = send; });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  // Auto-send when a prompt is passed from outside (section card quick prompts)
  useEffect(() => {
    if (!initialPrompt) return;
    onPromptConsumed?.();
    const t = setTimeout(() => sendRef.current(initialPrompt), 200);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialPrompt]);

  // Countdown ticker — auto-retry when it reaches 0
  useEffect(() => {
    if (retryCountdown === null) return;
    if (retryCountdown <= 0) {
      const msgs = pendingRetryMsgs.current;
      pendingRetryMsgs.current = null;
      setRetryCountdown(null);
      if (msgs) {
        setMessages((prev) => prev.slice(0, -1)); // remove the rate-limit error bubble
        callApi(msgs);
      }
      return;
    }
    const t = setTimeout(() => setRetryCountdown((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  // callApi is defined with useCallback below and is stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCountdown]);

  const callApi = useCallback(async (msgs: Message[]) => {
    setLoading(true);
    try {
      const res = await fetch("/api/meet-addon/studymate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ messages: msgs }),
      });

      const data = await res.json().catch(() => ({ error: "Response parse error" }));

      if (!res.ok) {
        if (data.retryable) {
          pendingRetryMsgs.current = msgs;
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `${data.error ?? "Abhi bahut log AI use kar rahe hain 🙏"} — ${RETRY_SECONDS}s mein auto-retry hoga.` },
          ]);
          setRetryCountdown(RETRY_SECONDS);
          return;
        }

        const errMsg =
          data.error === "coins_required"
            ? (data.message ?? "Coins khatam ho gaye! Study room mein jaao coins kamao 🪙")
            : res.status === 401
              ? "Session expire ho gayi. Panel se logout karke dobara login karo."
              : res.status === 503 || data.error === "AI not configured"
                ? "StudyMate AI abhi available nahi hai. Admin se contact karo."
                : res.status === 504 || data.error?.includes("timed out")
                  ? "AI timeout ho gayi. Thodi der baad try karo."
                  : data.error || `Error ${res.status}. Dobara try karo.`;

        setMessages((prev) => [...prev, { role: "assistant", content: errMsg }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
        if (data.freeMessagesLeft !== undefined) setFreeLeft(data.freeMessagesLeft);
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

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    // Cancel any pending auto-retry
    setRetryCountdown(null);
    pendingRetryMsgs.current = null;
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
    setFreeLeft(null);
    setRetryCountdown(null);
    pendingRetryMsgs.current = null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 10 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="fixed bottom-6 right-6 z-[8998] w-[340px] h-[520px] rounded-2xl flex flex-col overflow-hidden border border-white/10"
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
                <p className="text-[9px] text-white/40 mt-0.5">
                  {freeLeft !== null ? `${freeLeft} free msgs left today` : "AI study buddy"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
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
            {messages.length === 0 ? (
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
              messages.map((m, i) => (
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
                  <div
                    className={`max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
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
                </motion.div>
              ))
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

            {/* Auto-retry countdown banner */}
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
