import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Productivity & Focus Blog",
  description: "Tips on deep work, focus, ADHD study habits, and making the most of The Cyber Library's live body doubling sessions.",
};
import { Calendar } from "lucide-react";
import { prisma } from "@/lib/prisma";

function formatDate(s: Date | string) {
  const d = typeof s === "string" ? new Date(s) : s;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function BlogPage() {
  let posts: { slug: string; title: string; excerpt: string | null; publishedAt: Date | null }[] = [];
  try {
    posts = await prisma.blogPost.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, title: true, excerpt: true, publishedAt: true },
    });
  } catch {
    // DB not migrated yet (e.g. AppSetting/BlogPost missing) — still allow build & show empty list
    posts = [];
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-32 pb-8 md:pt-40 md:pb-12">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
          Blog
        </h1>
        <p className="mt-2 text-sm text-[var(--cream-muted)] md:text-base">
          Tips on focus, study habits, and making the most of The Cyber Library.
        </p>
      </div>

      {posts.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-black/25 px-6 py-10 text-center text-sm text-[var(--cream-muted)]">
          No posts yet. Check back soon.
        </p>
      ) : (
        <ul className="space-y-6">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                className="block rounded-2xl border border-white/10 bg-black/25 p-5 transition hover:border-[var(--accent)]/40 hover:bg-black/35"
              >
                <div className="flex items-center gap-2 text-xs text-[var(--cream-muted)]">
                  <Calendar className="h-3.5 w-3.5" />
                  {post.publishedAt && formatDate(post.publishedAt)}
                </div>
                <h2 className="mt-2 text-lg font-semibold text-[var(--cream)]">
                  {post.title}
                </h2>
                <p className="mt-1.5 text-sm text-[var(--cream-muted)] line-clamp-2">
                  {post.excerpt || ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-center text-sm text-[var(--cream-muted)]">
        <Link href="/" className="text-[var(--accent)] hover:underline">
          ← Back to Home
        </Link>
      </p>
    </div>
  );
}
