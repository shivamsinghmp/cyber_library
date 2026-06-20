"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Send, MessageSquare, Star, Bug, Lightbulb, Activity, Mail, Clock, CheckCircle2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = [
  { id: "BUG",             label: "Bug Report",       icon: Bug,           color: "text-rose-600",              bg: "bg-rose-50 border-rose-200",              active: "border-rose-400 bg-rose-50" },
  { id: "FEATURE_REQUEST", label: "Suggest Feature",  icon: Lightbulb,     color: "text-amber-600",             bg: "bg-amber-50 border-amber-200",            active: "border-amber-400 bg-amber-50" },
  { id: "UI_UX",           label: "Design Issue",     icon: MessageSquare, color: "text-blue-600",              bg: "bg-blue-50 border-blue-200",              active: "border-blue-400 bg-blue-50" },
  { id: "PERFORMANCE",     label: "Performance",      icon: Activity,      color: "text-emerald-600",           bg: "bg-emerald-50 border-emerald-200",        active: "border-emerald-400 bg-emerald-50" },
  { id: "OTHER",           label: "Other",            icon: Mail,          color: "text-[var(--accent)]",       bg: "bg-[var(--accent-pale)] border-[var(--accent-border)]", active: "border-[var(--accent)] bg-[var(--accent-pale)]" },
];

const STATUS_BADGE: Record<string, string> = {
  OPEN:        "bg-rose-50 border-rose-200 text-rose-600",
  IN_PROGRESS: "bg-amber-50 border-amber-200 text-amber-600",
  RESOLVED:    "bg-emerald-50 border-emerald-200 text-emerald-600",
};

export default function FeedbackPage() {
  const [category, setCategory]       = useState("");
  const [message, setMessage]         = useState("");
  const [rating, setRating]           = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess]     = useState(false);
  const [pastFeedbacks, setPastFeedbacks] = useState<any[]>([]);
  const [loadingPast, setLoadingPast] = useState(true);

  useEffect(() => { fetchPast(); }, []);

  async function fetchPast() {
    try {
      const res = await fetch("/api/feedback");
      if (res.ok) setPastFeedbacks((await res.json()).feedbacks || []);
    } catch {} finally { setLoadingPast(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) return toast.error("Please select a feedback category");
    if (!message.trim()) return toast.error("Please describe your feedback");
    if (!rating) return toast.error("Please give a satisfaction rating");
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message, rating }),
      });
      if (!res.ok) throw new Error();
      setIsSuccess(true);
      fetchPast();
    } catch { toast.error("Failed to submit. Please try again."); }
    finally { setIsSubmitting(false); }
  }

  const RATING_LABELS = ["", "Very Poor", "Poor", "Average", "Good", "Excellent"];

  if (isSuccess) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="text-center space-y-5 max-w-sm p-8 bg-white rounded-3xl border border-[var(--border)] shadow-[var(--shadow-lg)]">
          <div className="mx-auto w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-[var(--foreground)]">Feedback Sent!</h2>
          <p className="text-sm text-[var(--muted-text)] leading-relaxed">Thank you for helping us improve. Our team will review your feedback shortly.</p>
          <button onClick={() => { setIsSuccess(false); setMessage(""); setCategory(""); setRating(0); }}
            className="w-full py-3 rounded-xl bg-[var(--accent-pale)] border border-[var(--accent-border)] text-[var(--accent)] font-bold text-sm hover:bg-[var(--accent)] hover:text-white transition-all">
            Submit Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-6 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--accent-pale)] border border-[var(--accent-border)] flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Feedback</h1>
          <p className="text-xs text-[var(--muted-text)]">Your feedback goes directly to the developers</p>
        </div>
      </div>

      {/* Feedback Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden">

        {/* Step 1: Category */}
        <div className="px-6 py-5 border-b border-[var(--border)]">
          <p className="text-xs font-bold text-[var(--muted-text)] uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-[var(--accent)] text-white text-[10px] font-black flex items-center justify-center">1</span>
            What type of feedback?
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {CATEGORIES.map(cat => (
              <button key={cat.id} type="button" onClick={() => setCategory(cat.id)}
                className={`flex flex-col items-center gap-2.5 rounded-xl border p-3.5 transition-all ${
                  category === cat.id ? `${cat.active} shadow-sm scale-[1.02]` : "border-[var(--border)] bg-[var(--page-bg)] hover:bg-white hover:border-[var(--accent-border)]"
                }`}>
                <cat.icon className={`w-5 h-5 ${category === cat.id ? cat.color : "text-[var(--muted-text)]"}`} />
                <span className={`text-[10px] font-bold uppercase tracking-wide text-center leading-tight ${category === cat.id ? cat.color : "text-[var(--muted-text)]"}`}>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Message */}
        <div className="px-6 py-5 border-b border-[var(--border)]">
          <p className="text-xs font-bold text-[var(--muted-text)] uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-[var(--accent)] text-white text-[10px] font-black flex items-center justify-center">2</span>
            Describe the issue or idea
          </p>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
            placeholder="Tell us everything. What went wrong? What would you like to see? Be as specific as possible..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--page-bg)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--placeholder)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 transition-all resize-none" />
          <p className="text-right text-[10px] text-[var(--muted-text)] mt-1">{message.length} chars</p>
        </div>

        {/* Step 3: Rating */}
        <div className="px-6 py-5 border-b border-[var(--border)]">
          <p className="text-xs font-bold text-[var(--muted-text)] uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-[var(--accent)] text-white text-[10px] font-black flex items-center justify-center">3</span>
            Rate your overall experience
          </p>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button key={star} type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="p-1 transition-transform hover:scale-110">
                <Star className={`w-8 h-8 transition-all ${star <= (hoverRating || rating) ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "text-[var(--border)]"}`} />
              </button>
            ))}
            {(hoverRating || rating) > 0 && (
              <span className="ml-2 text-sm font-bold text-[var(--body-text)]">{RATING_LABELS[hoverRating || rating]}</span>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="px-6 py-5">
          <button type="submit" disabled={isSubmitting}
            className="w-full py-3.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-[var(--shadow-brand)] text-sm">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isSubmitting ? "Sending..." : "Send Feedback"}
          </button>
        </div>
      </form>

      {/* Past Feedback */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-sm font-bold text-[var(--foreground)]">Your Past Feedback</h2>
          {pastFeedbacks.length > 0 && <span className="ml-auto text-xs text-[var(--muted-text)] bg-[var(--page-bg)] border border-[var(--border)] px-2 py-0.5 rounded-full">{pastFeedbacks.length}</span>}
        </div>

        {loadingPast ? (
          <div className="h-20 rounded-2xl bg-[var(--page-bg)] border border-[var(--border)] animate-pulse" />
        ) : pastFeedbacks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] px-6 py-10 text-center">
            <MessageSquare className="w-8 h-8 text-[var(--muted-text)] mx-auto mb-2 opacity-40" />
            <p className="text-sm text-[var(--muted-text)]">You haven't submitted any feedback yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pastFeedbacks.map(f => {
              const cat = CATEGORIES.find(c => c.id === f.category);
              const Icon = cat?.icon || Mail;
              return (
                <div key={f.id} className="bg-white rounded-2xl border border-[var(--border)] shadow-[var(--shadow-sm)] p-5 hover:shadow-[var(--shadow-md)] transition-shadow">
                  <div className="flex items-start justify-between mb-3 pb-3 border-b border-[var(--border)]">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${cat?.bg || "bg-[var(--page-bg)] border-[var(--border)]"}`}>
                        <Icon className={`w-4 h-4 ${cat?.color || "text-[var(--muted-text)]"}`} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wide">{f.category.replace("_", " ")}</p>
                        <p className="text-[10px] text-[var(--muted-text)]">{format(new Date(f.createdAt), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${STATUS_BADGE[f.status] || STATUS_BADGE.OPEN}`}>
                      {f.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--body-text)] line-clamp-3 mb-3 leading-relaxed">{f.message}</p>
                  {f.rating > 0 && (
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < f.rating ? "fill-amber-400 text-amber-400" : "text-[var(--border)]"}`} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
