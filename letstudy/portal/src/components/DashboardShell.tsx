import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminTopNav } from "./AdminTopNav";
import { RecordLoginOnLoad } from "./RecordLoginOnLoad";
import { EmailVerifyBanner } from "./EmailVerifyBanner";

// portal.lstudy.in is admin-only — login already enforces role === "ADMIN",
// so this shell only ever renders the admin top-nav layout (the student
// sidebar half of the old shared DashboardShell lives in letstudy/app instead).
export async function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // Defense in depth: a session created by a DIFFERENT app (e.g. a STUDENT
  // logged into app.lstudy.in) must never render this ADMIN-only dashboard
  // just because a session cookie happens to be present.
  if ((session.user as { role?: string }).role !== "ADMIN") {
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
