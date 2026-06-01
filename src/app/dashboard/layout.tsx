import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";
import { logTrialEvent } from "@/lib/trial-logger";
import { verifyAdminViewToken } from "@/lib/adminViewToken";
import { AdminViewBanner } from "@/components/AdminViewBanner";

// Pages within /dashboard that are accessible even with an expired trial
const TRIAL_FREE_PATHS = [
  "/dashboard/settings",
  "/dashboard/profile",
  "/dashboard/receipt",
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ── Admin "View as Student" mode ──────────────────────────────────────────
  const cookieStore = await cookies();
  const asvToken    = cookieStore.get("__asv")?.value;

  if (asvToken) {
    const payload = verifyAdminViewToken(asvToken);
    if (payload) {
      // Fetch student name for the banner
      const student = await prisma.user.findUnique({
        where:  { id: payload.studentId },
        select: { name: true, studentId: true, profile: { select: { fullName: true } } },
      });

      return (
        <>
          <AdminViewBanner
            adminName={payload.adminName}
            studentName={student?.profile?.fullName ?? student?.name ?? "Student"}
            studentUniqueId={student?.studentId ?? payload.studentId.slice(0, 8)}
          />
          <DashboardShell>{children}</DashboardShell>
        </>
      );
    }
    // Token invalid/expired — fall through to normal auth flow
  }

  // ── Normal student auth & trial gate ─────────────────────────────────────
  const session = await auth();
  const userId  = (session?.user as { id?: string })?.id;
  const role    = (session?.user as { role?: string })?.role ?? "STUDENT";

  if (userId && role === "STUDENT") {
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { trialUsed: true },
    });

    if (user?.trialUsed) {
      const activeSub = await prisma.userSubscription.findFirst({
        where: {
          userId,
          status:  "ACTIVE",
          endDate: { gt: new Date() },
        },
        select: { id: true },
      });

      if (!activeSub) {
        logTrialEvent({ userId, event: "dashboard_locked" });
        redirect("/trial-expired");
      }
    }
  }

  return <DashboardShell>{children}</DashboardShell>;
}
