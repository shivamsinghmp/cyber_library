"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Calls track-visit API on route change so we can count page views and traffic. */
export function TrafficTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    fetch(`/api/track-visit?path=${encodeURIComponent(pathname)}`, { method: "GET", keepalive: true }).catch(() => {});
  }, [pathname]);

  return null;
}
