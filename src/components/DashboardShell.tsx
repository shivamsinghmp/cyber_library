import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { RoleBasedSidebar } from "./RoleBasedSidebar";
import { StudentSidebar } from "./StudentSidebar";
import { RecordLoginOnLoad } from "./RecordLoginOnLoad";
import { SessionProvider } from "@/components/SessionProvider";

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
  
  let allowedModules: string[] = [];
  if (role === "EMPLOYEE") {
    const { prisma } = await import("@/lib/prisma");
    const p = await prisma.employeePermission.findUnique({ where: { userId: session.user.id }});
    if (p) allowedModules = p.modules;
  }

  return (
    <SessionProvider>
      <div className="min-h-screen flex bg-[var(--background)]">
        <RecordLoginOnLoad />
        {isStudent ? <StudentSidebar /> : <RoleBasedSidebar allowedModules={allowedModules} />}
        <main className="flex-1 overflow-auto px-4 py-8 pt-14 md:pt-8 md:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
