import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  IndianRupee, Users, Briefcase, Settings, HelpCircle,
  BookOpen, MessageSquare, Star, ShoppingBag, Megaphone,
  FileText, Tag, UserCheck, BarChart2, Mail, Activity,
  AlertCircle, TrendingUp, Zap, Clock, Brain,
} from "lucide-react";
import { AdminAnalyticsChart } from "./AdminAnalyticsChart";
import { requireAdminModule } from "@/lib/permissions";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;
  await requireAdminModule("SYSTEM_OVERVIEW");

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    studentCount, employeeCount, employees,
    studySessionCount, revenueResult,
    todayRevenue, newStudentsThisWeek,
    activeSessionsNow, pendingFeedback,
    totalStudyHours, totalTransactions,
    openSupportCount, blogCount, couponCount,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT", deletedAt: null } }),
    prisma.user.count({ where: { role: { in: ["EMPLOYEE", "ADMIN"] } } }),
    prisma.user.findMany({
      where: { role: { in: ["EMPLOYEE", "ADMIN"] } },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.studySession.count(),
    prisma.transaction.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { status: "SUCCESS", createdAt: { gte: today } }, _sum: { amount: true } }),
    prisma.user.count({ where: { role: "STUDENT", createdAt: { gte: weekAgo }, deletedAt: null } }),
    prisma.studySession.count({ where: { startedAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }, endedAt: null } }),
    prisma.feedback.count({ where: { status: "OPEN" } }).catch(() => 0),
    prisma.profile.aggregate({ _sum: { totalStudyHours: true } }),
    prisma.transaction.count({ where: { status: "SUCCESS" } }),
    prisma.feedback.count({ where: { status: "OPEN" } }).catch(() => 0),
    prisma.blogPost.count({ where: { publishedAt: { not: null } } }).catch(() => 0),
    prisma.coupon.count({ where: { isActive: true } }).catch(() => 0),
  ]);

  const totalRevenue = revenueResult._sum.amount ?? 0;
  const todayRev = todayRevenue._sum.amount ?? 0;
  const totalHours = Math.floor(totalStudyHours._sum.totalStudyHours ?? 0);
  const displayName = (session?.user?.name ?? session?.user?.email ?? "Admin").split(" ")[0];

  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const statCards = [
    {
      label: "Total Revenue",
      value: `₹${totalRevenue.toLocaleString("en-IN")}`,
      sub: `₹${todayRev.toLocaleString("en-IN")} today`,
      icon: IndianRupee,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
      href: "/admin/transactions",
    },
    {
      label: "Students",
      value: studentCount.toLocaleString(),
      sub: `+${newStudentsThisWeek} this week`,
      icon: Users,
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      href: "/admin/students",
    },
    {
      label: "Study Sessions",
      value: studySessionCount.toLocaleString(),
      sub: `${activeSessionsNow} active now`,
      icon: BookOpen,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      href: "/admin/students",
    },
    {
      label: "Study Hours",
      value: totalHours >= 1000 ? `${(totalHours / 1000).toFixed(1)}k` : totalHours.toString(),
      sub: "Total platform hours",
      icon: Clock,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      href: "/admin/students",
    },
    {
      label: "Transactions",
      value: totalTransactions.toLocaleString(),
      sub: "Successful payments",
      icon: TrendingUp,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
      href: "/admin/transactions",
    },
    {
      label: "Team Size",
      value: employeeCount.toString(),
      sub: "Staff & admins",
      icon: Briefcase,
      iconBg: "bg-rose-50",
      iconColor: "text-rose-600",
      href: "/admin/staff",
    },
    {
      label: "Open Tickets",
      value: pendingFeedback.toString(),
      sub: pendingFeedback > 0 ? "Needs attention" : "All clear",
      icon: AlertCircle,
      iconBg: pendingFeedback > 0 ? "bg-amber-50" : "bg-emerald-50",
      iconColor: pendingFeedback > 0 ? "text-amber-600" : "text-emerald-600",
      href: "/admin/feedback",
    },
  ];

  const quickLinks = [
    { label: "Students",     icon: Users,         href: "/admin/students",     desc: "Manage & search students",     iconBg: "bg-indigo-50",  iconColor: "text-indigo-600" },
    { label: "Slots",        icon: Clock,         href: "/admin/slots",        desc: "Study slot management",        iconBg: "bg-blue-50",    iconColor: "text-blue-600" },
    { label: "Transactions", icon: IndianRupee,   href: "/admin/transactions", desc: "Payments & revenue",           iconBg: "bg-amber-50",   iconColor: "text-amber-600" },
    { label: "Blog",         icon: FileText,      href: "/admin/blog",         desc: `${blogCount} published posts`, iconBg: "bg-cyan-50",    iconColor: "text-cyan-600" },
    { label: "Coupons",      icon: Tag,           href: "/admin/coupons",      desc: `${couponCount} active`,        iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { label: "Email",        icon: Mail,          href: "/admin/email",        desc: "Templates & logs",             iconBg: "bg-violet-50",  iconColor: "text-violet-600" },
    { label: "Feedback",     icon: MessageSquare, href: "/admin/feedback",     desc: `${openSupportCount} open`,     iconBg: "bg-rose-50",    iconColor: "text-rose-600" },
    { label: "WhatsApp",     icon: Megaphone,     href: "/admin/whatsapp",     desc: "Broadcast messages",           iconBg: "bg-green-50",   iconColor: "text-green-600" },
    { label: "Rewards",      icon: Star,          href: "/admin/rewards",      desc: "Coins & contests",             iconBg: "bg-amber-50",   iconColor: "text-amber-600" },
    { label: "Products",     icon: ShoppingBag,   href: "/admin/products",     desc: "Digital store",                iconBg: "bg-purple-50",  iconColor: "text-purple-600" },
    { label: "Analytics",    icon: BarChart2,     href: "/admin/traffic",      desc: "Traffic & events",             iconBg: "bg-indigo-50",  iconColor: "text-indigo-600" },
    { label: "Staff",        icon: UserCheck,     href: "/admin/staff",        desc: "Team permissions",             iconBg: "bg-blue-50",    iconColor: "text-blue-600" },
    { label: "FAQs",         icon: HelpCircle,    href: "/admin/faqs",         desc: "Homepage FAQs",                iconBg: "bg-teal-50",    iconColor: "text-teal-600" },
    { label: "Referrals",    icon: Zap,           href: "/admin/referrals",    desc: "Affiliate codes",              iconBg: "bg-orange-50",  iconColor: "text-orange-600" },
    { label: "Audit Logs",   icon: Activity,      href: "/admin/audit-logs",   desc: "System activity",              iconBg: "bg-slate-100",  iconColor: "text-slate-600" },
    { label: "Settings",     icon: Settings,      href: "/admin/settings",     desc: "Platform config",              iconBg: "bg-gray-100",   iconColor: "text-gray-600" },
    { label: "AI Keys",      icon: Brain,         href: "/admin/ai-settings",  desc: "Vertex AI / Claude / OpenAI", iconBg: "bg-violet-50",  iconColor: "text-violet-600" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 mb-1">{greeting}</p>
          <h1 className="text-2xl font-extrabold text-gray-900 md:text-3xl tracking-tight">
            {displayName} <span className="text-indigo-400 font-medium">— Admin</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Last updated: {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {activeSessionsNow > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              {activeSessionsNow} studying now
            </div>
          )}
          {pendingFeedback > 0 && (
            <Link href="/admin/feedback" className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 transition">
              <AlertCircle className="h-3.5 w-3.5" />
              {pendingFeedback} open tickets
            </Link>
          )}
          <Link href="/admin/settings" className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition shadow-sm">
            <Settings className="h-4 w-4" /> Settings
          </Link>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href}
              className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all"
            >
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${card.iconBg} ${card.iconColor}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">{card.label}</p>
              <p className="mt-0.5 text-xl font-extrabold text-gray-900 leading-tight">{card.value}</p>
              <p className="mt-1 text-[10px] text-gray-400">{card.sub}</p>
            </Link>
          );
        })}
      </div>

      {/* ── Analytics Chart ── */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Platform Analytics</h2>
          <p className="text-xs text-gray-500 mt-0.5">Revenue, study hours & popular slots — last 7 days</p>
        </div>
        <div className="p-4">
          <AdminAnalyticsChart />
        </div>
      </div>

      {/* ── Quick Access Grid ── */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Quick Access</h2>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.label} href={link.href}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white p-4 text-center hover:border-indigo-300 hover:shadow-md transition-all"
                title={link.desc}
              >
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${link.iconBg} ${link.iconColor} group-hover:scale-110 transition-transform`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-semibold text-gray-600 group-hover:text-indigo-600 transition-colors leading-tight">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Bottom: Staff + System Health ── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Staff */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Team</h2>
              <p className="text-xs text-gray-500 mt-0.5">Staff & admins</p>
            </div>
            <Link href="/admin/staff" className="text-xs text-indigo-600 hover:underline font-semibold">Manage →</Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {employees.length === 0 ? (
              <li className="px-5 py-4 text-sm text-gray-500">No team members yet</li>
            ) : employees.map((u: { id: string; name: string | null; email: string; role: string }) => (
              <li key={u.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-extrabold">
                    {(u.name || u.email || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 leading-tight">{u.name || "—"}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  u.role === "ADMIN"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-indigo-100 text-indigo-700"
                }`}>{u.role}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* System Health */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-widest">System Status</h2>
            <p className="text-xs text-gray-500 mt-0.5">Platform health at a glance</p>
          </div>
          <ul className="divide-y divide-gray-100">
            {[
              { label: "Active Study Sessions",  value: activeSessionsNow,   good: activeSessionsNow >= 0,     unit: "live",    href: "/admin/students" },
              { label: "Open Feedback Tickets",  value: pendingFeedback,     good: pendingFeedback === 0,      unit: "pending", href: "/admin/feedback" },
              { label: "Active Coupons",         value: couponCount,         good: true,                        unit: "codes",   href: "/admin/coupons" },
              { label: "Published Blog Posts",   value: blogCount,           good: true,                        unit: "posts",   href: "/admin/blog" },
              { label: "New Students (7d)",      value: newStudentsThisWeek, good: newStudentsThisWeek >= 0,   unit: "joined",  href: "/admin/students" },
              { label: "Revenue Today",          value: `₹${todayRev.toLocaleString("en-IN")}`, good: true,  unit: "",        href: "/admin/transactions" },
            ].map((row) => (
              <li key={row.label} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${row.good ? "bg-emerald-500" : "bg-amber-400 animate-pulse"}`} />
                  <Link href={row.href} className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">{row.label}</Link>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {row.value} <span className="text-xs font-normal text-gray-400">{row.unit}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}
