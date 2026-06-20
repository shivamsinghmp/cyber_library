export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { DM_Sans, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { validateEnv } from "@/lib/env-check";
import { SessionProvider } from "@/components/SessionProvider";
import { Toaster } from "react-hot-toast";

validateEnv();

const inter = DM_Sans({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

const outfit = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: { template: `%s | Let's Study Staff`, default: "Let's Study | Staff Portal" },
  description: "Staff portal — internal use only.",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased min-h-screen flex flex-col`}>
        <SessionProvider>
          <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
          <main className="flex-1 flex flex-col">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
