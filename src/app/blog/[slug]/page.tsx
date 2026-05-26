import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Calendar, ArrowLeft, Clock, Eye } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sanitizeCustomCss, scopeCustomCss } from "@/lib/sanitize-html";
import DOMPurify from "isomorphic-dompurify";
import { BlogEngagement } from "@/components/BlogEngagement";

function formatDate(s: Date | string) {
  const d = typeof s === "string" ? new Date(s) : s;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function readTime(text: string | null) {
  if (!text) return "2 min";
  const words = text.trim().split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min`;
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await prisma.blogPost.findFirst({
      where: { slug, publishedAt: { not: null } },
      select: { title: true, metaTitle: true, metaDescription: true, excerpt: true },
    });
    if (!post) return { title: "Post not found" };
    return {
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt || undefined,
    };
  } catch {
    return { title: "Blog" };
  }
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  let post: Awaited<ReturnType<typeof prisma.blogPost.findFirst>> = null;
  try {
    post = await prisma.blogPost.findFirst({
      where: { slug, publishedAt: { not: null } },
    });
  } catch {
    notFound();
  }
  if (!post) notFound();

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "var(--page-bg)" }}>

      {/* Ambient orbs */}
      <div className="pointer-events-none absolute top-0 right-0 h-[500px] w-[500px] rounded-full blur-[140px]"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.12), transparent)" }} />
      <div className="pointer-events-none absolute top-40 left-0 h-[400px] w-[400px] rounded-full blur-[120px]"
        style={{ background: "radial-gradient(circle, rgba(139,92,246,0.08), transparent)" }} />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-[350px] w-[350px] rounded-full blur-[100px]"
        style={{ background: "radial-gradient(circle, rgba(6,182,212,0.07), transparent)" }} />
      <div className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: "radial-gradient(circle, #6366F110 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <div className="relative z-10 mx-auto max-w-3xl px-4 sm:px-6 py-8 md:py-12">

        {/* Back button */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold transition-all hover:-translate-x-0.5 hover:shadow-sm"
          style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Blog
        </Link>

        {/* Hero card */}
        <div className="mt-6 overflow-hidden rounded-[2rem] border bg-white shadow-xl"
          style={{ borderColor: "var(--border)", boxShadow: "0 8px 40px rgba(99,102,241,0.12), 0 2px 8px rgba(0,0,0,0.06)" }}>

          {/* Rainbow top bar */}
          <div className="h-1.5 w-full"
            style={{ background: "linear-gradient(to right, #6366F1, #8B5CF6, #EC4899, #06B6D4)" }} />

          <div className="px-8 pt-8 pb-7 sm:px-10 sm:pt-10">
            {/* Meta chips */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              {post.publishedAt && (
                <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold"
                  style={{ borderColor: "var(--border)", color: "var(--muted-text)", background: "var(--page-bg)" }}>
                  <Calendar className="h-3 w-3" />
                  {formatDate(post.publishedAt)}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold"
                style={{ borderColor: "var(--accent-border)", color: "var(--accent)", background: "var(--accent-pale)" }}>
                <Clock className="h-3 w-3" />
                {readTime(post.body)} read
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white"
                style={{ background: "linear-gradient(135deg, #6366F1, #8B5CF6)" }}>
                Article
              </span>
              {post.views > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold"
                  style={{ borderColor: "var(--border)", color: "var(--muted-text)", background: "var(--page-bg)" }}>
                  <Eye className="h-3 w-3" />
                  {post.views} views
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl leading-tight mb-4"
              style={{ color: "var(--foreground)" }}>
              {post.title}
            </h1>

            {/* Excerpt / subtitle */}
            {post.excerpt && (
              <p className="text-base leading-relaxed border-l-4 pl-4 italic"
                style={{ color: "var(--body-text)", borderColor: "#8B5CF6" }}>
                {post.excerpt}
              </p>
            )}
          </div>

          {/* Thin divider */}
          <div className="mx-8 sm:mx-10 border-t" style={{ borderColor: "var(--border)" }} />

          {/* Article body */}
          <div className="px-8 py-8 sm:px-10 sm:py-10">
            {post.customCss && (
              <style
                dangerouslySetInnerHTML={{
                  __html: scopeCustomCss(sanitizeCustomCss(post.customCss), ".blog-post-body"),
                }}
              />
            )}
            <div
              className="blog-body blog-post-body prose-blog"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.body) }}
            />
          </div>
        </div>

        {/* Engagement & Comment System */}
        <div className="mt-6 overflow-hidden rounded-[2rem] border bg-white shadow-lg px-8 py-8 sm:px-10"
          style={{ borderColor: "var(--border)", boxShadow: "0 4px 20px rgba(99,102,241,0.08)" }}>
          <BlogEngagement slug={post.slug} initialViews={post.views} />
        </div>

        {/* Bottom nav */}
        <div className="mt-8 flex items-center justify-between">
          <Link href="/blog"
            className="inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-semibold transition-all hover:-translate-x-0.5"
            style={{ borderColor: "var(--accent-border)", background: "var(--accent-pale)", color: "var(--accent)" }}>
            <ArrowLeft className="h-3.5 w-3.5" />
            All Posts
          </Link>
          <Link href="/"
            className="text-sm font-semibold transition-colors hover:text-[var(--accent)]"
            style={{ color: "var(--muted-text)" }}>
            Home →
          </Link>
        </div>
      </div>
    </div>
  );
}
