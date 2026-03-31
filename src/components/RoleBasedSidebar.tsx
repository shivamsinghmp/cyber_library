"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
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
} from "lucide-react";
import { signOut } from "next-auth/react";

const roleNav: Record<
  string,
  { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[]
> = {
  ADMIN: [
    { href: "/", label: "Home", icon: Home },
    { href: "/admin", label: "Admin Dashboard", icon: LayoutDashboard },
    { href: "/admin/traffic", label: "Traffic", icon: Activity },
    { href: "/admin/settings", label: "Settings", icon: Settings },
    { href: "/admin/virtual-library", label: "The Cyber Library", icon: ImageIcon },
    { href: "/admin/students", label: "Student Management", icon: Users },
    { href: "/admin/staff", label: "Staff Management", icon: Briefcase },
    { href: "/admin/profile-fields", label: "Profile Fields", icon: UserCircle },
    { href: "/admin/leads", label: "Leads", icon: ClipboardList },
    { href: "/admin/slots", label: "Study Room Management", icon: Calendar },
    { href: "/admin/meet-polls", label: "Meet Polls", icon: Video },
    { href: "/admin/coupons", label: "Coupons", icon: Tag },
    { href: "/admin/transactions", label: "Transactions", icon: Receipt },
    { href: "/admin/bin", label: "Bin", icon: Trash2 },
    { href: "/admin/rewards", label: "Reward Program", icon: Gift },
    { href: "/admin/forms", label: "Student Form", icon: ClipboardList },
    { href: "/admin/products", label: "Digital Store", icon: ShoppingBag },
    { href: "/admin/blog", label: "Blog (SEO)", icon: FileText },
    { href: "/admin/authors", label: "Authors", icon: PenLine },
    { href: "/admin/razorpay", label: "Razorpay API", icon: CreditCard },
    { href: "/admin/export", label: "Data Export", icon: Download },
    { href: "/admin/referrals", label: "Referrals", icon: UserPlus },
    { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageCircle },
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

export function RoleBasedSidebar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const role = (session?.user as { role?: string })?.role ?? "STUDENT";
  const links = roleNav[role] ?? roleNav.STUDENT;
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteTitle, setSiteTitle] = useState("The Cyber Library");
  useEffect(() => {
    fetch("/api/site-branding")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: { logoUrl?: string | null; title?: string | null }) => {
        if (d.logoUrl) setLogoUrl(d.logoUrl);
        if (d.title) setSiteTitle(d.title);
      })
      .catch(() => {});
  }, []);
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
      <nav className="flex-1 space-y-0.5 p-3">
        {links.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-[var(--accent)]/20 text-[var(--cream)]"
                  : "text-[var(--cream-muted)] hover:bg-white/5 hover:text-[var(--cream)]"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
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
