import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
import { SessionProvider } from "@/components/SessionProvider";
import { CartProvider } from "@/context/CartContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { TrafficTracker } from "@/components/TrafficTracker";
import { Toaster } from "react-hot-toast";
import { getAppSetting } from "@/lib/app-settings";
import { SmoothScroll } from "@/components/SmoothScroll";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
export async function generateMetadata(): Promise<Metadata> {
  const [title, faviconUrl] = await Promise.all([
    getAppSetting("SITE_TITLE"),
    getAppSetting("SITE_FAVICON_URL"),
  ]);
  const siteTitle = title?.trim() || "The Cyber Library | Live 24/7 Focus Hub & Study Rooms";
  const siteDescription = "Join the ultimate cyber library & focus hub. Study with ambitious peers via live Google Meet body doubling. Pomodoro sprints, silent accountability, and extreme productivity for UPSC, JEE, NEET & Professionals.";
  
  return {
    title: {
      template: `%s | The Cyber Library`,
      default: siteTitle,
    },
    description: siteDescription,
    keywords: ["the cyber library", "cyber library", "virtual library", "study room", "pomodoro timer", "body doubling", "study with me", "UPSC focus group", "JEE study room", "NEET study group", "online library"],
    authors: [{ name: "The Cyber Library Team" }],
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://cyberlib.in"),
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      url: "/",
      siteName: "The Cyber Library",
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description: siteDescription,
    },
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://cyberlib.in";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "The Cyber Library",
    url: siteUrl,
    description: "Live 24/7 Focus Hub & Study Rooms for body doubling.",
    publisher: {
      "@type": "Organization",
      name: "The Cyber Library",
      url: siteUrl
    }
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased min-h-screen flex flex-col`}>
        <SmoothScroll>
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
        </SmoothScroll>
        {process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
        {process.env.NEXT_PUBLIC_GTM_ID && <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID} />}
      </body>
    </html>
  );
}
