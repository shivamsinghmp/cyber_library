"use client";

import { useState } from "react";
import { Send, X, Reply } from "lucide-react";
import toast from "react-hot-toast";

export function SupportReplyModal({ defaultEmail }: { defaultEmail: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [to, setTo] = useState(defaultEmail);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!to || !subject || !message) return toast.error("Please fill all fields");

    setLoading(true);
    try {
      const res = await fetch("/api/admin/email/send-custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, message }),
      });

      if (res.ok) {
        toast.success("Reply sent from Support Email!");
        setIsOpen(false);
        setMessage("");
        setSubject("");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to send email");
      }
    } catch {
      toast.error("Network error");
    }
    setLoading(false);
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-[var(--wood)]/10 hover:bg-[var(--wood)]/20 text-[var(--accent)] font-semibold rounded-xl transition border border-[var(--wood)]/20"
      >
        <Reply className="w-4 h-4" />
        Reply via Support Email
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--ink)] border border-[var(--wood)]/20 rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-[var(--wood)]/10">
              <h3 className="text-xl font-bold text-[var(--cream)] flex items-center gap-2">
                <Reply className="w-5 h-5 text-[var(--wood)]" /> 
                Compose Custom Reply
              </h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-[var(--cream)]/50 hover:text-[var(--cream)] p-1 rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSend} className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-[var(--cream)]/60 mb-1">To</label>
                <input 
                  required
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full bg-black/40 border border-[var(--wood)]/20 rounded-xl px-4 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)] outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--cream)]/60 mb-1">Subject</label>
                <input 
                  required
                  type="text"
                  placeholder="Re: Your Support Request"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-black/40 border border-[var(--wood)]/20 rounded-xl px-4 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)] outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--cream)]/60 mb-1">Message (Text format)</label>
                <textarea 
                  required
                  rows={6}
                  placeholder="Type your response here. It will be injected into the {{message}} space of your SUPPORT_REPLY template."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-black/40 border border-[var(--wood)]/20 rounded-xl px-4 py-2.5 text-sm text-[var(--cream)] focus:border-[var(--accent)] outline-none transition resize-none"
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 bg-[var(--accent)] text-[var(--ink)] font-bold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {loading ? "Sending..." : "Send via SUPPORT"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
