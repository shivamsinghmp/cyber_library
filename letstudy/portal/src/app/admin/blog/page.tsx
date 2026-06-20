"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Plus, Pencil, Trash2, Eye, MessageSquare,
  Globe, FileText, ChevronLeft, Search,
} from "lucide-react";
import toast from "react-hot-toast";

type BlogPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImage: string | null;
  publishedAt: string | null;
  views: number;
  _count: { comments: number };
  createdAt: string;
  updatedAt: string;
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/blog", { credentials: "include" });
      if (res.ok) setPosts(await res.json());
    } catch { setPosts([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/blog/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) { toast.success("Post deleted"); setPosts((p) => p.filter((x) => x.id !== id)); }
      else toast.error("Delete failed");
    } catch { toast.error("Delete failed"); }
    setDeleting(null);
  }

  const filtered = posts.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase())
  );

  const published = posts.filter((p) => p.publishedAt && new Date(p.publishedAt) <= new Date()).length;
  const drafts = posts.length - published;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-[var(--cream-muted)] hover:text-[var(--accent)]">
            <ChevronLeft className="h-4 w-4" /> Admin
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-[var(--foreground)]">Blog Posts</h1>
        </div>
        <Link
          href="/admin/blog/new"
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm"
          style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}
        >
          <Plus className="h-4 w-4" /> New Post
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: posts.length, icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200" },
          { label: "Published", value: published, icon: Globe, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
          { label: "Drafts", value: drafts, icon: FileText, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`rounded-2xl border ${border} ${bg} p-4`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--cream-muted)]">{label}</p>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <p className={`mt-1 text-3xl font-extrabold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--cream-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search posts…"
          className="w-full rounded-xl border border-[var(--border)] bg-white pl-9 pr-4 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow-sm)]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent)] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-[var(--cream-muted)]">No posts found.</p>
            <Link href="/admin/blog/new" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)] hover:underline">
              <Plus className="h-4 w-4" /> Create your first post
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                  {["Post", "Status", "Views", "Comments", "Updated", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-[var(--cream-muted)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((post) => {
                  const isPublished = !!post.publishedAt && new Date(post.publishedAt) <= new Date();
                  return (
                    <tr key={post.id} className="group hover:bg-[var(--background)] transition-colors">
                      {/* Post info */}
                      <td className="px-4 py-3 max-w-xs">
                        <div className="flex items-center gap-3">
                          {post.coverImage && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={post.coverImage} alt="" className="h-10 w-14 flex-shrink-0 rounded-lg object-cover" />
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-[var(--foreground)] truncate">{post.title}</p>
                            <p className="text-xs text-[var(--cream-muted)] truncate">/blog/{post.slug}</p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          isPublished ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {isPublished ? <><Globe className="h-3 w-3" /> Published</> : <><FileText className="h-3 w-3" /> Draft</>}
                        </span>
                        {post.publishedAt && (
                          <p className="mt-0.5 text-[10px] text-[var(--cream-muted)]">{fmtDate(post.publishedAt)}</p>
                        )}
                      </td>

                      {/* Views */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-[var(--cream-muted)]">
                          <Eye className="h-3.5 w-3.5" />
                          <span className="font-medium text-[var(--foreground)]">{post.views.toLocaleString()}</span>
                        </div>
                      </td>

                      {/* Comments */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-[var(--cream-muted)]">
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span className="font-medium text-[var(--foreground)]">{post._count.comments}</span>
                        </div>
                      </td>

                      {/* Updated */}
                      <td className="px-4 py-3 text-xs text-[var(--cream-muted)]">
                        {fmtDate(post.updatedAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            href={`/admin/blog/${post.id}/edit`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--cream-muted)] hover:bg-indigo-50 hover:text-indigo-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          {isPublished && (
                            <a
                              href={`/blog/${post.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--cream-muted)] hover:bg-emerald-50 hover:text-emerald-600"
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDelete(post.id, post.title)}
                            disabled={deleting === post.id}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--cream-muted)] hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
