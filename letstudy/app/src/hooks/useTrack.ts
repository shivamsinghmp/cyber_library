"use client";

import { useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

type TrackEvent =
  | "PAGE_VIEW" | "BUTTON_CLICK" | "FEATURE_USED" | "FORM_SUBMIT"
  | "ERROR" | "PAYMENT_INITIATED" | "PAYMENT_SUCCESS" | "PAYMENT_FAILED" | "CUSTOM";

type Meta = Record<string, unknown>;

function sendEvent(event: TrackEvent, page: string, meta?: Meta) {
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, page, meta }),
    keepalive: true, // works even when page unloads
  }).catch(() => {});
}

/** Auto-tracks page views. Returns a `track` fn for manual events. */
export function useTrack() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const lastPath = useRef<string | null>(null);

  // Auto page view on route change
  useEffect(() => {
    if (!session?.user) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    sendEvent("PAGE_VIEW", pathname);
  }, [pathname, session?.user]);

  const track = useCallback(
    (event: TrackEvent, meta?: Meta) => {
      if (!session?.user) return;
      sendEvent(event, pathname, meta);
    },
    [pathname, session?.user]
  );

  return { track };
}
