"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import {
  BarChart, MonitorPlay, Users, Receipt, MessageCircle, Database,
  ChevronDown, LogOut, Menu, X, Home, LayoutDashboard,
  UserCircle, Link2, FileText, Plus,
} from "lucide-react";
import { hasModuleAccess, AdminModuleIds } from "@/lib/permissions-client";

type NavItem = { href: string; label: string };
type NavNode = {
  href?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: NavItem[];
  moduleId?: string;
};

const adminNav: NavNode[] = [
  {
    moduleId: "SYSTEM_OVERVIEW",
    label: "Overview",
    icon: BarChart,
    subItems: [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/traffic", label: "Traffic" },
      { href: "/admin/audit-logs", label: "Audit Logs" },
      { href: "/admin/ai-settings", label: "AI API Keys" },
      { href: "/admin/ai-usage", label: "AI Usage" },
    ],
  },
  {
    moduleId: "VIRTUAL_LIBRARY",
    label: "Library",
    icon: MonitorPlay,
    subItems: [
      { href: "/admin/virtual-library", label: "Let's Study" },
      { href: "/admin/slots", label: "Study Rooms" },
      { href: "/admin/meet-polls", label: "Meet Polls" },
    ],
  },
  {
    moduleId: "STUDENT_MGMT",
    label: "People",
    icon: Users,
    subItems: [
      { href: "/admin/students", label: "Students" },
      { href: "/admin/student-view", label: "Student View" },
      { href: "/admin/student-modules", label: "Modules" },
      { href: "/admin/staff", label: "Staff" },
      { href: "/admin/profile-fields", label: "Profile Fields" },
      { href: "/admin/authors", label: "Authors" },
      { href: "/admin/referrals", label: "Referrals" },
    ],
  },
  {
    moduleId: "FINANCE",
    label: "Finance",
    icon: Receipt,
    subItems: [
      { href: "/admin/transactions", label: "Transactions" },
      { href: "/admin/subscriptions", label: "Subscriptions" },
      { href: "/admin/trial", label: "Trial" },
      { href: "/admin/products", label: "Store" },
      { href: "/admin/pricing", label: "Pricing" },
      { href: "/admin/coupons", label: "Coupons" },
      { href: "/admin/rewards", label: "Rewards" },
      { href: "/admin/coin-engine", label: "Coins" },
      { href: "/admin/plan-features", label: "Plan Features" },
    ],
  },
  {
    moduleId: "ENGAGEMENT",
    label: "Engagement",
    icon: MessageCircle,
    subItems: [
      { href: "/admin/whatsapp", label: "WhatsApp" },
      { href: "/admin/leads", label: "Leads" },
      { href: "/admin/forms", label: "Forms" },
      { href: "/admin/feedback", label: "Feedback" },
      { href: "/admin/support", label: "Support" },
      { href: "/admin/faqs", label: "FAQs" },
      { href: "/admin/email", label: "Email" },
    ],
  },
  {
    moduleId: "CONTENT",
    label: "Content",
    icon: Database,
    subItems: [
      { href: "/admin/blog", label: "Blog" },
      { href: "/admin/footer", label: "Footer" },
      { href: "/admin/export", label: "Export" },
      { href: "/admin/bin", label: "Bin" },
    ],
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: BarChart,
  },
];

const staffNav: NavNode[] = [
  { href: "/staff", label: "Dashboard", icon: LayoutDashboard },
  { href: "/staff/whatsapp", label: "WhatsApp", icon: MessageCircle },
  { href: "/staff/profile", label: "Profile", icon: UserCircle },
];

export function AdminTopNav({ allowedModules = [] }: { allowedModules?: string[] }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = (session?.user as { role?: string })?.role ?? "STUDENT";

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteTitle, setSiteTitle] = useState("Let's Study");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/site-branding")
      .then(r => r.ok ? r.json() : {})
      .then((d: { logoUrl?: string | null; title?: string | null }) => {
        if (d.logoUrl) setLogoUrl(d.logoUrl);
        if (d.title) setSiteTitle(d.title);
      }).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => { setMobileOpen(false); setOpenDropdown(null); }, [pathname]);

  let links: NavNode[] = adminNav;
  if (role === "EMPLOYEE") {
    links = adminNav.filter(n => !n.moduleId || hasModuleAccess(role, allowedModules, n.moduleId as AdminModuleIds));
    links = [{ href: "/staff", label: "Staff Portal", icon: LayoutDashboard }, ...links];
  }

  const logoSrc = logoUrl?.trim() || "/logo.png";
  const isExternalLogo = logoSrc.startsWith("http");
  const userInitial = (session?.user?.name || session?.user?.email || "?")[0].toUpperCase();

  return (
    <header ref={navRef} className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white shadow-sm">
      <div className="flex h-12 items-center gap-2 px-3 md:px-4">

        {/* Logo */}
        <Link href="/admin" className="flex shrink-0 items-center gap-2 mr-2">
          {isExternalLogo
            ? <img src={logoSrc} alt={siteTitle} className="h-7 w-7 rounded-lg object-contain" />
            : <Image src={logoSrc} alt={siteTitle} width={28} height={28} className="rounded-lg object-contain" />
          }
          <span className="hidden sm:block text-sm font-bold text-gray-900 truncate max-w-[120px]">{siteTitle}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1">
          <Link href="/"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition">
            <Home className="h-3.5 w-3.5" /> Home
          </Link>

          {links.map(node => {
            if (!node.subItems) {
              const active = node.href ? (pathname === node.href || pathname.startsWith(node.href + "/")) : false;
              return (
                <Link key={node.href || node.label} href={node.href!}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                    active ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                  }`}>
                  {node.label}
                </Link>
              );
            }

            const hasActive = node.subItems.some(s => pathname === s.href || pathname.startsWith(s.href + "/"));
            const isOpen = openDropdown === node.label;

            return (
              <div key={node.label} className="relative">
                <button
                  onClick={() => setOpenDropdown(isOpen ? null : node.label)}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                    hasActive ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                  }`}>
                  {node.label}
                  <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="absolute top-full left-0 mt-1 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-lg z-50">
                    {node.subItems.map(sub => {
                      const active = pathname === sub.href || pathname.startsWith(sub.href + "/");
                      return (
                        <Link key={sub.href} href={sub.href}
                          className={`block px-3 py-1.5 text-xs font-medium transition ${
                            active ? "bg-indigo-600 text-white" : "text-gray-700 hover:bg-gray-50"
                          }`}>
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Right: user + logout */}
        <div className="ml-auto flex items-center gap-2">
          {session?.user?.name && (
            <div className="hidden sm:flex items-center gap-1.5">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                {userInitial}
              </div>
              <span className="text-xs font-medium text-gray-700 max-w-[100px] truncate">{session.user.name}</span>
            </div>
          )}
          <button
            onClick={async () => {
              try { await fetch("/api/auth/record-logout", { method: "POST" }); } catch {}
              signOut({ callbackUrl: "/" });
            }}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition">
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:block">Logout</span>
          </button>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex items-center justify-center rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-3 py-2 max-h-[70vh] overflow-y-auto">
          <Link href="/" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
            <Home className="h-4 w-4" /> Home
          </Link>
          {links.map(node => {
            if (!node.subItems) {
              return (
                <Link key={node.href} href={node.href!}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  <node.icon className="h-4 w-4" /> {node.label}
                </Link>
              );
            }
            const isExpanded = mobileExpanded === node.label;
            return (
              <div key={node.label}>
                <button onClick={() => setMobileExpanded(isExpanded ? null : node.label)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <div className="flex items-center gap-2"><node.icon className="h-4 w-4" />{node.label}</div>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>
                {isExpanded && (
                  <div className="ml-6 border-l border-gray-100 pl-3 space-y-0.5">
                    {node.subItems.map(sub => (
                      <Link key={sub.href} href={sub.href}
                        className={`block rounded-lg px-2.5 py-1.5 text-sm transition ${
                          pathname === sub.href ? "bg-indigo-600 text-white font-semibold" : "text-gray-600 hover:bg-gray-50"
                        }`}>
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </header>
  );
}
