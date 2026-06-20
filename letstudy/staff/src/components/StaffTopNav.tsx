"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, MessageCircle, UserCircle, LogOut, Menu, X,
  Users, Wallet, FileText, BookOpenCheck,
} from "lucide-react";
import type { AdminModuleIds } from "@/lib/permissions";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleId?: AdminModuleIds;
};

// `moduleId` omitted = always visible (Dashboard, Profile). Order here is
// the order they render in — Dashboard first, Profile last, regardless of
// which modules a given staff member has.
const NAV_ITEMS: NavItem[] = [
  { href: "/staff",          label: "Dashboard", icon: LayoutDashboard },
  { href: "/staff/whatsapp", label: "WhatsApp",  icon: MessageCircle, moduleId: "ENGAGEMENT" },
  { href: "/staff/students", label: "Students",  icon: Users,         moduleId: "STUDENT_MGMT" },
  { href: "/staff/finance",  label: "Finance",    icon: Wallet,        moduleId: "FINANCE" },
  { href: "/staff/blog",     label: "Blog",       icon: FileText,      moduleId: "CONTENT" },
  { href: "/staff/library",  label: "Library",    icon: BookOpenCheck, moduleId: "VIRTUAL_LIBRARY" },
  { href: "/staff/profile",  label: "Profile",    icon: UserCircle },
];

export function StaffTopNav({ allowedModules }: { allowedModules: string[] }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteTitle, setSiteTitle] = useState("Let's Study");

  useEffect(() => {
    fetch("/api/site-branding")
      .then(r => r.ok ? r.json() : {})
      .then((d: { logoUrl?: string | null; title?: string | null }) => {
        if (d.logoUrl) setLogoUrl(d.logoUrl);
        if (d.title) setSiteTitle(d.title);
      }).catch(() => {});
  }, []);

  const links = NAV_ITEMS.filter(item => !item.moduleId || allowedModules.includes(item.moduleId));

  const logoSrc = logoUrl?.trim() || "/logo.png";
  const isExternalLogo = logoSrc.startsWith("http");
  const userInitial = (session?.user?.name || session?.user?.email || "?")[0].toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white shadow-sm">
      <div className="flex h-12 items-center gap-2 px-3 md:px-4">
        <Link href="/staff" className="flex shrink-0 items-center gap-2 mr-2">
          {isExternalLogo
            ? <img src={logoSrc} alt={siteTitle} className="h-7 w-7 rounded-lg object-contain" />
            : <Image src={logoSrc} alt={siteTitle} width={28} height={28} className="rounded-lg object-contain" />
          }
          <span className="hidden sm:block text-sm font-bold text-gray-900 truncate max-w-[120px]">{siteTitle}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5 flex-1">
          {links.map(link => {
            const active = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link key={link.href} href={link.href}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  active ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                }`}>
                <link.icon className="h-3.5 w-3.5" /> {link.label}
              </Link>
            );
          })}
        </nav>

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
              signOut({ callbackUrl: "/login" });
            }}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition">
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:block">Logout</span>
          </button>

          <button onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex items-center justify-center rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-3 py-2">
          {links.map(link => (
            <Link key={link.href} href={link.href}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
              <link.icon className="h-4 w-4" /> {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
