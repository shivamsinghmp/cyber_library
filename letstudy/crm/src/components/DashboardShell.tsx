import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminTopNav } from "./AdminTopNav";
import { RecordLoginOnLoad } from "./RecordLoginOnLoad";
import { EmailVerifyBanner } from "./EmailVerifyBanner";

// crm.lstudy.in is dual-role: ADMIN always gets in; EMPLOYEE only with the
// "SALES" module in EmployeePermission — re-checked on every render so a
// permission revoked after login takes effect immediately.
export async function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as { role?: string }).role;
  const userId = session.user.id;

  if (role === "EMPLOYEE") {
    const perm = userId ? await prisma.employeePermission.findUnique({ where: { userId } }) : null;
    if (!perm?.modules.includes("SALES")) {
      redirect("/login");
    }
  } else if (role !== "ADMIN") {
    redirect("/login");
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 admin-light">
      <AdminTopNav />
      {emailUnverified && <EmailVerifyBanner email={userEmail} />}
      <RecordLoginOnLoad />
      <main className="flex-1 w-full overflow-y-auto px-4 py-5 md:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
