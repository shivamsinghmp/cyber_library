import Link from "next/link";
import type { Metadata } from "next";
import { Calendar, Clock, ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const revalidate = 60; // ISR: rebuild at most every 60 s, serve static otherwise

export const metadata: Metadata = {
  title: "Blog – Study Tips & Focus Strategies | Let's Study",
  description: "Tips on how to focus, exam preparation, study habits, and deep work strategies. The official Let's Study blog.",
};

function formatDate(s: Date | string) {
  const d = typeof s === "string" ? new Date(s) : s;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function readTime(text: string | null) {
  if (!text) return "2 min";
  const words = text.trim().split(/\s+/).length;
  const mins  = Math.max(1, Math.ceil(words / 200));
  return `${mins} min`;
}

const CARD_COLORS = [
  { top: "linear-gradient(to right, #6366F1, #8B5CF6)", bg: "#EEF2FF", text: "#4F46E5" },
  { top: "linear-gradient(to right, #06B6D4, #3B82F6)", bg: "#ECFEFF", text: "#0891B2" },
  { top: "linear-gradient(to right, #10B981, #06B6D4)", bg: "#ECFDF5", text: "#059669" },
  { top: "linear-gradient(to right, #F59E0B, #EF4444)", bg: "#FFFBEB", text: "#D97706" },
  { top: "linear-gradient(to right, #8B5CF6, #EC4899)", bg: "#F5F3FF", text: "#7C3AED" },
];

export default async function BlogPage() {
  let posts: { slug: string; title: string; excerpt: string | null; publishedAt: Date | null }[] = [];
  try {
    posts = await prisma.blogPost.findMany({
      where:   { publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      select:  { slug: true, title: true, excerpt: true, publishedAt: true },
    });
  } catch {
    posts = [];
  }

  const [featured, ...rest] = posts;

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "var(--page-bg)" }}>

      {/* Ambient orbs */}
      <div className="pointer-events-none absolute top-0 right-0 h-[450px] w-[450px] rounded-full blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.10), transparent)" }} />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[350px] w-[350px] rounded-full blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(6,182,212,0.08), transparent)" }} />
      <div className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: "radial-gradient(circle, #6366F112 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">

        {/* ── HEADER ── */}
        <div className="mb-14 max-w-2xl">
          <div className="mb-4">
            <span className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.15em]"
              style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}>
              <BookOpen className="h-3.5 w-3.5" />
              Study & Focus Tips
            </span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl" style={{ color: "var(--foreground)" }}>
            Blog &{" "}
            <span className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
              Resources
            </span>
          </h1>

          <p className="mt-3 text-lg leading-relaxed" style={{ color: "var(--body-text)" }}>
            Real tips on how to focus, prepare for exams, and stay consistent.
          </p>
        </div>

        {/* ── EMPTY STATE ── */}
        {posts.length === 0 && (
          <div className="mx-auto max-w-sm rounded-2xl border bg-white py-16 text-center px-8"
            style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: "var(--accent-pale)", border: "1.5px solid var(--accent-border)" }}>
              <Sparkles className="h-8 w-8" style={{ color: "var(--accent)" }} />
            </div>
            <h3 className="text-lg font-extrabold mb-2" style={{ color: "var(--foreground)" }}>
              Coming Soon!
            </h3>
            <p className="text-sm" style={{ color: "var(--muted-text)" }}>
              No posts yet. Content will be added soon — check back later!
            </p>
            <Link href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
              ← Back to Home
            </Link>
          </div>
        )}

        {/* ── FEATURED POST ── */}
        {featured && (
          <div className="mb-8">
            <p className="mb-4 text-xs font-extrabold uppercase tracking-widest" style={{ color: "var(--accent)" }}>
              ✨ Latest Post
            </p>
            <Link href={`/${featured.slug}`}
              className="group block overflow-hidden rounded-[2rem] border bg-white transition-all hover:shadow-[var(--shadow-lg)] hover:-translate-y-1"
              style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-md)" }}>

              {/* Top gradient bar */}
              <div className="h-1.5 w-full"
                style={{ background: "linear-gradient(to right, #6366F1, #8B5CF6, #06B6D4)" }} />

              <div className="p-8 sm:p-10">
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  {featured.publishedAt && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold"
                      style={{ borderColor: "var(--border)", color: "var(--muted-text)", background: "var(--page-bg)" }}>
                      <Calendar className="h-3 w-3" />
                      {formatDate(featured.publishedAt)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold"
                    style={{ borderColor: "var(--accent-border)", color: "var(--accent)", background: "var(--accent-pale)" }}>
                    <Clock className="h-3 w-3" />
                    {readTime(featured.excerpt)} read
                  </span>
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-extrabold"
                    style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", color: "white" }}>
                    Featured
                  </span>
                </div>

                <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl leading-snug transition-colors group-hover:text-[var(--accent)] mb-4"
                  style={{ color: "var(--foreground)" }}>
                  {featured.title}
                </h2>

                {featured.excerpt && (
                  <p className="text-base leading-relaxed line-clamp-3 mb-6"
                    style={{ color: "var(--body-text)" }}>
                    {featured.excerpt}
                  </p>
                )}

                <span className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-extrabold text-white transition-all group-hover:gap-3"
                  style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 4px 14px rgba(99,102,241,0.35)" }}>
                  Read More
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </div>
        )}

        {/* ── REST OF POSTS ── */}
        {rest.length > 0 && (
          <>
            <p className="mb-5 text-xs font-extrabold uppercase tracking-widest" style={{ color: "var(--muted-text)" }}>
              More Articles
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post, idx) => {
                const color = CARD_COLORS[idx % CARD_COLORS.length];
                return (
                  <Link key={post.slug} href={`/${post.slug}`}
                    className="group flex flex-col overflow-hidden rounded-[1.75rem] border bg-white transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]"
                    style={{ borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>

                    {/* Color stripe */}
                    <div className="h-1.5 w-full" style={{ background: color.top }} />

                    <div className="flex flex-1 flex-col p-6">
                      {/* Meta row */}
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        {post.publishedAt && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold"
                            style={{ color: "var(--muted-text)" }}>
                            <Calendar className="h-3 w-3" />
                            {formatDate(post.publishedAt)}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold"
                          style={{ background: color.bg, color: color.text }}>
                          <Clock className="h-2.5 w-2.5" />
                          {readTime(post.excerpt)}
                        </span>
                      </div>

                      <h2 className="text-base font-extrabold leading-snug line-clamp-2 transition-colors group-hover:text-[var(--accent)] mb-3"
                        style={{ color: "var(--foreground)" }}>
                        {post.title}
                      </h2>

                      {post.excerpt && (
                        <p className="text-sm leading-relaxed line-clamp-3 flex-1"
                          style={{ color: "var(--body-text)" }}>
                          {post.excerpt}
                        </p>
                      )}

                      <div className="mt-5 flex items-center gap-1.5 text-sm font-extrabold transition-colors group-hover:gap-2.5"
                        style={{ color: color.text }}>
                        Read
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* ── BOTTOM CTA ── */}
        {posts.length > 0 && (
          <div className="mt-14 overflow-hidden rounded-2xl border p-px"
            style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6, #06B6D4)" }}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-5 rounded-[calc(1rem-1px)] px-8 py-6"
              style={{ background: "linear-gradient(135deg, #EEF2FF, #FFFFFF, #F5F3FF)" }}>
              <div>
                <p className="font-extrabold" style={{ color: "var(--foreground)" }}>
                  Ready to study seriously?
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--muted-text)" }}>
                  Read articles and join live study sessions — for free.
                </p>
              </div>
              <Link href="/study-room"
                className="shrink-0 group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-6 py-3 text-sm font-extrabold text-white transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)", boxShadow: "0 6px 20px rgba(99,102,241,0.35)" }}>
                <span className="absolute inset-0 translate-x-[-100%] skew-x-12 bg-white/10 transition-transform duration-500 group-hover:translate-x-[100%]" />
                Join Study Room →
              </Link>
            </div>
          </div>
        )}

        {/* Back link */}
        <div className="mt-10 text-center">
          <Link href="/"
            className="inline-flex items-center gap-1.5 text-sm font-bold transition-colors hover:text-[var(--accent)]"
            style={{ color: "var(--muted-text)" }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
