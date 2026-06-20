import { requireStaffModule } from "@/lib/permissions";
import ReferralsClient from "./ReferralsClient";

export default async function StaffReferralsPage() {
  await requireStaffModule("STUDENT_MGMT");
  return <ReferralsClient />;
}
