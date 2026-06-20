"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Calls track-visit API on route change — records pageview, device, geo, referrer, and UTM params. */
export function TrafficTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;

    const params = new URLSearchParams({ path: pathname });

    const utmSource = searchParams.get("utm_source");
    const utmMedium = searchParams.get("utm_medium");
    const utmCampaign = searchParams.get("utm_campaign");

    if (utmSource) params.set("utm_source", utmSource);
    if (utmMedium) params.set("utm_medium", utmMedium);
    if (utmCampaign) params.set("utm_campaign", utmCampaign);

    fetch(`/api/track-visit?${params.toString()}`, { method: "GET", keepalive: true }).catch(() => {});
  }, [pathname, searchParams]);

  return null;
}
