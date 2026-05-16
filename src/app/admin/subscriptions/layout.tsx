import { requireAdminModule } from "@/lib/permissions";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireAdminModule("FINANCE");
  return <>{children}</>;
}
