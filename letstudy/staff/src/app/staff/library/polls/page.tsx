import { requireStaffModule } from "@/lib/permissions";
import PollsClient from "./PollsClient";

export default async function StaffPollsPage() {
  await requireStaffModule("VIRTUAL_LIBRARY");
  return <PollsClient />;
}
