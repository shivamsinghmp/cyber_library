import { SlotsBooking } from "@/components/SlotsBooking";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mental Wellness Sessions",
  description: "Join guided mental wellness and mindfulness sessions. Take a break, breathe, and recharge with structured support.",
};

export default function MentalSessionPage() {
  return (
    <SlotsBooking
      slotType="MENTAL"
      title="Mental Wellness Sessions"
      description="Join guided mental wellness and mindfulness sessions. Take a break, breathe, and recharge with structured support."
      emptyMessage="No mental wellness sessions available right now. Check back soon."
    />
  );
}
