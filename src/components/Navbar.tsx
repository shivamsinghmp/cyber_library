"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { LogOut, User, ShoppingCart, X, Menu, ChevronRight, Store, Brain, FileText, Home, Info, Sparkles, Tag, Trophy } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "@/components/Logo";

const navLinks = [
  { href: "/",             label: "Home",        icon: Home },
  { href: "/why-join",     label: "Why Join",    icon: Sparkles },
  { href: "/leaderboard",  label: "Leaderboard", icon: Trophy },
  { href: "/pricing",      label: "Pricing",     icon: Tag },
  { href: "/store",        label: "Store",       icon: Store },
  { href: "/blog",         label: "Blog",        icon: FileText },
  { href: "/rules",        label: "Rules",       icon: Brain },
  { href: "/about",        label: "About",       icon: Info },
];

const DEFAULT_TITLE   = "Let's Study";
const DEFAULT_TAGLINE = "The Focus Hub";

type NavbarProps = {
  initialLogoUrl?: string | null;
  initialTitle?:  string | null;
  initialTagline?: string | null;
};

export function Navbar({ initialLogoUrl, initialTitle, initialTagline }: NavbarProps = {}) {
  const pathname      = usePathname();
  const [open, setOpen]               = useState(false);
  const [scrolled, setScrolled]       = useState(false);
  const [hasAddonToken, setHasAddonToken] = useState(false);
  const { data: session, status }     = useSession();
  const { count: cartCount }          = useCart();

  const [logoUrl]   = useState<string | null>(initialLogoUrl ?? null);
  const [siteTitle] = useState(initialTitle?.trim()   || DEFAULT_TITLE);
  const [tagline]   = useState(initialTagline?.trim() || DEFAULT_TAGLINE);

  const isMeetAddonRoute = pathname.startsWith("/meet-addon");
  const isLoggedIn       = !!session?.user || (isMeetAddonRoute && hasAddonToken);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasAddonToken(!!localStorage.getItem("vl_meet_addon_token"));
    }
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Close mobile menu on route change */
  useEffect(() => { setOpen(false); }, [pathname]);

  const isDashboardRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin")     ||
    pathname.startsWith("/staff")     ||
    pathname.startsWith("/affiliate") ||
    pathname.startsWith("/author")    ||
    pathname.startsWith("/meet-addon");

  if (isDashboardRoute) return null;

  let dashboardLink = "/dashboard";
  if (session?.user) {
    const role = (session.user as { role?: string }).role;
    if      (role === "ADMIN")      dashboardLink = "/admin";
    else if (role === "EMPLOYEE")   dashboardLink = "/staff";
    else if (role === "INFLUENCER") dashboardLink = "/affiliate";
    else if (role === "AUTHOR")     dashboardLink = "/author";
  }
  if (pathname.startsWith("/meet-addon")) dashboardLink = "/meet-addon/panel";

  const logoSrc      = logoUrl?.trim() || "/logo.png";
  const isExtLogo    = logoSrc.startsWith("http");

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* ── HEADER ── */}
      <header
        data-navbar
        className={`fixed inset-x-3 sm:inset-x-6 z-50 mx-auto max-w-6xl transition-all duration-500 ease-out ${
          scrolled
            ? "top-3 rounded-2xl border bg-white/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(15,23,42,0.10)] border-[var(--border)]"
            : "top-4 rounded-2xl border border-transparent bg-transparent"
        }`}
      >
        {/* Gradient top-line when scrolled */}
        {scrolled && (
          <div className="absolute top-0 left-6 right-6 h-[2px] rounded-full"
            style={{ background: "linear-gradient(to right, #6366F1, #8B5CF6, #06B6D4)" }} />
        )}

        <nav className="flex items-center justify-between px-4 py-3 sm:px-6">

          {/* ── BRAND ── */}
          <Link href="/" className="group shrink-0 transition-transform duration-300 hover:scale-105">
            {logoUrl ? (
              <div className="flex items-center gap-3"
                style={{ filter: "drop-shadow(0 4px 10px rgba(99,102,241,0.35))" }}>
                {isExtLogo ? (
                  <img src={logoSrc} alt={siteTitle} className="h-10 w-10 object-contain" />
                ) : (
                  <Image src={logoSrc} alt={siteTitle} width={40} height={40} className="object-contain" priority />
                )}
                <div className="hidden sm:flex flex-col leading-tight">
                  <span className="text-sm font-extrabold tracking-tight transition-colors group-hover:text-[var(--accent)]"
                    style={{ color: "var(--foreground)" }}>
                    {siteTitle}
                  </span>
                  <span className="text-[9px] font-extrabold uppercase tracking-[0.22em]"
                    style={{ color: "var(--accent)" }}>
                    {tagline}
                  </span>
                </div>
              </div>
            ) : (
              <Logo />
            )}
          </Link>

          {/* ── DESKTOP NAV LINKS ── */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.slice(0, 6).map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-3.5 py-2 rounded-xl text-[13px] font-bold transition-all duration-200 ${
                    active
                      ? "text-[var(--accent)] bg-[var(--accent-pale)]"
                      : "text-[var(--foreground)] hover:text-[var(--accent)] hover:bg-[var(--accent-pale)]"
                  }`}
                  style={{ opacity: active ? 1 : 0.75 }}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: "var(--accent-pale)" }}
                      transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* ── RIGHT ACTIONS ── */}
          <div className="flex items-center gap-2">

            {/* Cart */}
            <Link
              href="/cart"
              aria-label="Cart"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border transition-all hover:-translate-y-0.5 hover:border-[var(--accent-border)] hover:text-[var(--accent)]"
              style={{ borderColor: "var(--border)", color: "var(--muted-text)", background: scrolled ? "white" : "rgba(255,255,255,0.8)" }}
            >
              <ShoppingCart className="h-4 w-4" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full text-[9px] font-extrabold text-white px-1"
                  style={{ background: "var(--accent)", boxShadow: "0 2px 6px rgba(99,102,241,0.5)" }}>
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            {/* Auth — desktop */}
            <div className="hidden md:flex items-center gap-2">
              {status === "loading" ? (
                <div className="h-9 w-24 animate-pulse rounded-xl" style={{ background: "var(--accent-pale)" }} />
              ) : isLoggedIn ? (
                <>
                  <Link
                    href={dashboardLink}
                    className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border transition-all hover:-translate-y-0.5"
                    style={{
                      borderColor: "var(--accent-border)",
                      background: "var(--accent-pale)",
                      color: "var(--accent)",
                    }}
                  >
                    {session?.user?.image ? (
                      <Image src={session.user.image as string} alt="" width={36} height={36} className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      try { await fetch("/api/auth/record-logout", { method: "POST" }); } catch { }
                      localStorage.removeItem("vl_meet_addon_token");
                      document.cookie = "__asv=; path=/; max-age=0";
                      if (hasAddonToken) window.location.reload();
                      signOut({ callbackUrl: "/login" });
                    }}
                    className="flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all hover:-translate-y-0.5 hover:border-red-300 hover:text-red-500 hover:bg-red-50"
                    style={{ borderColor: "var(--border)", color: "var(--muted-text)", background: "white" }}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout
                  </button>
                </>
              ) : !isMeetAddonRoute ? (
                <>
                  <Link
                    href="/login"
                    className="rounded-xl px-4 py-2 text-xs font-bold transition-all hover:-translate-y-0.5"
                    style={{ color: "var(--accent)", border: "1.5px solid var(--accent-border)", background: "var(--accent-pale)" }}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="group relative overflow-hidden flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold text-white transition-all hover:scale-105"
                    style={{
                      background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                      boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
                    }}
                  >
                    <span className="absolute inset-0 translate-x-[-100%] skew-x-12 bg-white/10 transition-transform duration-500 group-hover:translate-x-[100%]" />
                    Get Started
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </>
              ) : null}
            </div>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="flex lg:hidden h-9 w-9 items-center justify-center rounded-xl border transition-all active:scale-95"
              style={{
                borderColor: "var(--border)",
                background: scrolled ? "white" : "rgba(255,255,255,0.8)",
                color: "var(--foreground)",
              }}
              aria-label="Toggle menu"
            >
              <AnimatePresence mode="wait" initial={false}>
                {open ? (
                  <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X className="h-4 w-4" />
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Menu className="h-4 w-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </nav>
      </header>

      {/* Spacer */}
      <div className="h-20 md:h-24" aria-hidden="true" />

      {/* ── MOBILE DRAWER ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-30 lg:hidden"
              style={{ background: "rgba(15,23,42,0.25)", backdropFilter: "blur(2px)" }}
              onClick={() => setOpen(false)}
            />

            {/* Drawer panel */}
            <motion.div
              key="drawer"
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ type: "spring", bounce: 0.18, duration: 0.4 }}
              className="fixed inset-x-3 top-[4.5rem] z-40 lg:hidden overflow-hidden rounded-2xl border"
              style={{
                borderColor: "var(--border)",
                background: "rgba(255,255,255,0.98)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 24px 60px rgba(15,23,42,0.15), 0 8px 20px rgba(99,102,241,0.08)",
              }}
            >
              {/* Gradient top strip */}
              <div className="h-[3px] w-full"
                style={{ background: "linear-gradient(to right, #6366F1, #8B5CF6, #06B6D4)" }} />

              <div className="p-4 space-y-1">
                {navLinks.map((item, i) => {
                  const active = isActive(item.href);
                  const Icon   = item.icon;
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                          active
                            ? "bg-[var(--accent-pale)] text-[var(--accent)]"
                            : "text-[var(--foreground)] hover:bg-[var(--page-bg)] hover:text-[var(--accent)]"
                        }`}
                      >
                        <span className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                          active ? "bg-[var(--accent)] text-white" : "bg-[var(--page-bg)] text-[var(--muted-text)]"
                        }`}
                          style={active ? { boxShadow: "0 3px 8px rgba(99,102,241,0.35)" } : {}}>
                          <Icon className="h-4 w-4" />
                        </span>
                        {item.label}
                        {active && <ChevronRight className="ml-auto h-4 w-4 opacity-50" />}
                      </Link>
                    </motion.div>
                  );
                })}

                {/* Divider */}
                <div className="my-2 h-px" style={{ background: "var(--border)" }} />

                {/* Auth section */}
                {isLoggedIn ? (
                  <div className="space-y-2 pt-1">
                    <Link
                      href={dashboardLink}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all"
                      style={{
                        background: "var(--accent-pale)",
                        color: "var(--accent)",
                        border: "1.5px solid var(--accent-border)",
                      }}
                    >
                      <User className="h-4 w-4" />
                      Go to Dashboard
                    </Link>
                    <button
                      onClick={() => {
                        setOpen(false);
                        localStorage.removeItem("vl_meet_addon_token");
                        document.cookie = "__asv=; path=/; max-age=0";
                        if (hasAddonToken) window.location.reload();
                        signOut({ callbackUrl: "/login" });
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                ) : !isMeetAddonRoute ? (
                  <div className="flex flex-col gap-2 pt-1">
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-center rounded-xl border px-4 py-3 text-sm font-bold transition-all"
                      style={{ borderColor: "var(--accent-border)", color: "var(--accent)", background: "var(--accent-pale)" }}
                    >
                      Log in Securely
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold text-white transition-all hover:opacity-90"
                      style={{
                        background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
                        boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
                      }}
                    >
                      Get Started Free
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
