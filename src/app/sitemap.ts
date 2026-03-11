import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://cyberlib.in";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static routes
  const routes: MetadataRoute.Sitemap = [
    "",
    "/blog",
    "/study-room",
    "/store",
    "/mentorship",
    "/mental-session",
    "/rules",
    "/about",
  ].map((path) => ({
    url: `${BASE_URL}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  // Dynamic blog posts
  let blogEntries: MetadataRoute.Sitemap = [];
  try {
    const posts = await prisma.blogPost.findMany({
      where: { publishedAt: { not: null } },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
    });
    blogEntries = posts.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly",
      priority: 0.6,
    }));
  } catch {
    // If DB not reachable during build, just omit dynamic entries
    blogEntries = [];
  }

  return [...routes, ...blogEntries];
}

