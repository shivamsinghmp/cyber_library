import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { CartProvider } from "@/context/CartContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { TrafficTracker } from "@/components/TrafficTracker";
import { Toaster } from "react-hot-toast";
import { getAppSetting } from "@/lib/app-settings";

export async function generateMetadata(): Promise<Metadata> {
  const [title, faviconUrl] = await Promise.all([
    getAppSetting("SITE_TITLE"),
    getAppSetting("SITE_FAVICON_URL"),
  ]);
  const siteTitle = title?.trim() || "Virtual Library – The Focus Hub";
  return {
    title: siteTitle,
    description:
      "Focus together with live body doubling. Study with others in a silent, structured space.",
    icons: faviconUrl?.trim()
      ? { icon: faviconUrl.trim() }
      : undefined,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">
        <SessionProvider>
          <CartProvider>
            <TrafficTracker />
            <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
            <AnnouncementBanner />
            <Navbar />
          <main className="flex-1 flex flex-col">
            {children}
          </main>
          <Footer />
          </CartProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
