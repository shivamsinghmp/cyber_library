"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";

export type SubscriptionStatus = {
  active: boolean;
  planType?: "MONTHLY" | "YEARLY" | "TRIAL";
  isTrial?: boolean;
  startDate?: string;
  endDate?: string;
  amountPaid?: number;
  trialUsed?: boolean;
};

export function useSubscription() {
  const { data: session, status: sessionStatus } = useSession();
  const [sub, setSub]     = useState<SubscriptionStatus>({ active: false });
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);
  const retryRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (!userId) {
      setSub({ active: false });
      setLoading(false);
      fetchedRef.current = false;
      return;
    }

    let cancelled = false;

    function doFetch() {
      setLoading(true);
      fetch("/api/subscription/status", { credentials: "include" })
        .then((r) => {
          // 5xx = server/DB hiccup — don't treat as "no subscription"
          if (r.status >= 500) throw new Error("server_error");
          return r.ok ? r.json() : Promise.reject(r.status);
        })
        .then((d: SubscriptionStatus) => {
          if (!cancelled) { setSub(d); fetchedRef.current = true; setLoading(false); }
        })
        .catch((err) => {
          if (cancelled) return;
          if (err instanceof Error && err.message === "server_error") {
            // Retry once after 3 s — keep previous state (active if already fetched once)
            retryRef.current = setTimeout(() => {
              if (!cancelled) doFetch();
            }, 3000);
            // Only show loading spinner, not locked screen
            if (!fetchedRef.current) setLoading(true);
            else setLoading(false); // Keep previous active state
          } else {
            // Auth / 4xx error — no subscription
            if (!fetchedRef.current) setSub({ active: false });
            setLoading(false);
          }
        });
    }

    doFetch();

    return () => {
      cancelled = true;
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [userId, sessionStatus]);

  return { ...sub, loading };
}
