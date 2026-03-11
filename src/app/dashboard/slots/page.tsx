import { redirect } from "next/navigation";

export default function DashboardSlotsRedirect() {
  redirect("/dashboard/subscription");
}
