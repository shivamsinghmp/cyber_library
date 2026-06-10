"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, LogOut, Menu, X, Coins, Users, Radio, Send, Video, ChevronDown } from "lucide-react";
import Logo from "@/components/Logo";
import { calculateCompletion, type ProfileForCompletion } from "@/lib/profileCompletion";
import { STUDENT_MODULES, filterEnabledModules } from "@/lib/student-modules";

type Profile = ProfileForCompletion & {
  currentStreak?: number;
  longestStreak?: number;
};

export function StudentSidebar({ disabledModules = [] }: { disabledModules?: string[] }) {
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [totalCoins, setTotalCoins] = useState<number | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteTitle, setSiteTitle] = useState("Let's Study");
  const [communityLinks, setCommunityLinks] = useState<{
    whatsappGroupLink: string | null;
    whatsappChannelLink: string | null;
    telegramChannelLink: string | null;
    googleMeetAppLink: string | null;
  }>({ whatsappGroupLink: null, whatsappChannelLink: null, telegramChannelLink: null, googleMeetAppLink: null });

  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    const enabled = filterEnabledModules(STUDENT_MODULES, disabledModules);
    const activeLabel = (["Main", "Study", "Account"] as const)
      .map(lbl => ({ lbl, items: enabled.filter(m => m.section === lbl) }))
      .find(s => s.items.some(i => pathname === i.href || pathname.startsWith(i.href + "/")))?.lbl;
    return new Set<string>(activeLabel ? ["Main", activeLabel] : ["Main"]);
  });

  useEffect(() => {
    fetch("/api/dashboard/meet-addon", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((d: { gamification?: { totalCoins: number } } | null) => {
        if (d?.gamification?.totalCoins != null) setTotalCoins(d.gamification.totalCoins);
      }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/site-branding")
      .then(r => r.ok ? r.json() : {})
      .then((d: { logoUrl?: string | null; title?: string | null }) => {
        if (d.logoUrl) setLogoUrl(d.logoUrl);
        if (d.title) setSiteTitle(d.title);
      }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/support-info")
      .then(r => r.ok ? r.json() : {})
      .then((d: { whatsappGroupLink?: string | null; whatsappChannelLink?: string | null; telegramChannelLink?: string | null; googleMeetAppLink?: string | null }) => {
        setCommunityLinks({
          whatsappGroupLink: d.whatsappGroupLink ?? null,
          whatsappChannelLink: d.whatsappChannelLink ?? null,
          telegramChannelLink: d.telegramChannelLink ?? null,
          googleMeetAppLink: d.googleMeetAppLink ?? null,
        });
      }).catch(() => {});
  }, []);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/user/profile", { cache: "no-store" });
        if (res.ok) setProfile(await res.json());
      } catch { setProfile(null); }
      finally { setLoading(false); }
    }
    fetchProfile();
    const onUpdate = () => fetchProfile();
    window.addEventListener("profileUpdated", onUpdate);
    return () => window.removeEventListener("profileUpdated", onUpdate);
  }, []);

  const completion = calculateCompletion(profile ?? null);
  const displayName = profile?.fullName?.trim() || "Student";
  const displayGoal = profile?.studyGoal?.trim() || "No goal set";
  const avatarUrl = profile?.profilePicUrl?.trim() || null;
  const initials = displayName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "S";

  const enabledModules = filterEnabledModules(STUDENT_MODULES, disabledModules);
  const sections = ["Main", "Study", "Account"] as const;
  const navSections = sections.map(label => ({
    label,
    items: enabledModules.filter(m => m.section === label),
  })).filter(s => s.items.length > 0);

  useEffect(() => {
    const enabled = filterEnabledModules(STUDENT_MODULES, disabledModules);
    const active = (["Main", "Study", "Account"] as const)
      .map(lbl => ({ lbl, items: enabled.filter(m => m.section === lbl) }))
      .find(s => s.items.some(i => pathname === i.href || pathname.startsWith(i.href + "/")))?.lbl;
    if (active) setOpenSections(prev => new Set([...prev, active]));
  }, [pathname, disabledModules]);

  function toggleSection(label: string) {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  const SidebarBody = () => (
    <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
      {/* Profile section */}
      <div className="px-4 py-5 border-b border-[var(--cream-muted)]">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="h-12 w-12 rounded-2xl overflow-hidden border-2 border-[var(--cream-muted)] bg-[var(--cream)] flex items-center justify-center shadow-sm">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg font-black text-[var(--accent)]">{initials}</span>
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-white shadow-sm" />
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[var(--foreground)] truncate">{displayName}</p>
            <p className="text-[10px] text-[var(--muted-text)] truncate">{displayGoal}</p>
            {totalCoins !== null && (
              <Link href="/dashboard/wallet" onClick={() => setDrawerOpen(false)} className="flex items-center gap-1 mt-0.5 hover:opacity-80 transition-opacity">
                <Coins className="h-3 w-3 text-amber-500" />
                <span className="text-[10px] font-bold text-amber-600">{totalCoins.toLocaleString("en-IN")} coins</span>
              </Link>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-[var(--muted-text)]">Profile Complete</span>
            <span className="text-[10px] font-black text-[var(--accent)]">{completion}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[var(--cream-muted)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[#2DD4BF] transition-all duration-700"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 overflow-y-auto scrollbar-hide py-2 px-2">
        {/* Dashboard — always visible */}
        {(() => {
          const isActive = pathname === "/dashboard";
          return (
            <Link href="/dashboard" onClick={() => setDrawerOpen(false)}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 mb-1 ${
                isActive
                  ? "bg-[var(--accent)]/10 text-[var(--accent)] font-semibold border border-[var(--accent)]/20"
                  : "text-[var(--body-text)] hover:bg-[var(--cream)] hover:text-[var(--accent)]"
              }`}>
              <LayoutDashboard className={`h-4 w-4 shrink-0 ${isActive ? "text-[var(--accent)]" : "text-[var(--muted-text)]"}`} />
              <span>Dashboard</span>
              {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
            </Link>
          );
        })()}

        {navSections.map((section) => {
          const isOpen = openSections.has(section.label);
          const hasActive = section.items.some(item => pathname === item.href || pathname.startsWith(item.href + "/"));
          return (
            <div key={section.label} className="mb-1">
              <button
                type="button"
                onClick={() => toggleSection(section.label)}
                className="w-full flex items-center justify-between px-3 pt-3 pb-1.5 rounded-lg hover:bg-[var(--cream)] transition-colors group"
              >
                <span className={`text-[9px] font-black uppercase tracking-[0.2em] transition-colors ${
                  hasActive ? "text-[var(--accent)]" : "text-[var(--accent)]/60 group-hover:text-[var(--accent)]/80"
                }`}>
                  {section.label}
                </span>
                <ChevronDown className={`h-3 w-3 text-[var(--accent)]/40 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : "rotate-0"
                }`} />
              </button>

              <div className={`overflow-hidden transition-all duration-200 ease-in-out ${
                isOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
              }`}>
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setDrawerOpen(false)}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 mb-0.5 ${
                        isActive
                          ? "bg-[var(--accent)]/10 text-[var(--accent)] font-semibold border border-[var(--accent)]/20"
                          : "text-[var(--body-text)] hover:bg-[var(--cream)] hover:text-[var(--accent)]"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-[var(--accent)]" : "text-[var(--muted-text)]"}`} />
                      <span>{item.label}</span>
                      {isActive && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Community Links */}
      {(communityLinks.whatsappGroupLink || communityLinks.whatsappChannelLink || communityLinks.telegramChannelLink || communityLinks.googleMeetAppLink) && (
        <div className="border-t border-[var(--cream-muted)] px-3 py-3 space-y-1">
          <p className="px-1 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--accent)]/80">Community</p>
          {communityLinks.whatsappGroupLink && (
            <a
              href={communityLinks.whatsappGroupLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--body-text)] hover:bg-green-50 hover:text-green-700 transition-all duration-150"
            >
              <Users className="h-4 w-4 shrink-0 text-green-600" />
              <span>Join WhatsApp Group</span>
            </a>
          )}
          {communityLinks.whatsappChannelLink && (
            <a
              href={communityLinks.whatsappChannelLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--body-text)] hover:bg-green-50 hover:text-green-700 transition-all duration-150"
            >
              <Radio className="h-4 w-4 shrink-0 text-green-500" />
              <span>Join WhatsApp Channel</span>
            </a>
          )}
          {communityLinks.telegramChannelLink && (
            <a
              href={communityLinks.telegramChannelLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--body-text)] hover:bg-blue-50 hover:text-blue-700 transition-all duration-150"
            >
              <Send className="h-4 w-4 shrink-0 text-blue-500" />
              <span>Join Telegram Channel</span>
            </a>
          )}
          {communityLinks.googleMeetAppLink && (
            <a
              href={communityLinks.googleMeetAppLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--body-text)] hover:bg-red-50 hover:text-red-700 transition-all duration-150"
            >
              <Video className="h-4 w-4 shrink-0 text-red-500" />
              <span>Install Google Meet App</span>
            </a>
          )}
        </div>
      )}

      {/* Logout */}
      <div className="border-t border-[var(--cream-muted)] p-3">
        <button
          type="button"
          onClick={async () => {
            try { await fetch("/api/auth/record-logout", { method: "POST" }); } catch {}
            // Clear admin-view cookie so it doesn't linger after logout
            document.cookie = "__asv=; path=/; max-age=0";
            signOut({ callbackUrl: "/login" });
          }}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--muted-text)] transition-all hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-white border-r border-[var(--cream-muted)]">
        <div className="p-4 border-b border-[var(--cream-muted)]">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-[var(--cream)] animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-24 rounded-full bg-[var(--cream)] animate-pulse" />
              <div className="h-2.5 w-16 rounded-full bg-[var(--cream)] animate-pulse" />
            </div>
          </div>
        </div>
        <div className="flex-1 p-3 space-y-1.5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-[var(--cream)] animate-pulse" />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--cream-muted)] bg-white text-[var(--foreground)] shadow-sm md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile coin balance pill */}
      {totalCoins !== null && (
        <Link
          href="/dashboard/wallet"
          onClick={() => setDrawerOpen(false)}
          className="fixed right-4 top-4 z-30 flex h-10 items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 shadow-sm md:hidden hover:bg-amber-100 transition-colors"
        >
          <Coins className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-black text-amber-700">{totalCoins.toLocaleString("en-IN")}</span>
        </Link>
      )}

      {/* Mobile overlay */}
      {drawerOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-[var(--foreground)]/20 backdrop-blur-sm md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-50 flex h-full w-64 shrink-0 flex-col overflow-hidden
          bg-white border-r border-[var(--cream-muted)] shadow-[4px_0_24px_rgba(13,148,136,0.06)]
          transition-transform duration-300 ease-out
          md:static md:z-auto md:translate-x-0 md:shadow-none
          ${drawerOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between px-4 border-b border-[var(--cream-muted)]">
          <div className="flex items-center gap-2.5">
            {logoUrl?.trim() ? (
              <>
                {logoUrl.startsWith("http") ? (
                  <img src={logoUrl} alt={siteTitle} className="h-10 w-10 object-contain rounded-xl" />
                ) : (
                  <Image src={logoUrl.trim()} alt={siteTitle} width={40} height={40} className="object-contain" />
                )}
                <span className="text-sm font-bold text-[var(--foreground)] truncate">{siteTitle}</span>
              </>
            ) : (
              <Logo />
            )}
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted-text)] hover:bg-[var(--cream)] hover:text-[var(--foreground)] md:hidden transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <SidebarBody />
      </aside>
    </>
  );
}
