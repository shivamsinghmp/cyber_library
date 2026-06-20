import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";
import { logTrialEvent } from "@/lib/trial-logger";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId  = (session?.user as { id?: string })?.id;

  // app.lstudy.in is student-only — role is already enforced at login,
  // but the trial/subscription gate only applies to students.
  if (userId) {
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
