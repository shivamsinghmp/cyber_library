import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Study Store — Notes, PDFs & Study Materials | Let's Study",
  description: "Download premium study notes, PDFs and digital resources curated for UPSC, JEE, NEET and competitive exams. Buy with coins or direct purchase.",
  keywords: ["study notes download", "UPSC notes PDF", "JEE study material", "NEET notes", "digital study resources", "exam preparation material"],
  alternates: { canonical: "/store" },
  openGraph: {
    title: "Study Store — Notes, PDFs & Study Materials | Let's Study",
    description: "Premium study notes and PDFs for UPSC, JEE, NEET. Buy with coins or direct purchase.",
    url: "https://lstudy.in/store",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Study Store — Notes, PDFs & Study Materials",
    description: "Premium study notes and digital resources for competitive exam preparation.",
  },
};

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
