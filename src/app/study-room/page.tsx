import { SlotsBooking } from "@/components/SlotsBooking";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Study Rooms",
  description: "Book a slot and join 24/7 silent study sessions with other focused students. Body doubling via Google Meet.",
};

export default function StudyRoomPage() {
  return <SlotsBooking />;
}
