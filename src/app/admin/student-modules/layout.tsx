import { requireAdminModule } from "@/lib/permissions";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAdminModule("STUDENT_MGMT");
  return <>{children}</>;
}
