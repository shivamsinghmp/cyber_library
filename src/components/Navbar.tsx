"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { LogOut, User, ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";

import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/study-room", label: "Study Room" },
  { href: "/store", label: "Store" },
  { href: "/mentorship", label: "Mentorship" },
  { href: "/mental-session", label: "Mental Session" },
  { href: "/blog", label: "Blog" },
  { href: "/rules", label: "Rules" },
  { href: "/about", label: "About" },
  { href: "/join", label: "Join now" },
  { href: "/#contact", label: "Contact" },
];

const DEFAULT_TITLE = "The Cyber Library";
const DEFAULT_TAGLINE = "The Focus Hub";

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();
  const { count: cartCount } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [hasAddonToken, setHasAddonToken] = useState(false);

  const isMeetAddonRoute = pathname.startsWith("/meet-addon");
  const isLoggedIn = !!session?.user || (isMeetAddonRoute && hasAddonToken);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteTitle, setSiteTitle] = useState(DEFAULT_TITLE);
  const [tagline, setTagline] = useState(DEFAULT_TAGLINE);

  useEffect(() => {
    // Check for Meet Addon Token (iframe bypass)
    if (typeof window !== "undefined") {
      setHasAddonToken(!!localStorage.getItem("vl_meet_addon_token"));
    }

    fetch("/api/site-branding")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: { logoUrl?: string | null; title?: string | null; tagline?: string | null }) => {
        if (d.logoUrl) setLogoUrl(d.logoUrl);
        if (d.title) setSiteTitle(d.title);
        if (d.tagline) setTagline(d.tagline);
      })
      .catch(() => { });

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isDashboardRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/staff') || pathname.startsWith('/affiliate') || pathname.startsWith('/author');

  if (isDashboardRoute) {
    return null;
  }

  let dashboardLink = "/dashboard";
  if (session?.user) {
    const role = (session.user as { role?: string }).role;
    if (role === "ADMIN") dashboardLink = "/admin";
    else if (role === "EMPLOYEE") dashboardLink = "/staff";
    else if (role === "INFLUENCER") dashboardLink = "/affiliate";
    else if (role === "AUTHOR") dashboardLink = "/author";
  }

  // If we are deep within the Meet Addon space, lock the dashboard link so it doesn't navigate away.
  if (pathname.startsWith("/meet-addon")) {
    dashboardLink = "/meet-addon/panel";
  }

  const logoSrc = logoUrl && logoUrl.trim() ? logoUrl.trim() : "/logo.png";
  const isExternalLogo = logoSrc.startsWith("http");

  return (
    <>
      <header className={`fixed inset-x-4 z-50 mx-auto max-w-6xl rounded-full transition-all duration-500 ease-out ${scrolled
          ? "top-4 md:top-6 border border-[var(--wood)]/20 bg-[var(--ink)]/80 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
          : "top-6 md:top-8 border-transparent bg-transparent"
        }`}>
        <nav className="flex items-center justify-between px-5 py-3.5 sm:px-8">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-4 group">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl shadow-[0_4px_16px_rgba(139,115,85,0.2)] transition-transform group-hover:scale-105 border border-[var(--wood)]/10">
              {isExternalLogo ? (
                <img src={logoSrc} alt={siteTitle} width={44} height={44} className="h-full w-full object-cover" />
              ) : (
                <Image src={logoSrc} alt={siteTitle} width={44} height={44} className="object-cover" priority />
              )}
            </div>
            <div className="flex flex-col leading-tight hidden sm:flex">
              <span className="text-[15px] font-extrabold tracking-tight text-[var(--cream)] group-hover:text-[var(--accent)] transition-colors">
                {siteTitle}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-[0.25em] text-[var(--wood)]">
                {tagline}
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-8 md:flex">
            <div className="flex items-center gap-7 text-[13px] font-bold tracking-wide">
              {navLinks.slice(0, 6).map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`transition-colors ${active ? "text-[var(--accent)] drop-shadow-[0_0_8px_rgba(139,115,85,0.4)]" : "text-[var(--cream-muted)] hover:text-[var(--cream)]"
                      }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="h-8 w-px bg-[var(--wood)]/20" />
            <div className="flex items-center gap-5">
              <Link
                href="/cart"
                className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[var(--wood)]/20 bg-[var(--ink)]/50 text-[var(--cream)] transition hover:bg-[var(--ink)] hover:border-[var(--accent)]/40 hover:-translate-y-0.5"
                aria-label="Cart"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-bold text-[var(--ink)] shadow-[0_2px_8px_rgba(139,115,85,0.4)]">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>
              {status === "loading" ? (
                <span className="inline-flex h-11 w-28 animate-pulse rounded-full bg-[var(--wood)]/10" />
              ) : isLoggedIn ? (
                <>
                  <Link
                    href={dashboardLink}
                    className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)] transition hover:bg-[var(--accent)]/20 shadow-inner"
                  >
                    {session?.user?.image ? (
                      <Image src={session.user.image as string} alt="" width={44} height={44} className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      try { await fetch("/api/auth/record-logout", { method: "POST" }); } catch { }
                      localStorage.removeItem("vl_meet_addon_token");
                      if (hasAddonToken) window.location.reload();
                      signOut({ callbackUrl: "/" });
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--wood)]/20 px-6 py-2.5 text-xs font-bold tracking-wide text-[var(--wood)] transition hover:bg-[var(--ink)]/60 hover:text-[var(--cream)]"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </>
              ) : !isMeetAddonRoute ? (
                <div className="flex gap-3">
                  <Link href="/login" className="inline-flex items-center justify-center rounded-full border border-[var(--wood)]/30 px-6 py-2.5 text-xs font-bold tracking-wide text-[var(--cream)] transition hover:bg-[var(--ink)]/80 hover:border-[var(--accent)] hover:shadow-[0_0_15px_rgba(154,130,100,0.2)]">
                    Log in
                  </Link>
                  <Link href="/signup" className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-7 py-2.5 text-xs font-extrabold tracking-wide text-[var(--ink)] shadow-[0_4px_16px_rgba(154,130,100,0.3)] transition hover:bg-[var(--accent-hover)] hover:scale-105 hover:shadow-[0_8px_25px_rgba(154,130,100,0.5)]">
                    Request Access
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-4 md:hidden">
            <Link href="/cart" className="relative text-[var(--cream)] hover:text-[var(--accent)] transition">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-bold text-[var(--ink)]">
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--wood)]/20 bg-[var(--ink)]/50 text-[var(--cream)] transition active:scale-95"
            >
              <div className="space-y-1.5">
                <span className={`block h-[2px] w-5 transform rounded bg-[var(--cream)] transition ${open ? "rotate-45 translate-y-2" : ""}`} />
                <span className={`block h-[2px] w-5 rounded bg-[var(--cream)] transition ${open ? "opacity-0" : ""}`} />
                <span className={`block h-[2px] w-5 transform rounded bg-[var(--cream)] transition ${open ? "-rotate-45 -translate-y-2" : ""}`} />
              </div>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu (Framer Motion) */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-4 top-28 z-40 md:hidden overflow-hidden rounded-[2.5rem] border border-[var(--wood)]/20 bg-[var(--background)]/95 backdrop-blur-3xl shadow-[0_20px_60px_rgba(15,11,7,0.9)] p-6"
          >
            <div className="flex flex-col gap-3">
              {navLinks.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`rounded-2xl px-6 py-4 text-sm font-bold tracking-wide transition ${active ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--cream-muted)] hover:bg-[var(--ink)] hover:text-[var(--cream)]"
                      }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <div className="my-3 h-px bg-[var(--wood)]/10" />
              {isLoggedIn ? (
                <>
                  <Link href={dashboardLink} onClick={() => setOpen(false)} className="rounded-2xl border border-[var(--wood)]/20 bg-[var(--ink)]/50 px-6 py-4 text-sm font-bold tracking-wide text-[var(--cream)] text-center">
                    Dashboard
                  </Link>
                  <button onClick={() => {
                    setOpen(false);
                    localStorage.removeItem("vl_meet_addon_token");
                    if (hasAddonToken) window.location.reload();
                    signOut({ callbackUrl: "/" });
                  }} className="rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm font-bold tracking-wide text-red-400 text-center">
                    Logout Immediately
                  </button>
                </>
              ) : !isMeetAddonRoute ? (
                <div className="flex flex-col gap-3">
                  <Link href="/login" onClick={() => setOpen(false)} className="rounded-2xl border border-[var(--wood)]/20 bg-[var(--ink)]/50 px-6 py-4 text-center text-sm font-bold tracking-wide text-[var(--cream)]">
                    Log in Securely
                  </Link>
                  <Link href="/signup" onClick={() => setOpen(false)} className="rounded-2xl bg-[var(--accent)] px-6 py-4 text-center text-sm font-extrabold tracking-wide text-[var(--ink)] shadow-[0_4px_16px_rgba(139,115,85,0.4)]">
                    Request Access
                  </Link>
                </div>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
