import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing & Plans | Let's Study",
  description: "Affordable monthly and yearly plans for unlimited access to 24/7 live study rooms, Pomodoro sessions, streaks & leaderboards. Built for UPSC, JEE, NEET & working professionals.",
  keywords: ["study room pricing", "lets study plans", "online study subscription", "UPSC study room price", "virtual library membership"],
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing & Plans | Let's Study",
    description: "Affordable plans for unlimited access to live study rooms, Pomodoro sessions & accountability. Join 1000+ focused students.",
    url: "https://cyberlib.in/pricing",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing & Plans | Let's Study",
    description: "Affordable plans for unlimited study room access. UPSC, JEE, NEET & Professionals.",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
