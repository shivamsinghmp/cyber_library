import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { RoleBasedSidebar } from "./RoleBasedSidebar";
import { StudentSidebar } from "./StudentSidebar";
import { RecordLoginOnLoad } from "./RecordLoginOnLoad";
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

  return (
    <div className={`min-h-screen flex flex-col bg-[var(--dash-bg)] ${!isStudent ? "admin-light" : ""}`}>
      {emailUnverified && <EmailVerifyBanner email={userEmail} />}
      <div className="flex flex-1 overflow-hidden">
        <RecordLoginOnLoad />
        {isStudent ? <StudentSidebar disabledModules={disabledModules} /> : <RoleBasedSidebar allowedModules={allowedModules} />}
        <main className="flex-1 overflow-auto px-4 py-6 pt-16 md:pt-6 md:px-6 lg:px-8">
          {isStudent ? <SubscriptionGate>{children}</SubscriptionGate> : children}
        </main>
      </div>
    </div>
  );
}
