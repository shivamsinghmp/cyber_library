import { requireStaffModule } from "@/lib/permissions";
import StudentsListClient from "./StudentsListClient";

export default async function StaffStudentsPage() {
  await requireStaffModule("STUDENT_MGMT");
  return <StudentsListClient />;
}
