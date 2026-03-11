import { DashboardShell } from "@/components/DashboardShell";

export default function AuthorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
