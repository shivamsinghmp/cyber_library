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

export default function HomePage() {
  return <HomeClient />;
}
