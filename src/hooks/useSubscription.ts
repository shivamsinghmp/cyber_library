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

  // Use stable deps: userId + sessionStatus — avoids re-fetch on every NextAuth token refresh
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

  useEffect(() => {
    if (sessionStatus === "loading") return;

    if (!userId) {
      setSub({ active: false });
      setLoading(false);
      fetchedRef.current = false;
      return;
    }

    setLoading(true);
    let cancelled = false;

    fetch("/api/subscription/status", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: SubscriptionStatus) => {
        if (!cancelled) { setSub(d); fetchedRef.current = true; }
      })
      .catch(() => {
        // On network error keep previous active state — don't flash locked screen
        if (!cancelled && !fetchedRef.current) setSub({ active: false });
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [userId, sessionStatus]);

  return { ...sub, loading };
}
