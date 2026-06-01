"use client";

import { useTrack } from "@/hooks/useTrack";

/** Drop this anywhere inside a SessionProvider — auto-tracks page views. */
export function ActivityTracker() {
  useTrack(); // side-effect only — tracks every route change
  return null;
}
