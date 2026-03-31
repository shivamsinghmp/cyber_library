import { SlotsBooking } from "@/components/SlotsBooking";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentorship Sessions",
  description: "Book one-on-one or group mentorship sessions. Get guidance from experienced mentors on your goals, career, and preparation.",
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
