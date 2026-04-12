"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  Briefcase,
  GraduationCap,
  Link2,
  Home,
  LogOut,
  Calendar,
  UserCircle,
  Users,
  Tag,
  FileText,
  CreditCard,
  Receipt,
  Trash2,
  Gift,
  Download,
  UserPlus,
  Settings,
  MessageCircle,
  ClipboardList,
  Activity,
  ShoppingBag,
  PenLine,
  Plus,
  ImageIcon,
  Video,
  MessageSquare,
  Trophy,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Database,
  BarChart,
  MonitorPlay
} from "lucide-react";
import { signOut } from "next-auth/react";

type NavItem = {
  href: string;
  label: string;
};

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
        { href: "/admin/products", label: "Digital Store" },
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
    { href: "/dashboard", label: "My Dashboard", icon: GraduationCap },
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
    // If they are an employee, they get the ADMIN layout but heavily filtered
    links = roleNav["ADMIN"].filter(node => {
      if (!node.moduleId) return true;
      return hasModuleAccess(role, allowedModules, node.moduleId as AdminModuleIds);
    });
    
    // Add generic fast links for employees
    links.unshift({ href: "/staff", label: "Staff Portal", icon: LayoutDashboard });
  }

  if (role === "ADMIN") {
    links = roleNav["ADMIN"];
  }

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteTitle, setSiteTitle] = useState("The Cyber Library");
  
  // Track expanded categories in a set-like object or array
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  // Auto-expand category if child is active
  useEffect(() => {
    fetch("/api/site-branding")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: { logoUrl?: string | null; title?: string | null }) => {
        if (d.logoUrl) setLogoUrl(d.logoUrl);
        if (d.title) setSiteTitle(d.title);
      })
      .catch(() => {});
  }, []);
  
  // Auto-expand category if child matches active route
  useEffect(() => {
    links.forEach((node) => {
      if (node.subItems) {
        const isActive = node.subItems.some(sub => pathname === sub.href || pathname.startsWith(sub.href + "/"));
        if (isActive) {
          setExpandedCats(prev => ({ ...prev, [node.label]: true }));
        }
      }
    });
  }, [pathname, links]);

  const toggleCategory = (label: string) => {
    setExpandedCats(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const logoSrc = logoUrl?.trim() || "/logo.svg";
  const isExternalLogo = logoSrc.startsWith("http");

  if (status === "loading") {
    return (
      <aside className="flex w-56 shrink-0 flex-col border-r border-white/10 bg-black/20">
        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
          <div className="h-8 w-8 animate-pulse rounded-xl bg-white/10" />
          <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
        </div>
        <div className="flex-1 space-y-1 p-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-white/10 bg-black/20 md:w-64">
      <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
        <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl">
          {isExternalLogo ? (
            <img src={logoSrc} alt={siteTitle} width={36} height={36} className="h-9 w-9 object-cover" />
          ) : (
            <Image src={logoSrc} alt={siteTitle} width={36} height={36} className="object-cover" />
          )}
        </div>
        <span className="font-semibold text-[var(--cream)]">{siteTitle}</span>
      </div>
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {links.map((node) => {
          const Icon = node.icon;
          
          if (node.subItems) {
            const isExpanded = expandedCats[node.label];
            const hasActiveChild = node.subItems.some((sub) => pathname === sub.href || pathname.startsWith(sub.href + "/"));
            
            return (
              <div key={node.label} className="mb-2">
                <button
                  onClick={() => toggleCategory(node.label)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    hasActiveChild 
                      ? "text-[var(--cream)]"
                      : "text-[var(--cream-muted)] hover:bg-white/5 hover:text-[var(--cream)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 shrink-0 ${hasActiveChild ? "text-[var(--accent)]" : ""}`} />
                    {node.label}
                  </div>
                  {isExpanded ? <ChevronDown className="h-4 w-4 opacity-50" /> : <ChevronRight className="h-4 w-4 opacity-50" />}
                </button>
                
                {isExpanded && (
                  <div className="mt-1 ml-4 border-l border-white/10 pl-2 space-y-0.5">
                    {node.subItems.map((sub) => {
                      const active = pathname === sub.href || pathname.startsWith(sub.href + "/");
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={`block rounded-lg px-3 py-2 text-sm transition ${
                            active
                              ? "bg-[var(--accent)]/10 text-[var(--accent)] font-semibold"
                              : "text-[var(--cream-muted)] hover:text-[var(--cream)] hover:bg-white/5"
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

          // Flat link (for non-admins typically)
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
                  ? "bg-[var(--accent)]/20 text-[var(--cream)]"
                  : "text-[var(--cream-muted)] hover:bg-white/5 hover:text-[var(--cream)]"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {node.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={async () => {
              try {
                await fetch("/api/auth/record-logout", { method: "POST" });
              } catch {
                // ignore
              }
              signOut({ callbackUrl: "/" });
            }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--cream-muted)] transition hover:bg-white/5 hover:text-[var(--cream)]"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Log out
        </button>
      </div>
    </aside>
  );
}
