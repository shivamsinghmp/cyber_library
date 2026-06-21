import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

// No caching — a freshly published blog post must appear here instantly,
// not after waiting out a revalidate window. Sitemap.xml is fetched rarely
// (mostly by crawlers), so the extra DB read on every request is cheap.
export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lstudy.in";

// [path, priority, changeFreq]
const STATIC_ROUTES: [string, number, MetadataRoute.Sitemap[number]["changeFrequency"]][] = [
  ["",                         1.0, "daily"],    // homepage — most important
  ["/pricing",                 0.9, "weekly"],   // conversion page
  ["/join",                    0.9, "monthly"],  // signup — high conversion intent
  ["/signup",                  0.8, "monthly"],
  ["/blog",                    0.8, "daily"],    // blog index — updates often
  ["/mentorship",              0.7, "weekly"],
  ["/leaderboard",             0.7, "daily"],
  ["/about",                   0.6, "monthly"],
  ["/why-join",                0.6, "monthly"],
  ["/support",                 0.5, "monthly"],
  ["/rules",                   0.5, "monthly"],
  ["/terms",                   0.3, "yearly"],
  ["/privacy",                 0.3, "yearly"],
  ["/refund",                  0.3, "yearly"],
  ["/shipping",                0.3, "yearly"],
  ["/whatsapp-data-deletion",  0.2, "yearly"],
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map(([path, priority, changeFrequency]) => ({
    url: `${BASE_URL}${path}`,
    changeFrequency,
    priority,
  }));

  // Dynamic: published blog posts, now served at the root /[slug]
  let blogEntries: MetadataRoute.Sitemap = [];

  try {
    const posts = await prisma.blogPost.findMany({
      where: { publishedAt: { not: null } },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
    });

    blogEntries = posts.map((post) => ({
      url: `${BASE_URL}/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.65,
    }));
  } catch {
    // DB not reachable during build — omit dynamic entries
  }

  return [...staticEntries, ...blogEntries];
}
