import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StaffTopNav } from "./StaffTopNav";

// staff.lstudy.in is EMPLOYEE-only — login already enforces role === "EMPLOYEE"
// and employeeStatus === "APPROVED". What an approved staff member can see
// (e.g. the WhatsApp tab) is scoped by the EmployeePermission.modules array
// an admin assigns from portal.lstudy.in's /admin/staff page.
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
  // logged into portal.lstudy.in) must never render this EMPLOYEE-only
  // dashboard just because a session cookie happens to be present — verify
  // the role (and current approval status, in case it was revoked after
  // login) against the DB on every render, not just at login time.
  const userId = session.user.id;
  const dbUser = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { role: true, employeeStatus: true } })
    : null;
  if (!dbUser || dbUser.role !== "EMPLOYEE" || dbUser.employeeStatus !== "APPROVED") {
    redirect("/login");
  }

  let allowedModules: string[] = [];
  try {
    const p = await prisma.employeePermission.findUnique({ where: { userId } });
    if (p) allowedModules = p.modules;
  } catch {}

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <StaffTopNav allowedModules={allowedModules} />
      <main className="flex-1 w-full overflow-y-auto px-4 py-5 md:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
