"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export type SubscriptionStatus = {
  active: boolean;
  planType?: "MONTHLY" | "YEARLY";
  startDate?: string;
  endDate?: string;
  amountPaid?: number;
};

export function useSubscription() {
  const { data: session, status: sessionStatus } = useSession();
  const [sub, setSub] = useState<SubscriptionStatus>({ active: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session?.user) { setSub({ active: false }); setLoading(false); return; }

    fetch("/api/subscription/status", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setSub(d))
      .catch(() => setSub({ active: false }))
      .finally(() => setLoading(false));
  }, [session, sessionStatus]);

  return { ...sub, loading };
}
