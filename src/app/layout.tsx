export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { validateEnv } from "@/lib/env-check";
import { unstable_cache } from "next/cache";
import { batchGetAppSettings } from "@/lib/app-settings";
import { safeJsonLd } from "@/lib/sanitize-html";

validateEnv();

// DM Sans — body: clean, modern, premium readability
const inter = DM_Sans({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

// Plus Jakarta Sans — headings: geometric, ultra-premium SaaS look
const outfit = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  weight: ["600", "700", "800"],
});

import { Suspense } from "react";
import Script from "next/script";
import { SessionProvider } from "@/components/SessionProvider";
import { CartProvider } from "@/context/CartContext";
import { NavbarWrapper } from "@/components/NavbarWrapper";
import { Footer } from "@/components/Footer";
import FooterOnHomeOnly from "@/components/FooterOnHomeOnly";
import { AnnouncementBannerWrapper } from "@/components/AnnouncementBannerWrapper";
import { TrafficTracker } from "@/components/TrafficTracker";
import { Toaster } from "react-hot-toast";
import { SmoothScroll } from "@/components/SmoothScroll";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";

// Cache layout-level settings for 5 minutes across all requests
const getLayoutSettings = unstable_cache(
  async () => {
    const settings = await batchGetAppSettings([
      "SITE_TITLE",
      "SITE_FAVICON_URL",
      "GOOGLE_ANALYTICS_ID",
      "GOOGLE_TAG_MANAGER_ID",
      "GOOGLE_ADSENSE_ID",
      "FB_PIXEL_ID",
      "CUSTOM_HEAD_HTML",
    ]);
    return settings;
  },
  ["layout-settings"],
  { revalidate: 300 }
);

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getLayoutSettings();
  const siteTitle = settings.SITE_TITLE?.trim() || "Let's Study | AI-Powered Collaborative Learning Platform";
  const siteDescription = "Join Let's Study — India's AI-powered collaborative learning platform. Live study sessions via Google Meet, Gemini AI doubt solving, Pomodoro timers, and daily accountability for UPSC, JEE, NEET & competitive exam aspirants.";

  return {
    title: {
      template: `%s | Let's Study`,
      default: siteTitle,
    },
    description: siteDescription,
    keywords: ["let's study", "lets study", "AI learning platform", "virtual study room", "collaborative learning", "pomodoro timer", "body doubling", "study accountability", "UPSC focus sessions", "JEE study platform", "NEET preparation", "EdTech India", "gemini ai tutor", "google meet study room", "ai powered study platform india", "cloud based study app"],
    authors: [{ name: "Let's Study Team" }],
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://lstudy.in"),
    alternates: { canonical: "/" },
    openGraph: {
      title: "Let's Study | AI-Powered Collaborative Learning Platform",
      description: siteDescription,
      url: "https://lstudy.in",
      siteName: "Let's Study",
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Let's Study | AI-Powered Collaborative Learning Platform",
      description: siteDescription,
    },
    icons: {
      icon: settings.SITE_FAVICON_URL?.trim() || "/favicon.svg",
      shortcut: settings.SITE_FAVICON_URL?.trim() || "/favicon.svg",
      apple: settings.SITE_FAVICON_URL?.trim() || "/icon-512.png",
    },
    manifest: "/manifest.json",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getLayoutSettings();

  const resolvedGaId = settings.GOOGLE_ANALYTICS_ID?.trim() || process.env.NEXT_PUBLIC_GA_ID;
  const resolvedGtmId = settings.GOOGLE_TAG_MANAGER_ID?.trim() || process.env.NEXT_PUBLIC_GTM_ID;
  const adsenseId = settings.GOOGLE_ADSENSE_ID?.trim();
  const fbPixelId = settings.FB_PIXEL_ID?.trim();
  const customHeadHtml = settings.CUSTOM_HEAD_HTML?.trim();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lstudy.in";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Let's Study",
    url: siteUrl,
    description: "India's AI-powered collaborative learning platform — structured virtual study sessions, progress analytics, and peer accountability at scale.",
    publisher: { "@type": "Organization", name: "Let's Study", url: siteUrl },
  };

  return (
    <html lang="en">
      <head>
        {/* DNS prefetch for external resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Favicon handled by generateMetadata() icons + manifest fields — no extra link tags needed */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
        />
        {/* AdSense and FB Pixel loaded after page is interactive — prevents render blocking */}
      </head>
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased min-h-screen flex flex-col`}>
        {fbPixelId && (
          <noscript>
            <img height="1" width="1" style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${fbPixelId}&ev=PageView&noscript=1`} />
          </noscript>
        )}
        <SmoothScroll>
          <SessionProvider>
            <CartProvider>
              <Suspense fallback={null}>
                <TrafficTracker />
              </Suspense>
              <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
              <AnnouncementBannerWrapper />
              <NavbarWrapper />
              <main className="flex-1 flex flex-col">
                {children}
              </main>
              <FooterOnHomeOnly><Footer /></FooterOnHomeOnly>
            </CartProvider>
          </SessionProvider>
        </SmoothScroll>
        {resolvedGaId && <GoogleAnalytics gaId={resolvedGaId} />}
        {resolvedGtmId && <GoogleTagManager gtmId={resolvedGtmId} />}
        {/* AdSense: lazyOnload — loads after page is fully interactive, zero render-blocking */}
        {adsenseId && (
          <Script
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseId}`}
            strategy="lazyOnload"
            crossOrigin="anonymous"
          />
        )}
        {/* FB Pixel: afterInteractive — loads after hydration, doesn't block FCP/LCP */}
        {fbPixelId && (
          <Script id="fb-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${fbPixelId}');fbq('track','PageView');`}
          </Script>
        )}
        {customHeadHtml && (
          <div dangerouslySetInnerHTML={{ __html: customHeadHtml }} />
        )}
      </body>
    </html>
  );
}
