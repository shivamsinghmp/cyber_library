import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join Let's Study — Start Studying with 1000+ Students",
  description: "Create your free account and join live 24/7 study rooms. Study with focused peers, build streaks, and actually hit your goals — UPSC, JEE, NEET or any exam.",
  keywords: ["join study room", "free study account", "online study community", "virtual library signup", "UPSC study group join"],
  alternates: { canonical: "/join" },
  openGraph: {
    title: "Join Let's Study — Start Studying with 1000+ Students",
    description: "Create your free account and join live 24/7 study rooms with focused students.",
    url: "https://lstudy.in/join",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Join Let's Study",
    description: "Create your free account and join live 24/7 study rooms.",
  },
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
