import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { RoleBasedSidebar } from "./RoleBasedSidebar";
import { AdminTopNav } from "./AdminTopNav";
import { StudentSidebar } from "./StudentSidebar";
import { RecordLoginOnLoad } from "./RecordLoginOnLoad";
import { ActivityTracker } from "./ActivityTracker";
import { SubscriptionGate } from "./SubscriptionGate";
import { EmailVerifyBanner } from "./EmailVerifyBanner";
import { getDisabledModules, getStudentDisabledModules } from "@/lib/student-modules";

export async function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as { role?: string }).role ?? "STUDENT";
  const isStudent = role === "STUDENT";
  const userId = session.user.id;

  const { prisma } = await import("@/lib/prisma");

  let allowedModules: string[] = [];
  if (role === "EMPLOYEE") {
    try {
      const p = await prisma.employeePermission.findUnique({ where: { userId }});
      if (p) allowedModules = p.modules;
    } catch {}
  }

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

  const disabledModules = isStudent && userId
    ? await Promise.all([getDisabledModules(), getStudentDisabledModules(userId)])
        .then(([global, student]) => [...new Set([...global, ...student])])
        .catch(() => [] as string[])
    : [];

  // Admin/staff/non-student: top nav layout (full-width, no sidebar)
  if (!isStudent) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50 admin-light">
        <AdminTopNav allowedModules={allowedModules} />
        {emailUnverified && <EmailVerifyBanner email={userEmail} />}
        <RecordLoginOnLoad />
        <main className="flex-1 w-full overflow-y-auto px-4 py-5 md:px-6 lg:px-8">
          {children}
        </main>
      </div>
    );
  }

  // Student: sidebar layout
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
