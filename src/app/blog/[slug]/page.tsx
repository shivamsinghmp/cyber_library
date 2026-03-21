import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Calendar, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { sanitizeBlogHtml, sanitizeCustomCss, scopeCustomCss } from "@/lib/sanitize-html";

function formatDate(s: Date | string) {
  const d = typeof s === "string" ? new Date(s) : s;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
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
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--cream-muted)] transition hover:text-[var(--accent)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Blog
      </Link>

      <article className="mt-6">
        <div className="flex items-center gap-2 text-xs text-[var(--cream-muted)]">
          <Calendar className="h-3.5 w-3.5" />
          {post.publishedAt && formatDate(post.publishedAt)}
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--cream)] md:text-3xl">
          {post.title}
        </h1>
        {post.excerpt && (
          <p className="mt-3 text-sm text-[var(--cream-muted)]">
            {post.excerpt}
          </p>
        )}
        {post.customCss && (
          <style
            dangerouslySetInnerHTML={{
              __html: scopeCustomCss(sanitizeCustomCss(post.customCss), ".blog-post-body"),
            }}
          />
        )}
        <div className="blog-body blog-post-body mt-6 space-y-4 text-sm leading-relaxed text-[var(--cream-muted)] [&_a]:text-[var(--accent)] [&_a]:underline [&_a:hover]:opacity-90 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_pre]:overflow-x-auto [&_iframe]:rounded-xl [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-[var(--cream)] [&_h1]:mt-6 [&_h1]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[var(--cream)] [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:text-[var(--cream)] [&_h3]:mt-4 [&_h3]:mb-1 [&_h4]:text-base [&_h4]:font-medium [&_h4]:text-[var(--cream)] [&_h4]:mt-3 [&_h4]:mb-1">
          {post.body.includes("<") ? (
            <div dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(post.body) }} />
          ) : (
            post.body.split("\n\n").map((para, i) => (para.trim() ? <p key={i}>{para}</p> : null))
          )}
        </div>
      </article>

      <p className="mt-10 text-center">
        <Link href="/blog" className="text-[var(--accent)] hover:underline">
          ← All posts
        </Link>
      </p>
    </div>
  );
}
