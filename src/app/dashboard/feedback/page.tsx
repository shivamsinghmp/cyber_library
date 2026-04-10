"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageSquare, Star, Bug, Lightbulb, Activity, Mail, Clock, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

const CATEGORIES = [
  { id: "BUG", label: "Report a Bug", icon: Bug, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30" },
  { id: "FEATURE_REQUEST", label: "Suggest Feature", icon: Lightbulb, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  { id: "UI_UX", label: "Design Issue", icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30" },
  { id: "PERFORMANCE", label: "Performance", icon: Activity, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  { id: "OTHER", label: "Other", icon: Mail, color: "text-[var(--cream)]", bg: "bg-white/10", border: "border-white/30" }
];

export default function FeedbackPage() {
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [pastFeedbacks, setPastFeedbacks] = useState<any[]>([]);
  const [loadingPast, setLoadingPast] = useState(true);

  useEffect(() => {
    fetchPastFeedbacks();
  }, []);

  async function fetchPastFeedbacks() {
    try {
      const res = await fetch("/api/feedback");
      if (res.ok) {
        const data = await res.json();
        setPastFeedbacks(data.feedbacks || []);
      }
    } catch {
      //
    } finally {
      setLoadingPast(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) return toast.error("Please select a feedback category");
    if (!message.trim()) return toast.error("Please describe your feedback");
    if (!rating) return toast.error("Please provide a satisfaction rating");

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message, rating }),
      });

      if (!res.ok) throw new Error("Failed to submit");
      setIsSuccess(true);
      fetchPastFeedbacks();
    } catch (e) {
      toast.error("An error occurred while submitting. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           className="text-center space-y-6 max-w-md p-8 rounded-[2rem] border border-[var(--accent)]/30 bg-gradient-to-br from-[var(--accent)]/10 to-black/60 backdrop-blur-2xl shadow-2xl"
        >
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[var(--accent)]/20 border border-[var(--accent)]/40 shadow-[0_0_40px_rgba(var(--accent-rgb),0.4)]">
            <Send className="h-10 w-10 text-[var(--accent)]" />
          </div>
          <h2 className="text-3xl font-extrabold text-[var(--cream)] tracking-tight">Feedback Sent!</h2>
          <p className="text-sm text-[var(--cream-muted)] leading-relaxed">
            Thank you for helping us improve The Cyber Library. Your insights are invaluable and our team is already on it.
          </p>
          <button
            onClick={() => { setIsSuccess(false); setMessage(""); setCategory(""); setRating(0); }}
            className="mt-4 rounded-xl bg-white/5 hover:bg-white/10 px-6 py-3 text-sm font-bold text-[var(--cream)] transition-all"
          >
            Submit Another
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl pb-16 space-y-12">
      <div>
        <div className="mb-10 text-center">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-flex items-center gap-3 rounded-2xl bg-[var(--accent)]/10 px-5 py-2 border border-[var(--accent)]/20 mb-6 shadow-inner">
           <MessageSquare className="h-5 w-5 text-[var(--accent)]" />
           <span className="text-sm font-bold uppercase tracking-widest text-[var(--accent)]">Advanced Feedback</span>
        </motion.div>
        <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="text-4xl font-extrabold text-[var(--cream)] tracking-tight md:text-5xl">
          Help Us <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent)] to-amber-300">Improve.</span>
        </motion.h1>
        <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="mt-4 text-[var(--cream-muted)] max-w-lg mx-auto">
          Your direct feedback goes straight to the developers. Let us know how we can make your study experience perfectly seamless.
        </motion.p>
      </div>

      <motion.form 
         initial={{ y: 30, opacity: 0 }} 
         animate={{ y: 0, opacity: 1 }} 
         transition={{ delay: 0.3 }}
         onSubmit={handleSubmit} 
         className="space-y-8 rounded-[2rem] border border-white/10 bg-black/40 p-6 md:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden"
      >
        <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-[var(--accent)]/10 blur-[80px] pointer-events-none" />
        
        {/* Step 1: Category */}
        <div className="relative z-10 space-y-4">
          <label className="text-sm font-bold uppercase tracking-wider text-[var(--cream-muted)] flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--wood)]/20 text-[var(--wood)]">1</div>
            What type of feedback is this?
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`flex flex-col items-center gap-3 rounded-2xl border p-4 transition-all duration-300 ${
                  category === cat.id
                    ? `${cat.border} ${cat.bg} shadow-[0_0_20px_rgba(255,255,255,0.05)] scale-[1.02]`
                    : "border-white/5 bg-black/20 hover:bg-white/5 hover:border-white/10"
                }`}
              >
                <cat.icon className={`h-6 w-6 ${category === cat.id ? cat.color : "text-white/40"}`} />
                <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${category === cat.id ? "text-[var(--cream)]" : "text-white/50"}`}>
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Message */}
        <div className="relative z-10 space-y-4">
          <label className="text-sm font-bold uppercase tracking-wider text-[var(--cream-muted)] flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--wood)]/20 text-[var(--wood)]">2</div>
            Describe the details
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us everything. What went wrong? What would you like to see?"
            className="w-full min-h-[160px] resize-none rounded-2xl border border-white/10 bg-black/50 p-5 text-sm text-[var(--cream)] outline-none transition focus:border-[var(--accent)] focus:bg-white/5 placeholder:text-white/20"
          />
        </div>

        {/* Step 3: Rating */}
        <div className="relative z-10 space-y-4">
          <label className="text-sm font-bold uppercase tracking-wider text-[var(--cream-muted)] flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--wood)]/20 text-[var(--wood)]">3</div>
            Rate your overall platform experience
          </label>
          <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-black/30 p-6">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110 p-1"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (hoverRating || rating)
                        ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                        : "text-white/20"
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--cream-muted)] opacity-60">
              {rating === 1 && "Very Poor"}
              {rating === 2 && "Poor"}
              {rating === 3 && "Average"}
              {rating === 4 && "Good"}
              {rating === 5 && "Excellent"}
            </span>
          </div>
        </div>

        {/* Submit */}
        <div className="relative z-10 pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-amber-500 px-8 py-4 text-base font-bold uppercase tracking-widest text-[#111] transition-all hover:scale-[1.01] hover:shadow-[0_0_40px_rgba(var(--accent-rgb),0.5)] disabled:opacity-50 disabled:hover:scale-100"
          >
            {isSubmitting ? "Transmitting..." : "Send Feedback"}
            <Send className="h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
          </button>
        </div>
      </motion.form>
      </div>

      {/* Past Feedbacks Section */}
      <div className="pt-8 border-t border-white/10">
        <h2 className="text-xl font-bold text-[var(--cream)] flex items-center gap-2 mb-6">
           <Clock className="h-5 w-5 text-[var(--accent)]" /> Your Past Feedback
        </h2>

        {loadingPast ? (
           <div className="h-20 animate-pulse rounded-2xl bg-white/5"></div>
        ) : pastFeedbacks.length === 0 ? (
           <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center text-sm text-[var(--cream-muted)]">
             You haven't submitted any feedback yet.
           </div>
        ) : (
           <div className="grid gap-4 md:grid-cols-2">
             {pastFeedbacks.map((f) => {
               const Icon = CATEGORIES.find(c => c.id === f.category)?.icon || Mail;
               return (
                 <div key={f.id} className="rounded-[1.5rem] border border-white/10 bg-black/40 p-5 shadow-lg backdrop-blur-xl transition hover:bg-black/60 relative overflow-hidden group">
                    <div className="flex items-start justify-between mb-3 border-b border-white/5 pb-3">
                       <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                             <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--cream-muted)] block">{f.category.replace("_", " ")}</span>
                            <span className="text-[10px] text-white/40 font-medium">{format(new Date(f.createdAt), "MMM d, yyyy")}</span>
                          </div>
                       </div>
                       <div className={`px-2 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-widest border ${
                         f.status === 'OPEN' ? 'border-red-500/30 text-red-500 bg-red-500/10' :
                         f.status === 'IN_PROGRESS' ? 'border-amber-500/30 text-amber-500 bg-amber-500/10' :
                         'border-emerald-500/30 text-emerald-500 bg-emerald-500/10'
                       }`}>
                          {f.status.replace("_", " ")}
                       </div>
                    </div>
                    <p className="text-sm text-[var(--cream)] line-clamp-3 mb-3">{f.message}</p>
                    {f.rating && (
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                           <Star key={i} className={`h-3 w-3 ${i < f.rating ? 'fill-amber-500 text-amber-500' : 'text-white/20'}`} />
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
