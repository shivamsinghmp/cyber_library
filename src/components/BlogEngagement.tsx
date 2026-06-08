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

  useEffect(() => {
    const trackView = async () => {
      try {
        const res = await fetch(`/api/blog/${slug}/view`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          setViews(data.views);
        }
      } catch {}
    };
    trackView();
  }, [slug]);

  const loadComments = async () => {
    try {
      const res = await fetch(`/api/blog/${slug}/comments`);
      if (res.ok) setComments(await res.json());
    } catch {}
    finally { setLoadingComments(false); }
  };

  useEffect(() => { loadComments(); }, [slug]);

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
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to post comment");
      }
      setNewComment("");
      toast.success("Comment added!");
      await loadComments();
    } catch (e: unknown) {
      toast.error((e as Error).message || "Failed to post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Stats row */}
      <div className="flex items-center gap-6 pb-6 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ background: "var(--accent-pale)" }}>
            <Eye className="h-4 w-4" style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{views}</p>
            <p className="text-[10px] font-semibold" style={{ color: "var(--muted-text)" }}>Views</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ background: "#EFF6FF" }}>
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: "var(--foreground)" }}>{comments.length}</p>
            <p className="text-[10px] font-semibold" style={{ color: "var(--muted-text)" }}>Comments</p>
          </div>
        </div>
      </div>

      {/* Discussion */}
      <div className="space-y-6">
        <h3 className="text-lg font-extrabold tracking-tight" style={{ color: "var(--foreground)" }}>
          Discussion
        </h3>

        {/* Comment form */}
        {session?.user ? (
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts or questions..."
              className="w-full rounded-2xl border px-4 py-3 pr-14 text-sm leading-relaxed outline-none transition-all"
              style={{
                borderColor: "var(--border)",
                background: "var(--page-bg)",
                color: "var(--foreground)",
              }}
              onFocus={e => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.08)"; }}
              onBlur={e  => { e.target.style.borderColor = "var(--border)";  e.target.style.boxShadow = "none"; }}
              rows={3}
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl text-white shadow transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        ) : (
          <div className="rounded-2xl border px-6 py-5 text-center"
            style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
              Log in to join the discussion.
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--muted-text)" }}>
              (Spam prevention enabled)
            </p>
          </div>
        )}

        {/* Comment list */}
        <div className="space-y-4">
          {loadingComments ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--accent)" }} />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-sm font-medium py-6" style={{ color: "var(--muted-text)" }}>
              No comments yet. Be the first to comment!
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id}
                className="rounded-2xl border p-5 transition-all hover:shadow-sm"
                style={{ borderColor: "var(--border)", background: "var(--page-bg)" }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white font-bold text-sm"
                    style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
                    {comment.user.image ? (
                      <img src={comment.user.image} alt="User" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <span className="uppercase">{comment.user.name?.[0] || "?"}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--foreground)" }}>
                      {comment.user.name || "Anonymous Student"}
                      {comment.user.role === "ADMIN" && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white"
                          style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
                          Admin
                        </span>
                      )}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--muted-text)" }}>
                      {new Date(comment.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                      {" · "}
                      {new Date(comment.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--body-text)" }}>
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
