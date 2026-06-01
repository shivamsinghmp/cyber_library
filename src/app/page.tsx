import type { Metadata } from "next";
import { HomeClient } from "./HomeClient";
import { batchGetAppSettings } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export const revalidate = 60;

const getCachedRecentBlogs = unstable_cache(
  () =>
    prisma.blogPost.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { id: true, slug: true, title: true, excerpt: true, publishedAt: true },
    }),
  ["public-recent-blogs"],
  { revalidate: 300 }
);

const getCachedFaqs = unstable_cache(
  () =>
    prisma.faq.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: { id: true, question: true, answer: true, order: true },
    }),
  ["public-faqs"],
  { revalidate: 600 }
);

export async function generateMetadata(): Promise<Metadata> {
  const settings = await batchGetAppSettings(["SITE_TITLE"]);
  const title = settings.SITE_TITLE?.trim() || "Let's Study | Live 24/7 Focus Hub & Study Rooms";
  return { title: { absolute: title } };
}

export default async function HomePage() {
  const [recentBlogs, faqs, settings] = await Promise.all([
    getCachedRecentBlogs(),
    getCachedFaqs(),
    batchGetAppSettings(["SITE_HEADLINE"]),
  ]);

  return (
    <HomeClient
      recentBlogs={recentBlogs}
      initialHeadline={settings.SITE_HEADLINE}
      initialFaqs={faqs}
    />
  );
}
