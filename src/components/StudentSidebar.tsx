"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Flame,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  UserCircle,
  Receipt,
  Gift,
  ClipboardList,
  Download,
} from "lucide-react";
import { calculateCompletion, type ProfileForCompletion } from "@/lib/profileCompletion";

type Profile = ProfileForCompletion & {
  currentStreak?: number;
  longestStreak?: number;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/student-form", label: "Student Form", icon: ClipboardList },
  { href: "/dashboard/downloads", label: "My Downloads", icon: Download },
  { href: "/dashboard/subscription", label: "Subscription", icon: BookOpen },
  { href: "/dashboard/transactions", label: "Transactions", icon: Receipt },
  { href: "/dashboard/rewards", label: "My Rewards", icon: Gift },
  { href: "/dashboard/streaks", label: "Calendar", icon: Flame },
  { href: "/dashboard/profile", label: "Profile", icon: UserCircle },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function StudentSidebar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteTitle, setSiteTitle] = useState("Virtual Library");

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
    async function fetchProfile() {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const completion = calculateCompletion(profile ?? null);
  const displayName = profile?.fullName?.trim() || "Student";
  const displayGoal = profile?.studyGoal?.trim() || "Not set";
  const avatarUrl = profile?.profilePicUrl?.trim() || null;

  const sidebarContent = (
    <>
      {/* Profile section */}
      <div className="border-b border-white/10 px-4 pb-4 pt-4">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="absolute -inset-0.5 rounded-full bg-[var(--accent)]/40 blur-sm" />
            <div className="relative flex h-20 w-20 overflow-hidden rounded-full border-2 border-[var(--accent)]/60 bg-black/40">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-[var(--cream-muted)]">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <p className="mt-3 text-xs font-medium text-[var(--cream-muted)]">
            Profile Completion
          </p>
          <p className="text-lg font-bold text-[var(--cream)]">{completion}% Complete</p>
          <div className="mt-1.5 h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${completion}%`,
                backgroundColor: "var(--accent)",
              }}
            />
          </div>
          <p className="mt-3 font-semibold text-[var(--cream)]">{displayName}</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--accent)]">Student</p>
          <p className="text-xs text-[var(--cream-muted)]">{displayGoal}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 p-3">
        {navItems.map((item) => {
          const href = "hash" in item && item.hash ? `${item.href}${item.hash}` : item.href;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={href}
              onClick={() => setDrawerOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
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
          Logout
        </button>
      </div>
    </>
  );

  if (loading) {
    return (
      <aside className="flex w-56 shrink-0 flex-col border-r border-white/10 bg-black/20 md:w-64">
        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4 md:hidden">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-white/10" />
        </div>
        <div className="hidden flex-1 flex-col md:flex">
          <div className="border-b border-white/10 p-4">
            <div className="mx-auto h-20 w-20 animate-pulse rounded-full bg-white/10" />
            <div className="mt-3 h-4 w-24 mx-auto animate-pulse rounded bg-white/10" />
            <div className="mt-2 h-2 w-full max-w-[140px] mx-auto animate-pulse rounded-full bg-white/10" />
          </div>
          <div className="flex-1 space-y-2 p-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* Mobile: hamburger button */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-[var(--cream)] md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile: overlay when drawer open */}
      {drawerOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Sidebar: drawer on mobile, fixed on desktop */}
      <aside
        className={`
          fixed left-0 top-0 z-50 flex h-full w-64 shrink-0 flex-col border-r border-white/10 bg-[var(--background)] shadow-xl
          transition-transform duration-300 ease-out
          md:static md:z-auto md:translate-x-0 md:shadow-none md:w-64
          ${drawerOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 md:justify-center">
          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-xl">
            {(logoUrl?.trim() && logoUrl.startsWith("http")) ? (
              <img src={logoUrl} alt={siteTitle} width={32} height={32} className="h-8 w-8 object-cover" />
            ) : (
              <Image src={logoUrl?.trim() || "/logo.svg"} alt={siteTitle} width={32} height={32} className="object-cover" />
            )}
          </div>
          <span className="font-semibold text-[var(--cream)]">{siteTitle}</span>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--cream-muted)] hover:bg-white/5 hover:text-[var(--cream)] md:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto">
          {sidebarContent}
        </div>
      </aside>
    </>
  );
}
