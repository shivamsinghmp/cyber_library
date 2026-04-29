import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  IndianRupee, Users, Briefcase, Settings, HelpCircle,
  BookOpen, MessageSquare, Star, TrendingUp, Activity,
  ChevronRight, ShoppingBag, Mail, Bell, Zap,
} from "lucide-react";
import { AdminAnalyticsChart } from "./AdminAnalyticsChart";
import { requireAdminModule } from "@/lib/permissions";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;
  await requireAdminModule("SYSTEM_OVERVIEW");

  const [studentCount, employeeCount, employees, revenueResult, studySessionCount, newToday] =
    await Promise.all([
      prisma.user.count({ where: { role: "STUDENT", deletedAt: null } }),
      prisma.user.count({ where: { role: { in: ["EMPLOYEE", "ADMIN"] } } }),
      prisma.user.findMany({
        where: { role: { in: ["EMPLOYEE", "ADMIN"] } },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.transaction.aggregate({
        where: { status: "SUCCESS" },
        _sum: { amount: true },
      }),
      prisma.studySession.count(),
      prisma.user.count({
        where: {
          role: "STUDENT",
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

  const totalRevenue = revenueResult._sum.amount ?? 0;
  const displayName = (session?.user?.name ?? session?.user?.email ?? "Admin").split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const quickLinks = [
    { href: "/admin/students", icon: Users, label: "Students", color: "text-blue-400", bg: "bg-blue-500/15" },
    { href: "/admin/slots", icon: BookOpen, label: "Study Slots", color: "text-emerald-400", bg: "bg-emerald-500/15" },
    { href: "/admin/email", icon: Mail, label: "Email", color: "text-violet-400", bg: "bg-violet-500/15" },
    { href: "/admin/rewards", icon: Star, label: "Rewards", color: "text-amber-400", bg: "bg-amber-500/15" },
    { href: "/admin/feedback", icon: MessageSquare, label: "Feedback", color: "text-pink-400", bg: "bg-pink-500/15" },
    { href: "/admin/blog", icon: TrendingUp, label: "Blog", color: "text-cyan-400", bg: "bg-cyan-500/15" },
    { href: "/admin/store", icon: ShoppingBag, label: "Store", color: "text-orange-400", bg: "bg-orange-500/15" },
    { href: "/admin/faqs", icon: HelpCircle, label: "FAQs", color: "text-indigo-400", bg: "bg-indigo-500/15" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">

      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-[var(--ink)] via-black/60 to-[var(--ink)] p-7 shadow-2xl">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--accent)]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-32 w-64 rounded-full bg-blue-500/8 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--wood)]">{greeting}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-[var(--cream)]">
              {displayName} <span className="text-[var(--accent)]">↗</span>
            </h1>
            <p className="mt-1.5 text-sm text-[var(--cream-muted)]">
              Here&apos;s what&apos;s happening on The Cyber Library today
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/announcements" className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-[var(--cream-muted)] hover:bg-white/10 transition-colors">
              <Bell className="h-3.5 w-3.5" /> Announce
            </Link>
            <Link href="/admin/settings" className="flex items-center gap-1.5 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-2 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors">
              <Settings className="h-3.5 w-3.5" /> Settings
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Revenue",
            value: `₹${totalRevenue.toLocaleString("en-IN")}`,
            sub: `+₹0 today`,
            icon: IndianRupee,
            color: "text-amber-400",
            bg: "bg-amber-500/12",
            border: "border-amber-500/20",
            glow: "shadow-amber-500/5",
          },
          {
            label: "Students",
            value: studentCount.toLocaleString(),
            sub: `+${newToday} today`,
            icon: Users,
            color: "text-blue-400",
            bg: "bg-blue-500/12",
            border: "border-blue-500/20",
            glow: "shadow-blue-500/5",
          },
          {
            label: "Study Sessions",
            value: studySessionCount.toLocaleString(),
            sub: "All time",
            icon: BookOpen,
            color: "text-emerald-400",
            bg: "bg-emerald-500/12",
            border: "border-emerald-500/20",
            glow: "shadow-emerald-500/5",
          },
          {
            label: "Team Members",
            value: employeeCount.toString(),
            sub: "Staff & Admins",
            icon: Briefcase,
            color: "text-violet-400",
            bg: "bg-violet-500/12",
            border: "border-violet-500/20",
            glow: "shadow-violet-500/5",
          },
        ].map((card) => (
          <div
            key={card.label}
            className={`group relative overflow-hidden rounded-2xl border ${card.border} bg-black/30 p-5 shadow-xl ${card.glow} transition-all hover:scale-[1.02] hover:bg-black/40`}
          >
            <div className={`pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full ${card.bg} blur-2xl opacity-60`} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--cream-muted)]">{card.label}</p>
                <p className="mt-2 text-2xl font-extrabold text-[var(--cream)]">{card.value}</p>
                <p className="mt-0.5 text-[11px] text-[var(--cream-muted)]/70">{card.sub}</p>
              </div>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.bg} ${card.color}`}>
                <card.icon className="h-4.5 w-4.5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--wood)]">Quick Access</h2>
          <Link href="/admin/settings" className="text-xs text-[var(--cream-muted)] hover:text-[var(--accent)] transition-colors">
            All settings →
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
          {quickLinks.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="group flex flex-col items-center gap-2 rounded-2xl border border-white/8 bg-black/20 p-3 text-center transition-all hover:border-white/20 hover:bg-black/40 hover:scale-105"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${q.bg} ${q.color} transition-transform group-hover:scale-110`}>
                <q.icon className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-semibold text-[var(--cream-muted)] group-hover:text-[var(--cream)]">{q.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Charts ── */}
      <AdminAnalyticsChart />

      {/* ── Team + Activity ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Team */}
        <div className="rounded-2xl border border-white/8 bg-black/30 p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[var(--cream)]">Team</h2>
              <p className="text-[11px] text-[var(--cream-muted)]">Staff with panel access</p>
            </div>
            <Link href="/admin/create-staff" className="flex items-center gap-1 rounded-xl bg-[var(--accent)]/15 px-3 py-1.5 text-[11px] font-bold text-[var(--accent)] hover:bg-[var(--accent)]/25 transition-colors">
              <Zap className="h-3 w-3" /> Add
            </Link>
          </div>
          <ul className="space-y-1.5">
            {employees.length === 0 ? (
              <li className="rounded-xl border border-white/8 bg-black/20 px-4 py-4 text-center text-xs text-[var(--cream-muted)]">
                No team members yet
              </li>
            ) : (
              employees.map((u) => (
                <li key={u.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5 transition-colors hover:bg-black/40">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/15 text-xs font-bold text-[var(--accent)]">
                    {(u.name || u.email || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[var(--cream)]">{u.name || "—"}</p>
                    <p className="truncate text-[10px] text-[var(--cream-muted)]">{u.email}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    u.role === "ADMIN"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-[var(--accent)]/15 text-[var(--accent)]"
                  }`}>
                    {u.role}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Activity Feed */}
        <div className="rounded-2xl border border-white/8 bg-black/30 p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[var(--cream)]">System Status</h2>
              <p className="text-[11px] text-[var(--cream-muted)]">Platform health at a glance</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Operational
            </span>
          </div>
          <div className="space-y-2">
            {[
              { label: "Database", status: "Connected", ok: true },
              { label: "Authentication", status: "Active", ok: true },
              { label: "Email Service", status: "Configured", ok: true },
              { label: "Redis Cache", status: "Active", ok: true },
              { label: "Payment Gateway", status: "Razorpay Live", ok: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Activity className="h-3.5 w-3.5 text-[var(--cream-muted)]" />
                  <span className="text-xs font-medium text-[var(--cream)]">{item.label}</span>
                </div>
                <span className={`flex items-center gap-1.5 text-[10px] font-semibold ${item.ok ? "text-emerald-400" : "text-red-400"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${item.ok ? "bg-emerald-400" : "bg-red-400"}`} />
                  {item.status}
                </span>
              </div>
            ))}
          </div>
          <Link href="/admin/analytics" className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-white/8 bg-black/20 py-2.5 text-xs font-semibold text-[var(--cream-muted)] hover:bg-black/40 hover:text-[var(--cream)] transition-all">
            View detailed analytics <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

    </div>
  );
}
