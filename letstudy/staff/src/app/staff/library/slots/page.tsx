import { requireStaffModule } from "@/lib/permissions";
import SlotsClient from "./SlotsClient";

export default async function StaffSlotsPage() {
  await requireStaffModule("VIRTUAL_LIBRARY");
  return <SlotsClient />;
}
