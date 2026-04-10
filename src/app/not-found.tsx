"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Home, LayoutDashboard, AlertOctagon } from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    // Prevent starting timer until session status is known
    if (status === "loading") return;

    if (countdown === 0) {
      if (status === "authenticated") {
        router.replace("/dashboard");
      } else {
        router.replace("/");
      }
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, status, router]);

  const destUrl = status === "authenticated" ? "/dashboard" : "/";
  const destName = status === "authenticated" ? "Dashboard" : "Home";

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="relative flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-black/40 px-8 py-16 shadow-2xl backdrop-blur-xl sm:px-16">
        
        {/* Glowing Background Effect */}
        <div className="absolute -top-10 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-[var(--accent)]/20 blur-3xl" />

        <AlertOctagon className="h-16 w-16 text-[var(--accent)] drop-shadow-md" strokeWidth={1.5} />
        
        <h1 className="mt-6 text-5xl font-bold tracking-tight text-[var(--cream)] md:text-6xl">
          404
        </h1>
        <h2 className="mt-2 text-xl font-medium text-[var(--cream-muted)]">
          Page Not Found
        </h2>

        <p className="mt-6 max-w-sm text-sm leading-relaxed text-[var(--cream-muted)]/80">
          We couldn&apos;t find the page you&apos;re looking for. It might have been moved or doesn&apos;t exist.
        </p>

        {status !== "loading" && (
          <div className="mt-8 flex flex-col items-center space-y-4">
            <div className="flex animate-pulse items-center space-x-2 text-sm font-semibold text-emerald-400">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              </span>
              <span>Redirecting to {destName} in {countdown}s...</span>
            </div>
            
            <Link
              href={destUrl}
              className="flex items-center gap-2 rounded-full bg-white/10 px-6 py-2.5 text-sm font-medium text-[var(--cream)] transition-all hover:bg-white/20 hover:text-white"
            >
              {status === "authenticated" ? (
                <LayoutDashboard className="h-4 w-4" />
              ) : (
                <Home className="h-4 w-4" />
              )}
              Go to {destName} Now
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
