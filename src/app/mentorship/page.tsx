import { SlotsBooking } from "@/components/SlotsBooking";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentorship Sessions — 1-on-1 Guidance for UPSC, JEE & Exams | Let's Study",
  description: "Book one-on-one or group mentorship sessions with experienced mentors. Get personalised guidance on UPSC strategy, JEE preparation, career planning and exam roadmaps.",
  keywords: ["UPSC mentorship", "JEE mentor online", "exam guidance session", "study mentor India", "1-on-1 coaching"],
  alternates: { canonical: "/mentorship" },
  openGraph: {
    title: "Mentorship Sessions | Let's Study",
    description: "Book 1-on-1 or group mentorship sessions. Get personalised guidance for UPSC, JEE, NEET and career planning.",
    url: "https://cyberlib.in/mentorship",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mentorship Sessions | Let's Study",
    description: "Book 1-on-1 or group mentorship sessions for UPSC, JEE, NEET and career planning.",
  },
};

export default function MentorshipPage() {
  return (
    <SlotsBooking
      slotType="MENTORSHIP"
      title="Mentorship"
      description="Book one-on-one or group mentorship sessions. Get guidance from experienced mentors on your goals, career, and preparation."
      emptyMessage="No mentorship sessions available right now. Check back soon."
    />
  );
}
