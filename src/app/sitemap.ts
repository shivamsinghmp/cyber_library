import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const revalidate = 3600; // regenerate every 1 hour — picks up new posts/products automatically

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lstudy.in";

// [path, priority, changeFreq]
const STATIC_ROUTES: [string, number, MetadataRoute.Sitemap[number]["changeFrequency"]][] = [
  ["",                1.0, "daily"],    // homepage — most important
  ["/pricing",        0.9, "weekly"],   // conversion page
  ["/join",           0.9, "monthly"],  // signup — high conversion intent
  ["/study-room",     0.8, "daily"],    // core product
  ["/blog",           0.8, "daily"],    // blog index — updates often
  ["/store",          0.7, "weekly"],
  ["/mentorship",     0.7, "weekly"],
  ["/about",          0.6, "monthly"],
  ["/why-join",       0.6, "monthly"],
  ["/slots",          0.6, "weekly"],
  ["/mental-session", 0.5, "monthly"],
  ["/rules",          0.5, "monthly"],
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(([path, priority, changeFrequency]) => ({
    url: `${BASE_URL}${path}`,
    changeFrequency,
    priority,
  }));

  // Dynamic: published blog posts + published store products
  let blogEntries: MetadataRoute.Sitemap = [];
  let storeEntries: MetadataRoute.Sitemap = [];

  try {
    const [posts, products] = await Promise.all([
      prisma.blogPost.findMany({
        where: { publishedAt: { not: null } },
        select: { slug: true, updatedAt: true },
        orderBy: { publishedAt: "desc" },
      }),
      prisma.digitalProduct.findMany({
        where: { isActive: true },
        select: { id: true, updatedAt: true },
      }),
    ]);

    blogEntries = posts.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.65,
    }));

    storeEntries = products.map((p) => ({
      url: `${BASE_URL}/store/${p.id}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.55,
    }));
  } catch {
    // DB not reachable during build — omit dynamic entries
  }

  return [...staticEntries, ...blogEntries, ...storeEntries];
}

