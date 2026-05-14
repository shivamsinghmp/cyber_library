import type { Metadata } from "next";
import { HomeClient } from "./HomeClient";
import { batchGetAppSettings } from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";
import { fetchWithCache } from "@/lib/redis";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await batchGetAppSettings(["SITE_TITLE"]);
  const title = settings.SITE_TITLE?.trim() || "The Cyber Library | Live 24/7 Focus Hub & Study Rooms";
  return { title: { absolute: title } };
}

export default async function HomePage() {
  // All three queries run in parallel — single round-trip to DB/Redis
  const [recentBlogs, faqs, settings] = await Promise.all([
    prisma.blogPost.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { id: true, slug: true, title: true, excerpt: true, publishedAt: true },
    }),
    fetchWithCache(
      "public:faqs",
      () =>
        prisma.faq.findMany({
          where: { isActive: true },
          orderBy: { order: "asc" },
          select: { id: true, question: true, answer: true, order: true },
        }),
      600
    ),
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
