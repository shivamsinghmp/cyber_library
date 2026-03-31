import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Digital Store",
  description: "Explore premium PDFs, study guides, courses, and digital resources to boost your productivity and focus.",
};

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
