import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Calendar, ArrowLeft, Clock, Eye, BookOpen, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const revalidate = 300; // ISR: cache each post for 5 min, then revalidate on next request
import { sanitizeCustomCss, scopeCustomCss } from "@/lib/sanitize-html";
import DOMPurify from "isomorphic-dompurify";
import { BlogEngagement } from "@/components/BlogEngagement";
import { ReadingProgress } from "./ReadingProgress";

/* ─── helpers ─────────────────────────────────────────────────────────────── */
function formatDate(s: Date | string) {
  const d = typeof s === "string" ? new Date(s) : s;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function readTime(html: string | null) {
  if (!html) return 1;
  const words = html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

type TocItem = { id: string; text: string; level: 2 | 3 };

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function extractToc(html: string): TocItem[] {
  const items: TocItem[] = [];
  const re = /<h([23])[^>]*>(.*?)<\/h[23]>/gi;
  let m: RegExpExecArray | null;
  const slugged = new Map<string, number>();
  while ((m = re.exec(html)) !== null) {
    const level = parseInt(m[1]) as 2 | 3;
    const text = decodeEntities(m[2].replace(/<[^>]+>/g, "")).trim();
    if (!text) continue;
    const base = text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
    const count = slugged.get(base) ?? 0;
    slugged.set(base, count + 1);
    items.push({ id: count === 0 ? base : `${base}-${count}`, text, level });
  }
  return items;
}

/* Inject id attributes into h2/h3 so ToC links work */
function injectHeadingIds(html: string): string {
  const slugged = new Map<string, number>();
  return html.replace(/<h([23])([^>]*)>(.*?)<\/h[23]>/gi, (_, lvl, attrs, inner) => {
    const text = decodeEntities(inner.replace(/<[^>]+>/g, "")).trim();
    const base = text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");
    const count = slugged.get(base) ?? 0;
    slugged.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count}`;
    return `<h${lvl}${attrs} id="${id}">${inner}</h${lvl}>`;
  });
}

/* ─── metadata ───────────────────────────────────────────────────────────── */
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await prisma.blogPost.findFirst({
      where: { slug, publishedAt: { not: null } },
      select: { title: true, metaTitle: true, metaDescription: true, excerpt: true, coverImage: true },
    });
    if (!post) return { title: "Post not found" };
    return {
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt || undefined,
      openGraph: post.coverImage ? { images: [post.coverImage] } : undefined,
    };
  } catch {
    return { title: "Blog" };
  }
}

/* ─── page ───────────────────────────────────────────────────────────────── */
export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;

  let post: Awaited<ReturnType<typeof prisma.blogPost.findFirst>> = null;
  let morePosts: { id: string; slug: string; title: string; excerpt: string | null; coverImage: string | null; publishedAt: Date | null; body: string }[] = [];

  try {
    [post, morePosts] = await Promise.all([
      prisma.blogPost.findFirst({
        where: { slug, publishedAt: { not: null } },
      }),
      prisma.blogPost.findMany({
        where: { slug: { not: slug }, publishedAt: { not: null } },
        orderBy: { publishedAt: "desc" },
        take: 3,
        select: { id: true, slug: true, title: true, excerpt: true, coverImage: true, publishedAt: true, body: true },
      }),
    ]);
  } catch {
    notFound();
  }
  if (!post) notFound();

  const mins = readTime(post.body);
  const sanitizedBody = injectHeadingIds(DOMPurify.sanitize(post.body));
  const toc = extractToc(post.body);

  return (
    <>
      <ReadingProgress />

      <div className="relative min-h-screen" style={{ background: "var(--page-bg)" }}>

        {/* Subtle background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 right-0 h-[600px] w-[600px] rounded-full blur-[160px]"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.08), transparent)" }} />
          <div className="absolute top-1/2 -left-32 h-[400px] w-[400px] rounded-full blur-[120px]"
            style={{ background: "radial-gradient(circle, rgba(139,92,246,0.06), transparent)" }} />
        </div>

        <div className="relative z-10">

          {/* ── Top nav bar ── */}
          <div className="sticky top-1 z-40 px-4 pt-4">
            <div className="mx-auto max-w-6xl">
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold shadow-sm backdrop-blur-sm transition-all hover:-translate-x-0.5 hover:shadow"
                style={{ borderColor: "var(--accent-border)", background: "rgba(255,255,255,0.9)", color: "var(--accent)" }}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Blog
              </Link>
            </div>
          </div>

          {/* ── Hero cover image ── */}
          {post.coverImage && (
            <div className="mx-auto mt-6 max-w-6xl px-4">
              <div className="overflow-hidden rounded-3xl shadow-xl" style={{ height: "clamp(200px, 40vw, 420px)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          )}

          {/* ── Main content: article + sidebar ── */}
          <div className="mx-auto mt-6 max-w-6xl px-4 pb-16 lg:grid lg:grid-cols-[1fr_280px] lg:gap-8 xl:gap-12">

            {/* ── Article column ── */}
            <article>

              {/* Article header card */}
              <div className="overflow-hidden rounded-3xl border bg-white shadow-lg"
                style={{ borderColor: "var(--border)", boxShadow: "0 8px 40px rgba(99,102,241,0.10)" }}>

                {/* Rainbow bar */}
                <div className="h-1.5 w-full"
                  style={{ background: "linear-gradient(to right, #6366F1, #8B5CF6, #EC4899, #06B6D4)" }} />

                <div className="px-8 pt-8 pb-7 sm:px-10 sm:pt-10">

                  {/* Meta chips */}
                  <div className="mb-5 flex flex-wrap items-center gap-2">
                    {post.publishedAt && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
                        style={{ borderColor: "var(--border)", color: "var(--muted-text)", background: "var(--page-bg)" }}>
                        <Calendar className="h-3 w-3" />
                        {formatDate(post.publishedAt)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
                      style={{ borderColor: "var(--accent-border)", color: "var(--accent)", background: "var(--accent-pale)" }}>
                      <Clock className="h-3 w-3" />
                      {mins} min read
                    </span>
                    {post.views > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
                        style={{ borderColor: "var(--border)", color: "var(--muted-text)", background: "var(--page-bg)" }}>
                        <Eye className="h-3 w-3" />
                        {post.views.toLocaleString()} views
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h1 className="mb-4 text-2xl font-extrabold leading-tight tracking-tight sm:text-[2.2rem]"
                    style={{ color: "var(--foreground)" }}>
                    {post.title}
                  </h1>

                  {/* Excerpt */}
                  {post.excerpt && (
                    <p className="border-l-4 pl-4 text-base italic leading-relaxed"
                      style={{ color: "var(--body-text)", borderColor: "#8B5CF6" }}>
                      {post.excerpt}
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div className="mx-8 border-t sm:mx-10" style={{ borderColor: "var(--border)" }} />

                {/* Article body */}
                <div id="article-body" className="px-8 py-10 sm:px-10">
                  {post.customCss && (
                    <style dangerouslySetInnerHTML={{
                      __html: scopeCustomCss(sanitizeCustomCss(post.customCss), ".blog-post-body"),
                    }} />
                  )}
                  <div
                    className="blog-body blog-post-body prose-blog"
                    dangerouslySetInnerHTML={{ __html: sanitizedBody }}
                  />
                </div>
              </div>

              {/* Engagement & comments */}
              <div className="mt-6 overflow-hidden rounded-3xl border bg-white px-8 py-8 shadow-md sm:px-10"
                style={{ borderColor: "var(--border)" }}>
                <BlogEngagement slug={post.slug} initialViews={post.views} />
              </div>

              {/* Bottom nav */}
              <div className="mt-8 flex items-center justify-between">
                <Link href="/blog"
                  className="inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold transition-all hover:-translate-x-0.5"
                  style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}>
                  <ArrowLeft className="h-3.5 w-3.5" /> All Posts
                </Link>
                <Link href="/"
                  className="text-sm font-semibold transition-colors hover:text-[var(--accent)]"
                  style={{ color: "var(--muted-text)" }}>
                  Home →
                </Link>
              </div>
            </article>

            {/* ── Sticky sidebar ── */}
            <aside className="hidden lg:block">
              <div className="sticky top-20 space-y-5">

                {/* Reading stats */}
                <div className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="h-4 w-4" style={{ color: "var(--accent)" }} />
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted-text)" }}>
                      Reading Info
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: "var(--muted-text)" }}>Read time</span>
                      <span className="font-bold" style={{ color: "var(--foreground)" }}>{mins} min</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span style={{ color: "var(--muted-text)" }}>Views</span>
                      <span className="font-bold" style={{ color: "var(--foreground)" }}>{post.views.toLocaleString()}</span>
                    </div>
                    {post.publishedAt && (
                      <div className="flex items-center justify-between text-sm">
                        <span style={{ color: "var(--muted-text)" }}>Published</span>
                        <span className="font-bold text-right" style={{ color: "var(--foreground)" }}>
                          {formatDate(post.publishedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Table of Contents */}
                {toc.length > 0 && (
                  <div className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: "var(--border)" }}>
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted-text)" }}>
                      Contents
                    </p>
                    <nav className="space-y-1">
                      {toc.map((item) => (
                        <a
                          key={item.id}
                          href={`#${item.id}`}
                          className={`flex items-start gap-1.5 rounded-lg px-2 py-1.5 text-xs leading-snug transition-colors hover:bg-[var(--accent-pale)] hover:text-[var(--accent)] ${
                            item.level === 3 ? "ml-3 opacity-80" : "font-semibold"
                          }`}
                          style={{ color: "var(--body-text)" }}
                        >
                          <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 opacity-50" />
                          {item.text}
                        </a>
                      ))}
                    </nav>
                  </div>
                )}

                {/* More posts widget */}
                {morePosts.length > 0 && (
                  <div className="rounded-2xl border bg-white p-5 shadow-sm" style={{ borderColor: "var(--border)" }}>
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--muted-text)" }}>
                      Aur Padho
                    </p>
                    <ul className="space-y-3">
                      {morePosts.map((p) => (
                        <li key={p.id}>
                          <Link
                            href={`/blog/${p.slug}`}
                            className="group flex gap-3 items-start"
                          >
                            {/* Thumbnail */}
                            {p.coverImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.coverImage}
                                alt={p.title}
                                className="h-12 w-16 shrink-0 rounded-lg object-cover"
                              />
                            ) : (
                              <div
                                className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg"
                                style={{ background: "var(--accent-pale)" }}
                              >
                                <BookOpen className="h-4 w-4" style={{ color: "var(--accent)" }} />
                              </div>
                            )}
                            {/* Title + read time */}
                            <div className="min-w-0">
                              <p
                                className="line-clamp-2 text-xs font-semibold leading-snug transition-colors group-hover:text-[var(--accent)]"
                                style={{ color: "var(--foreground)" }}
                              >
                                {p.title}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1 text-[10px]" style={{ color: "var(--muted-text)" }}>
                                <Clock className="h-2.5 w-2.5" />
                                {readTime(p.body)} min read
                              </p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <Link
                      href="/blog"
                      className="mt-4 flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold transition-colors hover:bg-[var(--accent-pale)]"
                      style={{ color: "var(--accent)" }}
                    >
                      Sab Posts Dekho <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}

              </div>
            </aside>
          </div>

          {/* ── More Articles ── */}
          {morePosts.length > 0 && (
            <div className="mx-auto max-w-6xl px-4 pb-20">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: "var(--foreground)" }}>
                    More Articles
                  </h2>
                  <p className="mt-1 text-sm" style={{ color: "var(--muted-text)" }}>
                    Aur bhi interesting padhai hai — ek nazar maaro
                  </p>
                </div>
                <Link
                  href="/blog"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold transition-all hover:shadow"
                  style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}
                >
                  All Posts <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {morePosts.map((p) => {
                  const mins2 = readTime(p.body);
                  return (
                    <Link
                      key={p.id}
                      href={`/blog/${p.slug}`}
                      className="group flex flex-col overflow-hidden rounded-3xl border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                      style={{ borderColor: "var(--border)", boxShadow: "0 2px 12px rgba(99,102,241,0.07)" }}
                    >
                      {/* Cover */}
                      {p.coverImage ? (
                        <div className="overflow-hidden" style={{ height: 180 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.coverImage}
                            alt={p.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center" style={{
                          height: 180,
                          background: "linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)",
                        }}>
                          <BookOpen className="h-10 w-10 opacity-30" style={{ color: "var(--accent)" }} />
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex flex-1 flex-col p-5">
                        {/* Meta */}
                        <div className="mb-3 flex items-center gap-2">
                          {p.publishedAt && (
                            <span className="text-[11px] font-medium" style={{ color: "var(--muted-text)" }}>
                              {formatDate(p.publishedAt)}
                            </span>
                          )}
                          <span className="text-[var(--border)]">·</span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: "var(--accent)" }}>
                            <Clock className="h-3 w-3" /> {mins2} min
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="mb-2 line-clamp-2 text-base font-bold leading-snug transition-colors group-hover:text-[var(--accent)]"
                          style={{ color: "var(--foreground)" }}>
                          {p.title}
                        </h3>

                        {/* Excerpt */}
                        {p.excerpt && (
                          <p className="line-clamp-2 text-sm leading-relaxed" style={{ color: "var(--muted-text)" }}>
                            {p.excerpt}
                          </p>
                        )}

                        {/* Read link */}
                        <div className="mt-auto pt-4">
                          <span className="inline-flex items-center gap-1 text-xs font-bold transition-colors group-hover:text-[var(--accent)]"
                            style={{ color: "var(--accent)" }}>
                            Read Article <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-8 text-center sm:hidden">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-1.5 rounded-full border px-5 py-2 text-sm font-semibold"
                  style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}
                >
                  All Posts <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
