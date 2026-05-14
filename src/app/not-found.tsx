"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Home, LayoutDashboard, Search } from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (status === "loading") return;
    if (countdown === 0) {
      router.replace(status === "authenticated" ? "/dashboard" : "/");
      return;
    }
    const t = setInterval(() => setCountdown(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [countdown, status, router]);

  const destUrl = status === "authenticated" ? "/dashboard" : "/";
  const destName = status === "authenticated" ? "Dashboard" : "Home";

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 bg-[var(--page-bg)]">
      <div className="w-full max-w-md text-center">

        {/* Illustration */}
        <div className="relative flex h-32 w-32 items-center justify-center mx-auto mb-8">
          <div className="absolute inset-0 rounded-full bg-[var(--cream)] border border-[var(--cream-muted)]" />
          <div className="absolute inset-4 rounded-full bg-gradient-to-br from-[var(--accent)]/20 to-[var(--cream-muted)]" />
          <Search className="relative z-10 h-12 w-12 text-[var(--accent)]" strokeWidth={1.5} />
        </div>

        <p className="section-eyebrow mb-2">404 — Not Found</p>
        <h1 className="text-4xl font-black text-[var(--foreground)] mb-3 md:text-5xl">
          Page Missing
        </h1>
        <p className="text-base text-[var(--muted-text)] leading-relaxed mb-8 max-w-sm mx-auto">
          We couldn&apos;t find what you were looking for. It may have been moved or doesn&apos;t exist.
        </p>

        <div className="card p-5 mb-6 text-left">
          {status !== "loading" && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--body-text)]">
                  Redirecting to {destName}
                </p>
                <p className="text-xs text-[var(--muted-text)] mt-0.5">in {countdown} seconds...</p>
              </div>
              <div className="relative h-10 w-10">
                <svg className="h-10 w-10 -rotate-90" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="var(--cream-muted)" strokeWidth="3" />
                  <circle cx="20" cy="20" r="16" fill="none" stroke="var(--accent)" strokeWidth="3"
                    strokeDasharray={2 * Math.PI * 16}
                    strokeDashoffset={2 * Math.PI * 16 * (1 - countdown / 5)}
                    strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-black text-[var(--accent)]">
                  {countdown}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-center">
          <Link href="/" className="btn-ghost">
            <Home className="h-4 w-4" /> Home
          </Link>
          {status === "authenticated" && (
            <Link href="/dashboard" className="btn-primary">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
