"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Home,
  LogOut,
  Users,
  Tag,
  FileText,
  Receipt,
  Gift,
  Download,
  Settings,
  MessageCircle,
  ClipboardList,
  Activity,
  ShoppingBag,
  Plus,
  MessageSquare,
  Trophy,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Database,
  BarChart,
  MonitorPlay,
  UserCircle,
  Calendar,
  Link2,
} from "lucide-react";
import { signOut } from "next-auth/react";

type NavItem = { href: string; label: string };
type NavNode = {
  href?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: NavItem[];
  moduleId?: string;
};

const roleNav: Record<string, NavNode[]> = {
  ADMIN: [
    {
      moduleId: "SYSTEM_OVERVIEW",
      label: "General Overview",
      icon: BarChart,
      subItems: [
        { href: "/", label: "Home" },
        { href: "/admin", label: "Admin Dashboard" },
        { href: "/admin/traffic", label: "Traffic" },
        { href: "/admin/audit-logs", label: "Audit Logs" },
        { href: "/admin/settings", label: "Settings" },
        { href: "/admin/ai-settings", label: "AI API Keys" },
      ],
    },
    {
      moduleId: "VIRTUAL_LIBRARY",
      label: "Virtual Library & Meet",
      icon: MonitorPlay,
      subItems: [
        { href: "/admin/virtual-library", label: "The Cyber Library" },
        { href: "/admin/slots", label: "Study Room Management" },
        { href: "/admin/meet-polls", label: "Meet Polls" },
      ],
    },
    {
      moduleId: "STUDENT_MGMT",
      label: "People Management",
      icon: Users,
      subItems: [
        { href: "/admin/students", label: "Student Management" },
        { href: "/admin/student-modules", label: "Student Modules" },
        { href: "/admin/staff", label: "Staff Management" },
        { href: "/admin/profile-fields", label: "Profile Fields" },
        { href: "/admin/authors", label: "Authors" },
        { href: "/admin/referrals", label: "Referrals" },
      ],
    },
    {
      moduleId: "FINANCE",
      label: "eCommerce & Finance",
      icon: Receipt,
      subItems: [
        { href: "/admin/transactions", label: "Transactions" },
        { href: "/admin/subscriptions", label: "Subscriptions" },
        { href: "/admin/products", label: "Digital Store" },
        { href: "/admin/pricing", label: "Pricing Page" },
        { href: "/admin/coupons", label: "Coupons" },
        { href: "/admin/rewards", label: "Reward Program" },
        { href: "/admin/razorpay", label: "Razorpay API" },
        { href: "/admin/coin-engine", label: "Coin Engine" },
      ],
    },
    {
      moduleId: "ENGAGEMENT",
      label: "Engagement & Support",
      icon: MessageCircle,
      subItems: [
        { href: "/admin/whatsapp", label: "WhatsApp" },
        { href: "/admin/leads", label: "Leads" },
        { href: "/admin/forms", label: "Student Form" },
        { href: "/admin/feedback", label: "Student Feedback" },
        { href: "/admin/support", label: "Support Tickets" },
        { href: "/admin/faqs", label: "Dynamic FAQs" },
        { href: "/admin/email", label: "Email Setup" },
      ],
    },
    {
      moduleId: "CONTENT",
      label: "Content & System",
      icon: Database,
      subItems: [
        { href: "/admin/blog", label: "Blog (SEO)" },
        { href: "/admin/footer", label: "Footer Builder" },
        { href: "/admin/export", label: "Data Export" },
        { href: "/admin/bin", label: "Bin" },
      ],
    },
  ],
  EMPLOYEE: [
    { href: "/", label: "Home", icon: Home },
    { href: "/staff", label: "Staff Dashboard", icon: LayoutDashboard },
    { href: "/staff/whatsapp", label: "WhatsApp Chats", icon: MessageCircle },
    { href: "/staff/profile", label: "Profile", icon: UserCircle },
  ],
  STUDENT: [
    { href: "/", label: "Home", icon: Home },
    { href: "/dashboard", label: "My Dashboard", icon: Trophy },
    { href: "/study-room", label: "Study Room", icon: Calendar },
    { href: "/dashboard/leaderboard", label: "Leaderboard", icon: Trophy },
  ],
  INFLUENCER: [
    { href: "/", label: "Home", icon: Home },
    { href: "/affiliate", label: "Affiliate Dashboard", icon: Link2 },
  ],
  AUTHOR: [
    { href: "/", label: "Home", icon: Home },
    { href: "/author", label: "My Posts", icon: FileText },
    { href: "/author/create", label: "Create blog", icon: Plus },
  ],
};

import { hasModuleAccess, AdminModuleIds } from "@/lib/permissions-client";

export function RoleBasedSidebar({ allowedModules = [] }: { allowedModules?: string[] }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const role = (session?.user as { role?: string })?.role ?? "STUDENT";

  let links = roleNav[role] ?? roleNav.STUDENT;

  if (role === "EMPLOYEE") {
    links = roleNav["ADMIN"].filter((node) => {
      if (!node.moduleId) return true;
      return hasModuleAccess(role, allowedModules, node.moduleId as AdminModuleIds);
    });
    links.unshift({ href: "/staff", label: "Staff Portal", icon: LayoutDashboard });
  }

  if (role === "ADMIN") {
    links = roleNav["ADMIN"];
  }

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteTitle, setSiteTitle] = useState("The Cyber Library");
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/site-branding")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: { logoUrl?: string | null; title?: string | null }) => {
        if (d.logoUrl) setLogoUrl(d.logoUrl);
        if (d.title) setSiteTitle(d.title);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    links.forEach((node) => {
      if (node.subItems) {
        const isActive = node.subItems.some(
          (sub) => pathname === sub.href || pathname.startsWith(sub.href + "/")
        );
        if (isActive) {
          setExpandedCats((prev) => ({ ...prev, [node.label]: true }));
        }
      }
    });
  }, [pathname, links]);

  const toggleCategory = (label: string) => {
    setExpandedCats((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const logoSrc = logoUrl?.trim() || "/logo.png";
  const isExternalLogo = logoSrc.startsWith("http");

  if (status === "loading") {
    return (
      <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white md:w-64">
        <div className="flex h-14 items-center gap-2 border-b border-gray-100 px-4">
          <div className="h-8 w-8 animate-pulse rounded-xl bg-gray-200" />
          <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="flex-1 space-y-1 p-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white shadow-sm md:w-64">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-gray-100 px-4">
        <div className="relative h-10 w-10 shrink-0">
          {isExternalLogo ? (
            <img src={logoSrc} alt={siteTitle} className="h-10 w-10 object-contain" />
          ) : (
            <Image src={logoSrc} alt={siteTitle} width={40} height={40} className="object-contain" />
          )}
        </div>
        <span className="truncate text-sm font-bold text-gray-900">{siteTitle}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {links.map((node) => {
          const Icon = node.icon;

          if (node.subItems) {
            const isExpanded = expandedCats[node.label];
            const hasActiveChild = node.subItems.some(
              (sub) => pathname === sub.href || pathname.startsWith(sub.href + "/")
            );

            return (
              <div key={node.label} className="mb-1">
                <button
                  onClick={() => toggleCategory(node.label)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                    hasActiveChild
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${hasActiveChild ? "text-indigo-600" : ""}`} />
                    <span>{node.label}</span>
                  </div>
                  {isExpanded
                    ? <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                    : <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                  }
                </button>

                {isExpanded && (
                  <div className="mt-0.5 ml-3 border-l-2 border-gray-100 pl-2.5 space-y-0.5">
                    {node.subItems.map((sub) => {
                      const active = pathname === sub.href || pathname.startsWith(sub.href + "/");
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={`flex items-center rounded-lg px-2.5 py-1.5 text-sm transition ${
                            active
                              ? "bg-indigo-600 text-white font-semibold"
                              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                          }`}
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active =
            node.href === "/"
              ? pathname === "/"
              : pathname === node.href || (node.href && pathname.startsWith(node.href + "/"));

          return (
            <Link
              key={node.href || node.label}
              href={node.href!}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {node.label}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-gray-100 p-3">
        {session?.user?.name && (
          <div className="mb-2 flex items-center gap-2.5 rounded-xl bg-gray-50 px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
              {(session.user.name || session.user.email || "?")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-gray-800">{session.user.name}</p>
              <p className="truncate text-[10px] text-gray-500">{role}</p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={async () => {
            try {
              await fetch("/api/auth/record-logout", { method: "POST" });
            } catch {}
            signOut({ callbackUrl: "/" });
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Log out
        </button>
      </div>
    </aside>
  );
}
