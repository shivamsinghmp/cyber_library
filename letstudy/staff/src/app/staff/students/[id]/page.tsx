import { requireStaffModule } from "@/lib/permissions";
import StudentDetailClient from "./StudentDetailClient";

export default async function StaffStudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireStaffModule("STUDENT_MGMT");
  const { id } = await params;
  return <StudentDetailClient id={id} />;
}
