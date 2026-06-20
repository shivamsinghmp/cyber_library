import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StudentSidebar } from "./StudentSidebar";
import { RecordLoginOnLoad } from "./RecordLoginOnLoad";
import { ActivityTracker } from "./ActivityTracker";
import { SubscriptionGate } from "./SubscriptionGate";
import { EmailVerifyBanner } from "./EmailVerifyBanner";
import { getDisabledModules, getStudentDisabledModules } from "@/lib/student-modules";

// app.lstudy.in is student-only — login already enforces role === "STUDENT",
// so this shell only ever renders the student sidebar layout.
export async function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Defense in depth: a session created by a DIFFERENT app (e.g. an ADMIN
  // logged into portal.lstudy.in) must never render this STUDENT-only
  // dashboard just because a session cookie happens to be present.
  if ((session.user as { role?: string }).role !== "STUDENT") {
    redirect("/login");
  }

  const userId = session.user.id;

  let emailUnverified = false;
  let userEmail = session.user.email ?? "";
  if (userId && userId !== "ENV_SUPERADMIN") {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { emailVerified: true, email: true },
      });
      if (dbUser) {
        emailUnverified = !dbUser.emailVerified;
        userEmail = dbUser.email ?? userEmail;
      }
    } catch {}
  }

  const disabledModules = userId
    ? await Promise.all([getDisabledModules(), getStudentDisabledModules(userId)])
        .then(([global, student]) => [...new Set([...global, ...student])])
        .catch(() => [] as string[])
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--dash-bg)]">
      {emailUnverified && <EmailVerifyBanner email={userEmail} />}
      <div className="flex flex-1 overflow-hidden">
        <RecordLoginOnLoad />
        <ActivityTracker />
        <StudentSidebar disabledModules={disabledModules} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide px-4 py-6 pt-16 md:pt-6 md:px-6 lg:px-8">
          <SubscriptionGate>{children}</SubscriptionGate>
        </main>
      </div>
    </div>
  );
}
