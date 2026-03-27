"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { LogOut, User, ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";

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

const DEFAULT_TITLE = "Virtual Library";
const DEFAULT_TAGLINE = "The Focus Hub";

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();
  const { count: cartCount } = useCart();
  const isLoggedIn = !!session?.user;

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [siteTitle, setSiteTitle] = useState(DEFAULT_TITLE);
  const [tagline, setTagline] = useState(DEFAULT_TAGLINE);

  useEffect(() => {
    fetch("/api/site-branding")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: { logoUrl?: string | null; title?: string | null; tagline?: string | null }) => {
        if (d.logoUrl) setLogoUrl(d.logoUrl);
        if (d.title) setSiteTitle(d.title);
        if (d.tagline) setTagline(d.tagline);
      })
      .catch(() => {});
  }, []);

  /* Public marketing nav only — after all hooks (Rules of Hooks). */
  if (status === "authenticated" && session?.user) {
    return null;
  }

  const logoSrc = logoUrl && logoUrl.trim() ? logoUrl.trim() : "/logo.svg";
  const isExternalLogo = logoSrc.startsWith("http");

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[rgba(8,5,3,0.92)] backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-2xl shadow-md shadow-black/40">
            {isExternalLogo ? (
              <img src={logoSrc} alt={siteTitle} width={36} height={36} className="h-9 w-9 object-cover" />
            ) : (
              <Image src={logoSrc} alt={siteTitle} width={36} height={36} className="object-cover" priority />
            )}
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-wide text-[var(--cream)]">
              {siteTitle}
            </span>
            <span className="text-xs text-[var(--cream-muted)]">
              {tagline}
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          <div className="flex items-center gap-6 text-sm">
            {navLinks.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`transition ${
                    active
                      ? "text-[var(--cream)]"
                      : "text-[var(--cream-muted)] hover:text-[var(--cream)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/cart"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-[var(--cream)] transition hover:bg-white/5"
              aria-label="Cart"
            >
              <ShoppingCart className="h-4 w-4" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-[var(--ink)]">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
            {status === "loading" ? (
              <span className="inline-flex h-8 w-20 animate-pulse rounded-full bg-white/10" />
            ) : isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 text-[var(--cream)] transition hover:bg-white/15"
                  aria-label="Profile"
                >
                  {session.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt=""
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </Link>
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
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/10 px-4 py-1.5 text-xs font-medium text-[var(--cream)]/85 transition hover:bg-white/5"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-1.5 text-xs font-medium text-[var(--cream)]/85 transition hover:bg-white/5"
              >
                Log in
              </Link>
            )}
          </div>
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-3 md:hidden">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[var(--cream)] shadow-sm shadow-black/40"
            aria-label="Toggle navigation"
          >
            <span className="sr-only">Toggle navigation</span>
            <div className="space-y-1.5">
              <span className="block h-0.5 w-4 rounded bg-[var(--cream)]" />
              <span className="block h-0.5 w-4 rounded bg-[var(--cream)]" />
            </div>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-white/5 bg-[rgba(8,5,3,0.98)] backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 text-sm sm:px-6 lg:px-8">
            {navLinks.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-full px-3 py-2 transition ${
                    active
                      ? "bg-white/10 text-[var(--cream)]"
                      : "text-[var(--cream-muted)] hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/cart"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-full px-3 py-2 text-[var(--cream-muted)] hover:bg-white/5 hover:text-[var(--cream)]"
            >
              Cart
              {cartCount > 0 && (
                <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold text-[var(--ink)]">
                  {cartCount}
                </span>
              )}
            </Link>
            <div className="mt-2 flex items-center gap-2">
              {status === "loading" ? (
                <div className="h-9 flex-1 animate-pulse rounded-full bg-white/10" />
              ) : isLoggedIn ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 text-[var(--cream)]"
                    aria-label="Profile"
                  >
                    {session?.user?.image ? (
                      <Image
                        src={session.user.image}
                        alt=""
                        width={36}
                        height={36}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      setOpen(false);
                      try {
                        await fetch("/api/auth/record-logout", { method: "POST" });
                      } catch {
                        // ignore
                      }
                      signOut({ callbackUrl: "/" });
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/10 px-4 py-1.5 text-xs font-medium text-[var(--cream)]/85 hover:bg-white/5"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="inline-flex flex-1 items-center justify-center rounded-full border border-white/10 px-4 py-1.5 text-xs text-[var(--cream)]/85 hover:bg-white/5"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className="inline-flex flex-1 items-center justify-center rounded-full bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-[var(--ink)] shadow-md shadow-black/40 hover:bg-[var(--accent-hover)]"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

