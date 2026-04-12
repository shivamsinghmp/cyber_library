import type { Metadata } from "next";
import { HomeClient } from "./HomeClient";
import { getAppSetting } from "@/lib/app-settings";

export async function generateMetadata(): Promise<Metadata> {
  const title = (await getAppSetting("SITE_TITLE"))?.trim() || "The Cyber Library | Live 24/7 Focus Hub & Study Rooms";
  
  return {
    title: {
      absolute: title, // Absolute string preventing the layout template suffix on the homepage
    },
  };
}

import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const recentBlogs = await prisma.blogPost.findMany({
    where: { publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    take: 3,
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      publishedAt: true,
    },
  });

  return <HomeClient recentBlogs={recentBlogs} />;
}
