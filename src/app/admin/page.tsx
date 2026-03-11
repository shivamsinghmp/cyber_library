import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { IndianRupee, Users, Briefcase, Settings } from "lucide-react";
import { AdminAnalyticsChart } from "./AdminAnalyticsChart";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;
  const [studentCount, employeeCount, employees, studySessionCount, revenueResult] =
    await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.user.count({
        where: { role: { in: ["EMPLOYEE", "ADMIN"] } },
      }),
      prisma.user.findMany({
        where: { role: { in: ["EMPLOYEE", "ADMIN"] } },
        select: { id: true, name: true, email: true, role: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.studySession.count(),
      prisma.transaction.aggregate({
        where: { status: "SUCCESS" },
        _sum: { amount: true },
      }),
    ]);

  const totalRevenue = revenueResult._sum.amount ?? 0;

  const displayName = session?.user?.name ?? session?.user?.email ?? "Admin";

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--cream)] md:text-3xl">
            Welcome, {displayName}!
          </h1>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">
            Admin Dashboard — overview of revenue, students, and team
          </p>
        </div>
        <Link
          href="/admin/settings"
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm font-medium text-[var(--cream)] hover:bg-black/50 transition"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <IndianRupee className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--cream-muted)]">
                Total Revenue
              </p>
              <p className="text-xl font-bold text-[var(--cream)]">
                ₹{totalRevenue.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--accent)]/20 text-[var(--accent)]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--cream-muted)]">
                Total Students
              </p>
              <p className="text-xl font-bold text-[var(--cream)]">
                {studentCount}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/30 p-5 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--cream-muted)]">
                Employees
              </p>
              <p className="text-xl font-bold text-[var(--cream)]">
                {employeeCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      <AdminAnalyticsChart />

      <div className="rounded-2xl border border-white/10 bg-black/30 p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-[var(--cream)]">
          Employee List
        </h2>
        <p className="mt-1 text-xs text-[var(--cream-muted)]">
          Staff and admins with access to this panel
        </p>
        <ul className="mt-4 space-y-2">
          {employees.length === 0 ? (
            <li className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-[var(--cream-muted)]">
              No employees yet
            </li>
          ) : (
            employees.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-[var(--cream)]">
                    {u.name || "—"}
                  </p>
                  <p className="text-xs text-[var(--cream-muted)]">{u.email}</p>
                </div>
                <span className="rounded-full bg-[var(--accent)]/20 px-2.5 py-0.5 text-xs font-medium text-[var(--accent)]">
                  {u.role}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
