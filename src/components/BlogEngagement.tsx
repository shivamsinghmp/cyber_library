"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Eye, MessageSquare, Loader2, Send } from "lucide-react";
import toast from "react-hot-toast";

type CommentType = {
  id: string;
  content: string;
  createdAt: string;
  user: { name: string | null; image: string | null; role: string };
};

export function BlogEngagement({ slug, initialViews = 0 }: { slug: string; initialViews?: number }) {
  const { data: session } = useSession();
  const [views, setViews] = useState(initialViews);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingComments, setLoadingComments] = useState(true);

  // Track view once on mount
  useEffect(() => {
    const trackView = async () => {
      try {
        const res = await fetch(`/api/blog/${slug}/view`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          setViews(data.views);
        }
      } catch (e) {
        console.error("View tracking failed");
      }
    };
    trackView();
  }, [slug]);

  // Load comments
  const loadComments = async () => {
    try {
      const res = await fetch(`/api/blog/${slug}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (e) {
      console.error("Error loading comments", e);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    loadComments();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/blog/${slug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to post comment");
      }
      setNewComment("");
      toast.success("Comment added!");
      await loadComments();
    } catch (e: any) {
      toast.error(e.message || "Failed to post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-16 space-y-12 border-t border-white/10 pt-10">
      {/* Metrics Bar */}
      <div className="flex items-center gap-6 text-[var(--cream-muted)]">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-[var(--accent)]" />
          <span className="font-semibold text-[var(--cream)]">{views} <span className="font-normal text-sm opacity-80">Views</span></span>
        </div>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-400" />
          <span className="font-semibold text-[var(--cream)]">{comments.length} <span className="font-normal text-sm opacity-80">Comments</span></span>
        </div>
      </div>

      {/* Discussion Section */}
      <div className="space-y-8">
        <h3 className="text-xl font-bold text-[var(--cream)] tracking-tight">Discussion</h3>

        {/* Comment Form */}
        {session?.user ? (
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts or questions safely..."
              className="w-full rounded-2xl border border-[var(--wood)]/20 bg-white/5 p-4 pr-16 text-sm text-[var(--cream)] placeholder-[var(--cream-muted)]/60 focus:border-[var(--accent)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/50 transition-all placeholder:font-medium"
              rows={3}
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--ink)] shadow-md transition hover:scale-105 hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:hover:scale-100"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        ) : (
          <div className="rounded-2xl border border-[var(--wood)]/10 bg-white/[0.02] p-6 text-center shadow-inner">
            <p className="text-sm font-medium text-[var(--cream-muted)]">You must be a verified student to join the discussion.</p>
            <p className="mt-2 text-xs text-[var(--cream-muted)]/60">(Spam prevention enabled)</p>
          </div>
        )}

        {/* Comment List */}
        <div className="space-y-5">
          {loadingComments ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--wood)]/50" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-sm font-medium text-[var(--cream-muted)] opacity-60">No comments yet. Be the first to share your thoughts!</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="group relative rounded-2xl border border-[var(--wood)]/10 bg-[var(--ink)]/40 p-5 shadow-sm transition hover:bg-white/[0.03]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--wood)]/10 text-[var(--wood)] ring-1 ring-[var(--wood)]/20">
                    {comment.user.image ? (
                      <img src={comment.user.image} alt="User" className="h-10 w-10 rounded-full" />
                    ) : (
                      <span className="font-bold text-sm uppercase">{comment.user.name?.[0] || "?"}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[var(--cream)]">
                      {comment.user.name || "Anonymous Student"}
                      {comment.user.role === "ADMIN" && <span className="ml-2 rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] uppercase text-[var(--accent)] ring-1 ring-inset ring-[var(--accent)]/30">Admin</span>}
                    </p>
                    <p className="text-xs font-semibold text-[var(--cream-muted)]/60">
                      {new Date(comment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(comment.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-[var(--cream-muted)] font-medium">
                  {comment.content}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
