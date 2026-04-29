import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  IndianRupee, Users, Briefcase, Settings, HelpCircle,
  BookOpen, MessageSquare, Star, ShoppingBag, Megaphone,
  FileText, Tag, UserCheck, BarChart2, Mail, Activity,
  AlertCircle, TrendingUp, Zap, Clock,
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
    prisma.blog.count({ where: { published: true } }).catch(() => 0),
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
      color: "amber",
      href: "/admin/transactions",
    },
    {
      label: "Students",
      value: studentCount.toLocaleString(),
      sub: `+${newStudentsThisWeek} this week`,
      icon: Users,
      color: "accent",
      href: "/admin/students",
    },
    {
      label: "Study Sessions",
      value: studySessionCount.toLocaleString(),
      sub: `${activeSessionsNow} active now`,
      icon: BookOpen,
      color: "emerald",
      href: "/admin/students",
    },
    {
      label: "Study Hours",
      value: totalHours >= 1000 ? `${(totalHours / 1000).toFixed(1)}k` : totalHours.toString(),
      sub: "Total platform hours",
      icon: Clock,
      color: "blue",
      href: "/admin/students",
    },
    {
      label: "Transactions",
      value: totalTransactions.toLocaleString(),
      sub: "Successful payments",
      icon: TrendingUp,
      color: "purple",
      href: "/admin/transactions",
    },
    {
      label: "Team Size",
      value: employeeCount.toString(),
      sub: "Staff & admins",
      icon: Briefcase,
      color: "rose",
      href: "/admin/staff",
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
    amber:   { bg: "bg-amber-500/15",   text: "text-amber-400",   ring: "ring-amber-500/20" },
    accent:  { bg: "bg-[var(--accent)]/15", text: "text-[var(--accent)]", ring: "ring-[var(--accent)]/20" },
    emerald: { bg: "bg-emerald-500/15", text: "text-emerald-400", ring: "ring-emerald-500/20" },
    blue:    { bg: "bg-blue-500/15",    text: "text-blue-400",    ring: "ring-blue-500/20" },
    purple:  { bg: "bg-purple-500/15",  text: "text-purple-400",  ring: "ring-purple-500/20" },
    rose:    { bg: "bg-rose-500/15",    text: "text-rose-400",    ring: "ring-rose-500/20" },
  };

  const quickLinks = [
    { label: "Students",      icon: Users,         href: "/admin/students",     desc: "Manage & search students" },
    { label: "Slots",         icon: Clock,         href: "/admin/slots",        desc: "Study slot management" },
    { label: "Transactions",  icon: IndianRupee,   href: "/admin/transactions", desc: "Payments & revenue" },
    { label: "Blog",          icon: FileText,      href: "/admin/blog",         desc: `${blogCount} published posts` },
    { label: "Coupons",       icon: Tag,           href: "/admin/coupons",      desc: `${couponCount} active coupons` },
    { label: "Email",         icon: Mail,          href: "/admin/email",        desc: "Templates & logs" },
    { label: "Feedback",      icon: MessageSquare, href: "/admin/feedback",     desc: `${openSupportCount} open tickets` },
    { label: "WhatsApp",      icon: Megaphone,     href: "/admin/whatsapp",     desc: "Broadcast messages" },
    { label: "Rewards",       icon: Star,          href: "/admin/rewards",      desc: "Coins & contests" },
    { label: "Products",      icon: ShoppingBag,   href: "/admin/products",     desc: "Digital store" },
    { label: "Analytics",     icon: BarChart2,     href: "/admin/traffic",      desc: "Traffic & events" },
    { label: "Staff",         icon: UserCheck,     href: "/admin/staff",        desc: "Team permissions" },
    { label: "FAQs",          icon: HelpCircle,    href: "/admin/faqs",         desc: "Homepage FAQs" },
    { label: "Referrals",     icon: Zap,           href: "/admin/referrals",    desc: "Affiliate codes" },
    { label: "Audit Logs",    icon: Activity,      href: "/admin/audit-logs",   desc: "System activity" },
    { label: "Settings",      icon: Settings,      href: "/admin/settings",     desc: "Platform config" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--wood)] mb-1">{greeting}</p>
          <h1 className="text-2xl font-extrabold text-[var(--cream)] md:text-3xl tracking-tight">
            {displayName} <span className="text-[var(--wood)]">— Admin</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--cream-muted)]">
            {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeSessionsNow > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {activeSessionsNow} studying now
            </div>
          )}
          {pendingFeedback > 0 && (
            <Link href="/admin/feedback" className="flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition">
              <AlertCircle className="h-3.5 w-3.5" />
              {pendingFeedback} open tickets
            </Link>
          )}
          <Link href="/admin/settings" className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs font-medium text-[var(--cream-muted)] hover:bg-black/50 transition">
            <Settings className="h-4 w-4" /> Settings
          </Link>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((card) => {
          const c = colorMap[card.color];
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href}
              className="group rounded-2xl border border-white/8 bg-black/30 p-4 shadow-lg hover:border-white/20 hover:bg-black/50 transition-all"
            >
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${c.bg} ${c.text} ${c.ring}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--cream-muted)]">{card.label}</p>
              <p className="mt-0.5 text-xl font-extrabold text-[var(--cream)] leading-tight">{card.value}</p>
              <p className="mt-1 text-[10px] text-[var(--wood)]">{card.sub}</p>
            </Link>
          );
        })}
      </div>

      {/* ── Analytics Chart ── */}
      <div className="rounded-2xl border border-white/8 bg-black/30 shadow-xl overflow-hidden">
        <div className="px-6 pt-5 pb-2 border-b border-white/6">
          <h2 className="text-sm font-bold text-[var(--cream)] uppercase tracking-widest">Platform Analytics</h2>
          <p className="text-xs text-[var(--cream-muted)] mt-0.5">Revenue, study hours & popular slots — last 7 days</p>
        </div>
        <div className="p-4">
          <AdminAnalyticsChart />
        </div>
      </div>

      {/* ── Quick Access Grid ── */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--wood)] mb-3">Quick Access</h2>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.label} href={link.href}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-white/8 bg-black/20 p-4 text-center hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/6 transition-all"
                title={link.desc}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-[var(--cream-muted)] group-hover:bg-[var(--accent)]/15 group-hover:text-[var(--accent)] transition-all">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-semibold text-[var(--cream-muted)] group-hover:text-[var(--cream)] transition-colors leading-tight">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Bottom: Staff + System Health ── */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Staff */}
        <div className="rounded-2xl border border-white/8 bg-black/30 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/6">
            <div>
              <h2 className="text-sm font-bold text-[var(--cream)] uppercase tracking-widest">Team</h2>
              <p className="text-xs text-[var(--cream-muted)] mt-0.5">Staff & admins</p>
            </div>
            <Link href="/admin/staff" className="text-xs text-[var(--accent)] hover:underline font-semibold">Manage →</Link>
          </div>
          <ul className="divide-y divide-white/5">
            {employees.length === 0 ? (
              <li className="px-5 py-4 text-sm text-[var(--cream-muted)]">No team members yet</li>
            ) : employees.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/3 transition">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)] text-xs font-extrabold">
                    {(u.name || u.email || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--cream)] leading-tight">{u.name || "—"}</p>
                    <p className="text-xs text-[var(--cream-muted)]">{u.email}</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  u.role === "ADMIN"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-[var(--accent)]/15 text-[var(--accent)]"
                }`}>{u.role}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* System Health */}
        <div className="rounded-2xl border border-white/8 bg-black/30 shadow-xl overflow-hidden">
          <div className="px-5 pt-5 pb-3 border-b border-white/6">
            <h2 className="text-sm font-bold text-[var(--cream)] uppercase tracking-widest">System Status</h2>
            <p className="text-xs text-[var(--cream-muted)] mt-0.5">Platform health at a glance</p>
          </div>
          <ul className="divide-y divide-white/5">
            {[
              { label: "Active Study Sessions",  value: activeSessionsNow,   good: activeSessionsNow >= 0,     unit: "live",     href: "/admin/students" },
              { label: "Open Feedback Tickets",  value: pendingFeedback,     good: pendingFeedback === 0,      unit: "pending",  href: "/admin/feedback" },
              { label: "Active Coupons",         value: couponCount,         good: true,                        unit: "codes",    href: "/admin/coupons" },
              { label: "Published Blog Posts",   value: blogCount,           good: true,                        unit: "posts",    href: "/admin/blog" },
              { label: "New Students (7d)",      value: newStudentsThisWeek, good: newStudentsThisWeek >= 0,   unit: "joined",   href: "/admin/students" },
              { label: "Revenue Today",          value: `₹${todayRev.toLocaleString("en-IN")}`, good: true,  unit: "",         href: "/admin/transactions" },
            ].map((row) => (
              <li key={row.label} className="flex items-center justify-between px-5 py-3 hover:bg-white/3 transition">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${row.good ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
                  <Link href={row.href} className="text-sm text-[var(--cream-muted)] hover:text-[var(--cream)] transition-colors">{row.label}</Link>
                </div>
                <span className="text-sm font-bold text-[var(--cream)]">
                  {row.value} <span className="text-xs font-normal text-[var(--wood)]">{row.unit}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

      </div>
    </div>
  );
}
