import { DashboardShell } from "@/components/DashboardShell";

export default function AffiliateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
